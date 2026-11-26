#!/usr/bin/env node

import { resolve } from "node:path";
import { runArtBatch } from "./art-batch.ts";

type WriteEvent = (value: unknown) => void;

function print(value: unknown): void {
	process.stdout.write(`${JSON.stringify(value)}\n`);
}

function usage(): never {
	throw new Error("usage: art-batch <manifest> [--confirm-paid] [--only <glob>] [--compose-only]");
}

function parseArgs(argv: string[]): {
	manifest: string;
	confirmPaid: boolean;
	only?: string;
	composeOnly: boolean;
} {
	const normalized = argv[0] === "--" ? argv.slice(1) : argv;
	let confirmPaid = false;
	let composeOnly = false;
	let only: string | undefined;
	const positional: string[] = [];
	for (let index = 0; index < normalized.length; index += 1) {
		const arg = normalized[index];
		if (arg === "--confirm-paid") {
			confirmPaid = true;
			continue;
		}
		if (arg === "--compose-only") {
			composeOnly = true;
			continue;
		}
		if (arg.startsWith("--only=")) {
			only = arg.slice("--only=".length);
			continue;
		}
		if (arg === "--only") {
			only = normalized[index + 1];
			index += 1;
			if (!only || only.startsWith("--")) usage();
			continue;
		}
		if (arg.startsWith("--")) usage();
		positional.push(arg);
	}
	if (positional.length !== 1) usage();
	return { manifest: positional[0], confirmPaid, only, composeOnly };
}

/** Run the catalog image verb without forking a legacy scripts/ process. */
export async function runArtBatchCli(
	argv: string[],
	repoRoot = process.cwd(),
	onEvent: WriteEvent = print,
): Promise<void> {
	const args = parseArgs(argv);
	const result = await runArtBatch(resolve(repoRoot, args.manifest), {
		repoRoot,
		confirmPaid: args.confirmPaid,
		only: args.only,
		composeOnly: args.composeOnly,
		onEvent,
	});
	onEvent(result);
}

export const main = runArtBatchCli;

if (import.meta.url === `file://${process.argv[1]}`) {
	main(process.argv.slice(2)).catch((error: unknown) => {
		const message = error instanceof Error ? error.message : "unknown art-batch failure";
		process.stderr.write(`${JSON.stringify({ kind: "art_batch_error", error: message })}\n`);
		process.exitCode = 1;
	});
}
