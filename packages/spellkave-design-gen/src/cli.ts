/**
 * `skgen` — design-time generation. Phase 1: prose only.
 * Plan is free. Generate needs --confirm-paid. Tests inject a fake provider.
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { runArtBatchCli } from "./image/art-batch-cli.ts";
import { main as runOpenAiImageCli } from "./image/openai-image-cli.ts";
import { main as runPixelLabCli } from "./image/pixellab-cli.ts";
import { parseProseManifest } from "./text/manifest.ts";
import {
	createFakeTextProvider,
	createPiTextProvider,
	type TextProvider,
} from "./text/provider.ts";
import { generateProse, ingestProse, planProse, promptProse } from "./text/run.ts";
import { scoreProse } from "./text/score.ts";

export const EXIT_OK = 0;
export const EXIT_INFRA = 1;
export const EXIT_HYGIENE = 2;

export interface SkgenDeps {
	cwd: string;
	stdout: (line: string) => void;
	stderr: (line: string) => void;
	readFile: (path: string) => Promise<string>;
	createProvider: (kind: "pi-ai" | "fake") => Promise<TextProvider>;
	runImageBatch: (args: string[]) => Promise<number>;
}

const USAGE = `usage: skgen prose plan <manifest>
       skgen prose generate <manifest> --confirm-paid [--provider pi-ai|fake] [--only <id>] [--format json|text]
       skgen prose prompt <manifest> [--only <id>] [--format json|text]
       skgen prose ingest <manifest> --only <id> --text-file <path> --author <text> [--provider <name>]
       skgen prose score --text <string> --include <a,b> --not <x,y>
       skgen image plan <manifest> [--only <glob>]
       skgen image generate <manifest> --confirm-paid [--only <glob>]
       skgen image batch <manifest> [--confirm-paid] [--only <glob>] [--compose-only]
       skgen image pixellab <PixelLab command...>
       skgen image openai-image <OpenAI Image command...>`;

function printJson(deps: SkgenDeps, value: unknown): void {
	deps.stdout(`${JSON.stringify(value, null, 2)}\n`);
}

export function createDefaultDeps(): SkgenDeps {
	return {
		cwd: process.cwd(),
		stdout: (line) => process.stdout.write(line),
		stderr: (line) => process.stderr.write(line),
		readFile: (path) => readFile(path, "utf8"),
		async createProvider(kind) {
			if (kind === "fake") {
				return createFakeTextProvider({
					"*": "Primary Ability: Strength. Hit Point Die: D12 per Barbarian level. Saving Throw Proficiencies: Strength and Constitution. Greataxe.",
				});
			}
			return createPiTextProvider();
		},
		async runImageBatch(args) {
			await runArtBatchCli(args, process.cwd(), (event) =>
				process.stdout.write(`${JSON.stringify(event)}\n`),
			);
			return EXIT_OK;
		},
	};
}

function takeFlag(argv: string[], name: string): boolean {
	return argv.includes(name);
}

function takeOption(argv: string[], name: string): string | undefined {
	const index = argv.indexOf(name);
	if (index < 0) return undefined;
	return argv[index + 1];
}

async function loadManifest(deps: SkgenDeps, path: string) {
	const raw = JSON.parse(await deps.readFile(resolve(deps.cwd, path))) as unknown;
	return parseProseManifest(raw);
}

/**
 * The batch runner's argv for an image verb. `plan` drops --confirm-paid, so
 * a plan stays free even when the flag is passed by habit; `generate`
 * requires it; `batch` passes it through as given.
 */
function imageManifestArgs(verb: string, rest: string[]): string[] | undefined {
	const manifestPath = rest.find((arg) => !arg.startsWith("--"));
	if (!manifestPath) return undefined;
	if (verb === "generate" && !takeFlag(rest, "--confirm-paid")) return undefined;
	return verb === "plan" ? rest.filter((arg) => arg !== "--confirm-paid") : rest;
}

export async function runSkgen(
	argv: string[],
	deps: SkgenDeps = createDefaultDeps(),
): Promise<number> {
	if (argv.length === 0 || argv[0] === "--help" || argv[0] === "-h") {
		deps.stdout(`${USAGE}\n`);
		return EXIT_OK;
	}
	if (argv[0] === "image") {
		const verb = argv[1];
		const rest = argv.slice(2);
		if (verb === "pixellab" || verb === "openai-image") {
			try {
				await (verb === "pixellab"
					? runPixelLabCli(rest, deps.cwd)
					: runOpenAiImageCli(rest, deps.cwd));
				return EXIT_OK;
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				deps.stderr(`error: ${message}\n`);
				return EXIT_INFRA;
			}
		}
		const requireConfirmation = verb === "generate";
		if (verb !== "plan" && verb !== "generate" && verb !== "batch") {
			deps.stderr(`error: unknown image verb ${verb ?? ""}\n${USAGE}\n`);
			return EXIT_INFRA;
		}
		const args = imageManifestArgs(verb, rest);
		if (!args) {
			deps.stderr(
				requireConfirmation
					? `error: image generation requires --confirm-paid\n${USAGE}\n`
					: `${USAGE}\n`,
			);
			return EXIT_INFRA;
		}
		try {
			return await deps.runImageBatch(args);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			deps.stderr(`error: ${message}\n`);
			return EXIT_INFRA;
		}
	}
	if (argv[0] !== "prose") {
		deps.stderr(`error: unknown family ${argv[0]}\n${USAGE}\n`);
		return EXIT_INFRA;
	}
	const verb = argv[1];
	const rest = argv.slice(2);
	try {
		if (verb === "plan") {
			const manifestPath = rest.find((arg) => !arg.startsWith("--"));
			if (!manifestPath) {
				deps.stderr(`${USAGE}\n`);
				return EXIT_INFRA;
			}
			printJson(deps, planProse(await loadManifest(deps, manifestPath), "pi-ai"));
			return EXIT_OK;
		}
		if (verb === "generate") {
			const manifestPath = rest.find((arg) => !arg.startsWith("--"));
			if (!manifestPath) {
				deps.stderr(`${USAGE}\n`);
				return EXIT_INFRA;
			}
			let manifest = await loadManifest(deps, manifestPath);
			const only = takeOption(rest, "--only");
			if (only) {
				const entries = manifest.entries.filter((entry) => entry.id === only);
				if (entries.length === 0) {
					deps.stderr(`error: --only ${only} matched no entries\n`);
					return EXIT_INFRA;
				}
				manifest = { ...manifest, entries };
			}
			if (!takeFlag(rest, "--confirm-paid")) {
				printJson(deps, planProse(manifest, "pi-ai"));
				return EXIT_OK;
			}
			const providerKind = takeOption(rest, "--provider") === "fake" ? "fake" : "pi-ai";
			const provider = await deps.createProvider(providerKind);
			const run = await generateProse(manifest, provider, { outputRoot: deps.cwd });
			if (takeOption(rest, "--format") === "text") {
				for (const cell of run.cells) deps.stdout(`${cell.text}\n`);
			} else {
				printJson(deps, run);
			}
			return run.cells.every((cell) => cell.hygiene.pass && !cell.error) ? EXIT_OK : EXIT_HYGIENE;
		}
		if (verb === "prompt") {
			const manifestPath = rest.find((arg) => !arg.startsWith("--"));
			if (!manifestPath) {
				deps.stderr(`${USAGE}\n`);
				return EXIT_INFRA;
			}
			let manifest = await loadManifest(deps, manifestPath);
			const only = takeOption(rest, "--only");
			if (only) {
				const entries = manifest.entries.filter((entry) => entry.id === only);
				if (entries.length === 0) {
					deps.stderr(`error: --only ${only} matched no entries\n`);
					return EXIT_INFRA;
				}
				manifest = { ...manifest, entries };
			}
			const prompts = promptProse(manifest);
			if (takeOption(rest, "--format") === "text") {
				for (const cell of prompts) {
					deps.stdout(`# ${cell.id} (${cell.prompt_id}, ${cell.model})\n\n`);
					deps.stdout(`## system\n${cell.system}\n\n## user\n${cell.user}\n\n`);
				}
			} else {
				printJson(deps, prompts);
			}
			return EXIT_OK;
		}
		if (verb === "ingest") {
			const manifestPath = rest.find((arg) => !arg.startsWith("--"));
			if (!manifestPath) {
				deps.stderr(`${USAGE}\n`);
				return EXIT_INFRA;
			}
			const manifest = await loadManifest(deps, manifestPath);
			const only = takeOption(rest, "--only");
			const textFile = takeOption(rest, "--text-file");
			const author = takeOption(rest, "--author");
			if (!only || !textFile || !author) {
				deps.stderr(
					`error: ingest requires --only <id> --text-file <path> --author <text>\n${USAGE}\n`,
				);
				return EXIT_INFRA;
			}
			const text = await deps.readFile(resolve(deps.cwd, textFile));
			const providerName = takeOption(rest, "--provider");
			const run = await ingestProse(
				manifest,
				{ entryId: only, text, author, provider: providerName },
				{ outputRoot: deps.cwd },
			);
			printJson(deps, run);
			const cell = run.cells.find((candidate) => candidate.id === only);
			return cell?.hygiene.pass ? EXIT_OK : EXIT_HYGIENE;
		}
		if (verb === "score") {
			const text = takeOption(rest, "--text") ?? "";
			const include = (takeOption(rest, "--include") ?? "").split(",").filter(Boolean);
			const not = (takeOption(rest, "--not") ?? "").split(",").filter(Boolean);
			printJson(deps, scoreProse(text, { must_include: include, must_not: not }));
			return EXIT_OK;
		}
		deps.stderr(`error: unknown verb ${verb ?? ""}\n${USAGE}\n`);
		return EXIT_INFRA;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		deps.stderr(`error: ${message}\n`);
		return EXIT_INFRA;
	}
}
