// What skgen's behaviour suite tells the document generators of
// @spellkave/behaviour. The README stays hand-written (it explains the layer
// choices, the agent-session provenance contract and the legacy shims); the
// guide and the evidence are generated under docs/. The command table is
// read from `skgen --help`, the usage text skgen prints from src/cli.ts, so
// this file (which the suite's globalSetup loads) imports nothing from src/
// (ADR-0156 D-4).
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

import { defineDocs } from "@spellkave/behaviour/docs";

const SKGEN = resolve(import.meta.dirname, "../../../bin/skgen");

/** One line per verb for the guide's table; the verbs themselves come from `skgen --help`. */
const WHAT: Record<string, string> = {
	"prose plan": "Free: lists each entry with its prompt and model.",
	"prose generate":
		"Paid with --confirm-paid: writes each candidate and its hygiene to run.json; a plan without it.",
	"prose prompt": "Free, no provider: prints the exact system and user prompt generate would send.",
	"prose ingest":
		"Free: records hand-written text as an agent-session cell in run.json, same hygiene gate.",
	"prose score": "Free: checks a text for required facts and leaked vocabulary.",
	"image plan": "Free: previews provider route and usage for each art-manifest entry.",
	"image generate": "Paid, needs --confirm-paid: generates, converts and ingests each entry.",
	"image batch":
		"Plans without --confirm-paid, generates with it; --compose-only composes overlays locally.",
	"image pixellab":
		"PixelLab blueprint workflows: plan, plan-ui, audit-entity-art and generate-pilot plan for free.",
	"image openai-image":
		"OpenAI Image blueprint workflow: plan is free, generate needs --confirm-paid.",
};

function helpCommands(): { usage: string; what: string }[] {
	const help = spawnSync(SKGEN, ["--help"], { encoding: "utf8" });
	if (help.status !== 0) throw new Error(`skgen --help exited ${help.status}: ${help.stderr}`);
	return help.stdout
		.split("\n")
		.map((line) => line.replace(/^usage:/, "").trim())
		.filter((line) => line.startsWith("skgen "))
		.map((usage) => ({ usage, what: WHAT[usage.split(" ").slice(1, 3).join(" ")] ?? "" }));
}

export default defineDocs({
	readme: false,
	binary: "skgen",
	tagline:
		"Design-time prose and catalog image generation: plans are free, paid calls need --confirm-paid, and every candidate is scored and recorded.",
	commands: helpCommands,
	commandsNote:
		"Exit codes: `0` ok, `1` a mistake in the command, a refused paid call or a provider failure, `2` a prose candidate that failed the manifest's hygiene gate.",
	verbOf: (command) => command.match(/^skgen ((?:prose|image) [a-z-]+)/)?.[1] ?? command,
	features: ["contract.feature", "prose.feature", "agent-session.feature", "image.feature"],
	design: ["src/cli.ts", "src/text/run.ts"],
	suite: [
		"vitest.behaviour.config.ts",
		"behaviour/steps.ts",
		"behaviour/support/workspace.ts",
		"behaviour/support/setup.ts",
	],
	watched: ["packages/spellkave-design-gen", "packages/spellkave-behaviour", "bin/skgen"],
});
