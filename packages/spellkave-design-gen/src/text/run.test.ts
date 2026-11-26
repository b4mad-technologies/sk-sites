// A coding agent that runs `skgen prose prompt` relies on getting the exact
// prompt a paid `generate` would send. The behaviour suite cannot see what
// generate hands a provider, so this file spies on it. Other prose promises
// are scenarios in behaviour/prose.feature and behaviour/agent-session.feature.
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ProseManifest } from "./manifest.ts";
import { generateProse, promptProse } from "./run.ts";

const MANIFEST: ProseManifest = {
	schema: "spellkave-prose-manifest/v1",
	output_dir: "out",
	entries: [
		{
			id: "gear/backpack",
			display_name: "Backpack",
			prompt_id: "flavor-gear",
			model: "openai/gpt-4o-mini",
			core_traits: { srd_text: "A backpack holds up to 30 pounds." },
			must_include: ["backpack"],
			must_not: ["Source:"],
		},
	],
};

describe("promptProse", () => {
	// keep(K2): only an injected spy provider sees the prompt generate sends
	it("is byte-identical to the system/user pair generate sends the provider", async () => {
		let seen: { system: string; user: string } | undefined;
		const provider = {
			id: "spy",
			async generate(input: { system: string; user: string; modelRef: string }) {
				seen = { system: input.system, user: input.user };
				return { text: "backpack prose", model: input.modelRef, usage: {} };
			},
		};
		const cwd = await mkdtemp(join(tmpdir(), "skgen-run-"));
		await generateProse(MANIFEST, provider, { outputRoot: cwd });
		const prompts = promptProse(MANIFEST);
		expect(seen).toEqual({ system: prompts[0]?.system, user: prompts[0]?.user });
	});
});
