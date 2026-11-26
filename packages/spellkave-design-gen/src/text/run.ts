import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ProseEntry, ProseManifest } from "./manifest.ts";
import { renderPrompt } from "./prompts.ts";
import type { TextProvider } from "./provider.ts";
import { scoreProse } from "./score.ts";

export interface ProsePlan {
	kind: "prose_plan";
	paid_call: false;
	via: string;
	confirmation_required: "--confirm-paid";
	output_dir: string;
	cells: Array<{ id: string; prompt_id: string; model: string }>;
}

/**
 * `model` is present only when a provider call actually happened — an
 * agent-session `ingest` cell never sets it (§"no model claim it didn't
 * make"). `provider` and `author` name who wrote the text; `prompt_hash`
 * pins the exact rendered system+user prompt the text was written against,
 * so a later template edit is detectable as drift.
 */
export interface ProseCell {
	id: string;
	prompt_id: string;
	model?: string;
	text: string;
	usage: { input?: number; output?: number; cost?: number };
	hygiene: ReturnType<typeof scoreProse>;
	error?: string;
	provider?: string;
	author?: string;
	prompt_hash?: string;
}

export interface ProsePromptCell {
	id: string;
	prompt_id: string;
	model: string;
	system: string;
	user: string;
	identity: { display_name: string; core_traits: Record<string, string> };
}

export interface ProseRun {
	schema: "spellkave-compendium-prose-run/v1";
	via: string;
	generated_at: string;
	cells: ProseCell[];
}

/** The single render call `generate`, `prompt`, and `ingest` all share, so the
 * three verbs can never drift into rendering different text for the same
 * entry. */
function renderEntryPrompt(entry: ProseEntry): { system: string; user: string } {
	return renderPrompt(entry.prompt_id, {
		display_name: entry.display_name,
		core_traits: entry.core_traits,
	});
}

/** sha256 of the exact rendered system+user prompt, so a later template or
 * manifest edit is detectable against a previously ingested candidate. */
function hashPrompt(prompt: { system: string; user: string }): string {
	return `sha256:${createHash("sha256").update(`${prompt.system}\n---\n${prompt.user}`).digest("hex")}`;
}

/** Free, no network: the exact prompt(s) `generate` would send. */
export function promptProse(manifest: ProseManifest): ProsePromptCell[] {
	return manifest.entries.map((entry) => {
		const prompt = renderEntryPrompt(entry);
		return {
			id: entry.id,
			prompt_id: entry.prompt_id,
			model: entry.model,
			system: prompt.system,
			user: prompt.user,
			identity: { display_name: entry.display_name, core_traits: entry.core_traits },
		};
	});
}

export function planProse(manifest: ProseManifest, via: string): ProsePlan {
	return {
		kind: "prose_plan",
		paid_call: false,
		via,
		confirmation_required: "--confirm-paid",
		output_dir: manifest.output_dir,
		cells: manifest.entries.map((entry) => ({
			id: entry.id,
			prompt_id: entry.prompt_id,
			model: entry.model,
		})),
	};
}

async function persistRun(dir: string, run: ProseRun): Promise<void> {
	await mkdir(dir, { recursive: true });
	await writeFile(join(dir, "run.json"), `${JSON.stringify(run, null, 2)}\n`);
}

function completedCells(run: ProseRun | null): Map<string, ProseCell> {
	const map = new Map<string, ProseCell>();
	if (run === null) return map;
	for (const cell of run.cells) {
		if (!cell.error && cell.hygiene.pass) map.set(cell.id, cell);
	}
	return map;
}

export async function generateProse(
	manifest: ProseManifest,
	provider: TextProvider,
	opts: { now?: Date; outputRoot: string },
): Promise<ProseRun> {
	const dir = join(opts.outputRoot, manifest.output_dir);
	let prior: ProseRun | null = null;
	try {
		prior = JSON.parse(await readFile(join(dir, "run.json"), "utf8")) as ProseRun;
	} catch {
		prior = null;
	}
	const done = completedCells(prior);
	const cells: ProseCell[] = [];
	const run: ProseRun = {
		schema: "spellkave-compendium-prose-run/v1",
		via: provider.id,
		generated_at: (opts.now ?? new Date()).toISOString(),
		cells,
	};
	for (const entry of manifest.entries) {
		const cached = done.get(entry.id);
		if (cached !== undefined) {
			cells.push(cached);
			continue;
		}
		const prompt = renderEntryPrompt(entry);
		try {
			const result = await provider.generate({
				system: prompt.system,
				user: prompt.user,
				modelRef: entry.model,
			});
			cells.push({
				id: entry.id,
				prompt_id: entry.prompt_id,
				model: result.model,
				text: result.text,
				usage: result.usage,
				hygiene: scoreProse(result.text, entry),
				provider: provider.id,
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			cells.push({
				id: entry.id,
				prompt_id: entry.prompt_id,
				model: entry.model,
				text: "",
				usage: {},
				provider: provider.id,
				hygiene: { pass: false, missing: entry.must_include, leaked: [] },
				error: message,
			});
		}
		await persistRun(dir, run);
	}
	await persistRun(dir, run);
	return run;
}

export interface ProseIngestInput {
	entryId: string;
	text: string;
	author: string;
	provider?: string;
}

/**
 * Writes a hand-written (e.g. agent-session) candidate to the exact same
 * `run.json` `generate` writes, running the same hygiene scoring, so a
 * downstream `flavor-ingest`-style consumer can pick it up unchanged. Never
 * claims a `model`: only `generate`'s own provider call may set that field.
 */
export async function ingestProse(
	manifest: ProseManifest,
	input: ProseIngestInput,
	opts: { now?: Date; outputRoot: string },
): Promise<ProseRun> {
	const entry = manifest.entries.find((candidate) => candidate.id === input.entryId);
	if (!entry) throw new Error(`no entry ${input.entryId} in manifest`);
	const dir = join(opts.outputRoot, manifest.output_dir);
	let prior: ProseRun | null = null;
	try {
		prior = JSON.parse(await readFile(join(dir, "run.json"), "utf8")) as ProseRun;
	} catch {
		prior = null;
	}
	const byId = new Map<string, ProseCell>();
	if (prior) for (const cell of prior.cells) byId.set(cell.id, cell);

	const text = input.text.trim();
	byId.set(entry.id, {
		id: entry.id,
		prompt_id: entry.prompt_id,
		text,
		usage: {},
		hygiene: scoreProse(text, entry),
		provider: input.provider ?? "agent-session",
		author: input.author,
		prompt_hash: hashPrompt(renderEntryPrompt(entry)),
	});

	const cells = manifest.entries
		.map((manifestEntry) => byId.get(manifestEntry.id))
		.filter((cell): cell is ProseCell => cell !== undefined);
	const providers = new Set(cells.map((cell) => cell.provider ?? "pi-ai"));
	const via = providers.size === 1 ? [...providers][0] : "mixed";
	const run: ProseRun = {
		schema: "spellkave-compendium-prose-run/v1",
		via,
		generated_at: (opts.now ?? new Date()).toISOString(),
		cells,
	};
	await persistRun(dir, run);
	return run;
}
