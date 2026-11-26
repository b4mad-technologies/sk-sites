#!/usr/bin/env node

import { resolve } from "node:path";
import {
	createClientFromEnv,
	ingestGeneration,
	planGeneration,
	runGeneration,
} from "./pixellab.ts";
import {
	planEntityArtAudit,
	runEntityArtAudit,
	runStyleProposals,
	writeProposalReviewBoard,
	writeStyleProposalScaffold,
} from "./pixellab-entity-art.ts";
import {
	planEntityArtPilot,
	runEntityArtPilot,
	writeEntityArtPackAssets,
	writeEntityArtSheets,
} from "./pixellab-entity-art-pilot.ts";
import { checkReference, refreshReference } from "./pixellab-reference.ts";
import { planUiV2Generation, runUiV2Generation } from "./pixellab-ui-v2.ts";

function print(value: unknown): void {
	process.stdout.write(`${JSON.stringify(value)}\n`);
}

function usage(): never {
	throw new Error(
		"usage: pixellab <balance | plan BLUEPRINT | generate BLUEPRINT [--confirm-paid] [--resume] | plan-ui BLUEPRINT | generate-ui BLUEPRINT [--confirm-paid] [--resume] | ingest MANIFEST TARGET [--confirm-reviewed] | reference check [--remote] | reference refresh | audit-entity-art [--confirm-paid] | generate-proposals [--confirm-paid] | proposal-scaffold | proposal-review-board | generate-pilot [--confirm-paid] | entity-art-sheets>",
	);
}

export async function main(argv: string[], repoRoot = process.cwd()): Promise<void> {
	const normalizedArgv = argv[0] === "--" ? argv.slice(1) : argv;
	const [command, ...args] = normalizedArgv;
	if (command === "balance") {
		if (args.length !== 0) usage();
		print({ kind: "pixellab_balance", balance: await createClientFromEnv().getBalance() });
		return;
	}
	if (command === "plan") {
		if (args.length !== 1) usage();
		print(await planGeneration(resolve(repoRoot, args[0]), repoRoot));
		return;
	}
	if (command === "generate") {
		const blueprint = args.find((arg) => !arg.startsWith("--"));
		if (!blueprint) usage();
		const result = await runGeneration(resolve(repoRoot, blueprint), {
			repoRoot,
			confirmPaid: args.includes("--confirm-paid"),
			resume: args.includes("--resume"),
			onEvent: print,
		});
		print(result);
		return;
	}
	if (command === "plan-ui") {
		if (args.length !== 1) usage();
		print(await planUiV2Generation(resolve(repoRoot, args[0]), repoRoot));
		return;
	}
	if (command === "generate-ui") {
		const blueprint = args.find((arg) => !arg.startsWith("--"));
		if (!blueprint) usage();
		print(
			await runUiV2Generation(resolve(repoRoot, blueprint), {
				repoRoot,
				confirmPaid: args.includes("--confirm-paid"),
				resume: args.includes("--resume"),
				onEvent: print,
			}),
		);
		return;
	}
	if (command === "ingest") {
		const positional = args.filter((arg) => !arg.startsWith("--"));
		if (positional.length !== 2) usage();
		print(
			await ingestGeneration(resolve(repoRoot, positional[0]), positional[1], {
				repoRoot,
				confirmReviewed: args.includes("--confirm-reviewed"),
			}),
		);
		return;
	}
	if (command === "reference" && args[0] === "check") {
		print(await checkReference(repoRoot, { remote: args.includes("--remote") }));
		return;
	}
	if (command === "reference" && args[0] === "refresh") {
		if (args.length !== 1) usage();
		print(await refreshReference(repoRoot));
		return;
	}
	if (command === "audit-entity-art") {
		if (args.includes("--confirm-paid")) {
			print(
				await runEntityArtAudit({
					repoRoot,
					confirmPaid: true,
					onEvent: print,
				}),
			);
			return;
		}
		print(planEntityArtAudit());
		return;
	}
	if (command === "generate-proposals") {
		print(
			await runStyleProposals({
				repoRoot,
				confirmPaid: args.includes("--confirm-paid"),
				onEvent: print,
			}),
		);
		return;
	}
	if (command === "proposal-scaffold") {
		print(await writeStyleProposalScaffold(repoRoot));
		return;
	}
	if (command === "proposal-review-board") {
		print(await writeProposalReviewBoard(repoRoot));
		return;
	}
	if (command === "generate-pilot") {
		if (!args.includes("--confirm-paid")) {
			print(planEntityArtPilot());
			print(await writeEntityArtPackAssets(repoRoot));
			return;
		}
		print(
			await runEntityArtPilot({
				repoRoot,
				confirmPaid: true,
				onEvent: print,
			}),
		);
		return;
	}
	if (command === "entity-art-sheets") {
		print(await writeEntityArtSheets(repoRoot));
		return;
	}
	usage();
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main(process.argv.slice(2)).catch((error: unknown) => {
		const message = error instanceof Error ? error.message : "unknown PixelLab tooling failure";
		process.stderr.write(`${JSON.stringify({ kind: "pixellab_error", error: message })}\n`);
		process.exitCode = 1;
	});
}
