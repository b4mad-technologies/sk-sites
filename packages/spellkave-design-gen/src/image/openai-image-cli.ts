#!/usr/bin/env node

import { resolve } from "node:path";
import { planOpenAiImage, runOpenAiImage } from "./openai-image.ts";
import { checkTileability } from "./tileability.ts";

function print(value: unknown): void {
	process.stdout.write(`${JSON.stringify(value)}\n`);
}

function usage(): never {
	throw new Error(
		"usage: openai-image <plan BLUEPRINT | generate BLUEPRINT --confirm-paid | tile IMAGE [--preview OUT]>",
	);
}

export async function main(argv: string[], repoRoot = process.cwd()): Promise<void> {
	const normalizedArgv = argv[0] === "--" ? argv.slice(1) : argv;
	const [command, ...args] = normalizedArgv;
	if (command === "plan") {
		if (args.length !== 1) usage();
		print(await planOpenAiImage(resolve(repoRoot, args[0]), repoRoot));
		return;
	}
	if (command === "generate") {
		const blueprint = args.find((arg) => !arg.startsWith("--"));
		if (!blueprint) usage();
		print(
			await runOpenAiImage(resolve(repoRoot, blueprint), {
				repoRoot,
				confirmPaid: args.includes("--confirm-paid"),
			}),
		);
		return;
	}
	if (command === "tile") {
		const image = args.find((arg) => !arg.startsWith("--"));
		if (!image) usage();
		const previewFlag = args.find((arg) => arg.startsWith("--preview="));
		const previewIndex = args.indexOf("--preview");
		const previewPath = previewFlag
			? previewFlag.slice("--preview=".length)
			: previewIndex >= 0
				? args[previewIndex + 1]
				: undefined;
		print(checkTileability(resolve(repoRoot, image), { previewPath }));
		return;
	}
	usage();
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main(process.argv.slice(2)).catch((error: unknown) => {
		process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
		process.exitCode = 1;
	});
}
