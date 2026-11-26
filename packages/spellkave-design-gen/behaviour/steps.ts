// The sentences of behaviour/*.feature, against skgen bundled once by
// support/setup.ts (plain node, no tsx start per run). A scenario tagged
// @launcher runs the real `bin/skgen` front door instead, so the bash and tsx
// launcher stays covered. Nothing under src/ is imported: skgen is a black
// box that gets argv and an environment, and answers with stdout, stderr, an
// exit code and the files it writes.
//
// Each scenario gets its own temp workspace (support/workspace.ts) as the
// working directory and as HOME, so pi-ai's ~/.pi/agent/auth.json and any
// real credential stay out of reach. skgen starts with PATH alone: no
// PIXELLAB_SECRET, no OPENAI_API_KEY. A verb that reached for a paid provider
// would fail, not spend; `--provider fake` is skgen's own offline provider.

import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";

import { argvOf, cliRunner, type Run, records } from "@spellkave/behaviour/cli";
import { Given, type NarratedWorld, Then, When } from "@spellkave/behaviour/narrate";
import { contractSteps } from "@spellkave/behaviour/steps";
import { After, Before } from "quickpickle";
import { expect } from "vitest";

import {
	barbarianManifest,
	gearManifest,
	imageWorkspace,
	singleEntryManifest,
} from "./support/workspace.ts";

const PKG = resolve(import.meta.dirname, "..");
const REPO = resolve(PKG, "../..");
const LAUNCHER = join(REPO, "bin/skgen");
const START = join(PKG, "behaviour/.bin/skgen-start.mjs");
if (!existsSync(START)) {
	throw new Error(
		`no skgen bundle at ${START}: run the suite through its globalSetup (pnpm run test:behaviour)`,
	);
}

/** The reply of `--provider fake` (createDefaultDeps in src/cli.ts). */
const FAKE_REPLY =
	"Primary Ability: Strength. Hit Point Die: D12 per Barbarian level. Saving Throw Proficiencies: Strength and Constitution. Greataxe.";

/** Every verb `skgen --help` must name. */
const VERBS = [
	"skgen prose plan",
	"skgen prose generate",
	"skgen prose prompt",
	"skgen prose ingest",
	"skgen prose score",
	"skgen image plan",
	"skgen image generate",
	"skgen image batch",
	"skgen image pixellab",
	"skgen image openai-image",
];

type World = NarratedWorld & {
	root: string;
	/** The workspace's files and sizes just before the scenario's When. */
	before?: Map<string, number>;
	run?: Run;
};

interface ProseCell {
	id: string;
	provider?: string;
	author?: string;
	model?: string;
	text: string;
	prompt_hash?: string;
	hygiene: { pass: boolean; missing: string[]; leaked: string[] };
}

interface ProseRun {
	via: string;
	cells: ProseCell[];
}

interface PromptCell {
	id: string;
	prompt_id: string;
	model: string;
	system: string;
	user: string;
	identity: { display_name: string; core_traits: Record<string, string> };
}

function ran(world: World): Run {
	if (!world.run) throw new Error("no skgen run yet: this step needs a preceding When");
	return world.run;
}

/**
 * In the bundle, a dependency's `require("punycode")` resolves to node's
 * deprecated built-in instead of the npm package the tsx start finds, and node
 * warns on stderr. The real launcher never prints that warning, so the bundle
 * runs with it off.
 */
const BUNDLE_ENV = { NODE_OPTIONS: "--disable-warning=DEP0040" };

const skgen = (world: World) =>
	cliRunner({
		name: "skgen",
		...(world.info.tags.includes("@launcher") ? { bin: LAUNCHER } : { bin: START, node: true }),
		cwd: world.root,
		baseEnv: {
			PATH: process.env.PATH ?? "/usr/bin:/bin",
			HOME: world.root,
			...(world.info.tags.includes("@launcher") ? {} : BUNDLE_ENV),
		},
		redactions: [
			[world.root, "<workspace>"],
			[REPO, "<repo>"],
		],
	});

/** Every file under the workspace with its size: what "unchanged" compares. */
function files(root: string): Map<string, number> {
	const out = new Map<string, number>();
	const walk = (dir: string) => {
		for (const name of readdirSync(dir)) {
			const path = join(dir, name);
			if (statSync(path).isDirectory()) walk(path);
			else out.set(relative(root, path), statSync(path).size);
		}
	};
	walk(root);
	return out;
}

const json = <T>(world: World, path: string): T =>
	JSON.parse(readFileSync(join(world.root, path), "utf8")) as T;

function cell(world: World, id: string, path: string): ProseCell {
	const found = json<ProseRun>(world, path).cells.find((c) => c.id === id);
	if (!found) throw new Error(`${path} has no cell ${id}`);
	return found;
}

const prompts = (world: World) => JSON.parse(ran(world).stdout) as PromptCell[];

function prompt(world: World, id: string): PromptCell {
	const found = prompts(world).find((p) => p.id === id);
	if (!found) throw new Error(`no prompt for ${id}`);
	return found;
}

/** `a; b` in a table cell: several phrases that must all appear. */
const phrases = (list: string) => list.split(";").map((p) => p.trim());

Before(async (world: World) => {
	world.root = mkdtempSync(join(tmpdir(), "skgen-behaviour-"));
});

After(async (world: World) => {
	if (world.root) rmSync(world.root, { recursive: true, force: true });
});

// ---- Given: the workspace skgen runs in ----------------------------------------

Given("the committed Barbarian prose manifest", (world: World) => {
	barbarianManifest(world.root);
});

Given("a prose manifest with the backpack and the chest", (world: World) => {
	gearManifest(world.root);
});

Given(
	"a prose manifest with one {string} entry named {string} with the facts {}",
	(world: World, promptId: string, name: string, facts: string) => {
		singleEntryManifest(world.root, promptId, name, JSON.parse(facts));
	},
);

Given("an image workspace with an art manifest and provider blueprints", (world: World) => {
	imageWorkspace(world.root);
});

Given(
	"the chest was generated by the fake provider into {string}",
	async (world: World, path: string) => {
		const tool = skgen(world);
		const run = await tool.runAsync(
			argvOf("prose generate prose.json --confirm-paid --provider fake --only gear/chest", "skgen"),
		);
		await tool.attach(run, "setup");
		expect(existsSync(join(world.root, path)), `${run.stdout}\n${run.stderr}`).toBe(true);
	},
);

// ---- When: one skgen run ---------------------------------------------------------

When("I run {string}", async (world: World, command: string) => {
	world.before = files(world.root);
	const tool = skgen(world);
	world.run = await tool.runAsync(argvOf(command, "skgen"));
	await tool.attach(world.run);
});

// ---- Then: what skgen said ---------------------------------------------------------

contractSteps<World>({ tool: "skgen", lastRun: ran });

Then("stdout is empty", (world: World) => {
	expect(ran(world).stdout).toBe("");
});

Then("stderr is empty", (world: World) => {
	expect(ran(world).stderr).toBe("");
});

Then("stderr says {string}", (world: World, text: string) => {
	expect(ran(world).stderr).toContain(text);
});

Then("stdout is:", (world: World, text: string) => {
	expect(ran(world).stdout.trimEnd()).toBe(String(text).trimEnd());
});

Then("stdout is the JSON {}", (world: World, body: string) => {
	expect(JSON.parse(ran(world).stdout)).toEqual(JSON.parse(body));
});

Then("stdout lists every skgen verb", (world: World) => {
	for (const verb of VERBS) expect(ran(world).stdout).toContain(verb);
});

Then("the workspace is unchanged", (world: World) => {
	expect(files(world.root)).toEqual(world.before);
});

Then("no image file was written", (world: World) => {
	const images = [...files(world.root).keys()].filter((p) => /\.(png|webp|jpe?g)$/.test(p));
	expect(images).toEqual([]);
});

// ---- Then: prose plans, runs and cells -------------------------------------------

Then(
	"stdout is a prose plan with no paid call for {string} with prompt {string} and model {string}",
	(world: World, id: string, promptId: string, model: string) => {
		expect(JSON.parse(ran(world).stdout)).toMatchObject({
			kind: "prose_plan",
			paid_call: false,
			confirmation_required: "--confirm-paid",
			cells: [{ id, prompt_id: promptId, model }],
		});
	},
);

Then("{string} holds {int} cell(s)", (world: World, path: string, count: number) => {
	expect(json<ProseRun>(world, path).cells).toHaveLength(count);
});

Then(
	"{string} says via {string} and holds {int} cell(s)",
	(world: World, path: string, via: string, count: number) => {
		const run = json<ProseRun>(world, path);
		expect(run.via).toBe(via);
		expect(run.cells).toHaveLength(count);
	},
);

Then("stdout is the run.json that {string} holds", (world: World, path: string) => {
	expect(JSON.parse(ran(world).stdout)).toEqual(json(world, path));
});

Then(
	"the cell {string} in {string} has provider {string}, passes hygiene and says {string}",
	(world: World, id: string, path: string, provider: string, text: string) => {
		const c = cell(world, id, path);
		expect(c.provider).toBe(provider);
		expect(c.hygiene.pass).toBe(true);
		expect(c.text).toContain(text);
	},
);

Then(
	"the cell {string} in {string} fails hygiene, missing {string}",
	(world: World, id: string, path: string, fact: string) => {
		const { hygiene } = cell(world, id, path);
		expect(hygiene.pass).toBe(false);
		expect(hygiene.missing).toEqual([fact]);
	},
);

Then(
	"the cell {string} in {string} is {string} by {string} with no model and a sha256 prompt hash",
	(world: World, id: string, path: string, text: string, author: string) => {
		const c = cell(world, id, path);
		expect(c.text).toBe(text);
		expect(c.provider).toBe("agent-session");
		expect(c.author).toBe(author);
		expect(c).not.toHaveProperty("model");
		expect(c.prompt_hash).toMatch(/^sha256:[0-9a-f]{64}$/);
	},
);

Then("the cell {string} in {string} passes hygiene", (world: World, id: string, path: string) => {
	expect(cell(world, id, path).hygiene.pass).toBe(true);
});

Then(
	"the cell {string} in {string} has provider {string}",
	(world: World, id: string, path: string, provider: string) => {
		expect(cell(world, id, path).provider).toBe(provider);
	},
);

Then(
	"the cell {string} in {string} still holds the fake provider's text",
	(world: World, id: string, path: string) => {
		const c = cell(world, id, path);
		expect(c.provider).toBe("fake");
		expect(c.text).toBe(FAKE_REPLY);
	},
);

// ---- Then: rendered prompts --------------------------------------------------------

Then("stdout lists the prompts of {string}", (world: World, id: string) => {
	expect(prompts(world).map((p) => p.id)).toEqual([id]);
});

Then("stdout lists the prompts of {string} and {string}", (world: World, a: string, b: string) => {
	expect(prompts(world).map((p) => p.id)).toEqual([a, b]);
});

Then(
	"the prompt of {string} uses {string} on {string} and its user prompt says {string}",
	(world: World, id: string, promptId: string, model: string, text: string) => {
		const p = prompt(world, id);
		expect(p.prompt_id).toBe(promptId);
		expect(p.model).toBe(model);
		expect(p.user).toContain(text);
	},
);

Then(
	"the prompt of {string} carries its identity: display name {string} and srd_text {string}",
	(world: World, id: string, name: string, srdText: string) => {
		expect(prompt(world, id).identity).toEqual({
			display_name: name,
			core_traits: { srd_text: srdText },
		});
	},
);

Then("its user prompt says {string}", (world: World, list: string) => {
	const [only] = prompts(world);
	for (const phrase of phrases(list)) expect(only?.user).toContain(phrase);
});

Then("its system prompt says {string}", (world: World, list: string) => {
	const [only] = prompts(world);
	for (const phrase of phrases(list)) expect(only?.system).toContain(phrase);
});

// ---- Then: image plans -------------------------------------------------------------

/** `a, b` in a table cell: entry ids in manifest order. */
const ids = (list: string) => list.split(",").map((id) => id.trim());

Then(
	"the last record is an art batch result with no paid call and exactly {string} planned",
	(world: World, list: string) => {
		expect(records(ran(world)).at(-1)).toEqual(
			expect.objectContaining({
				kind: "art_batch_result",
				paid_call: false,
				entries: ids(list).map((id) => ({ id, status: "planned" })),
			}),
		);
	},
);

Then(
	"a cost preview names route {string} for each of {string}",
	(world: World, route: string, list: string) => {
		for (const id of ids(list)) {
			expect(records(ran(world))).toContainEqual(
				expect.objectContaining({ kind: "cost_preview", paid_call: false, route, entry_id: id }),
			);
		}
	},
);

Then(
	"its plan makes no paid call, asks for --confirm-paid and says {}",
	(world: World, fields: string) => {
		const plan = records(ran(world)).find((r) => "paid_call" in r);
		expect(plan).toMatchObject({
			paid_call: false,
			confirmation_required: "--confirm-paid",
			...JSON.parse(fields),
		});
	},
);
