/**
 * Measure the shared matcher against the emitted real documentation vocabulary.
 *
 * Run from the repository root:
 *   pnpm exec tsx packages/spellkave-ui-widgets/scripts/reference-matching-benchmark.mts
 *
 * This intentionally has no timing assertion: CI runners and browsers vary.
 * It reports a real emitted article and a separate synthetic exact-name-heavy
 * workload; neither is a general speed claim. The old pass reports one hit per
 * target with ASCII boundaries, while the matcher has Unicode boundaries and
 * overlap resolution, so hit counts are diagnostic rather than asserted equal.
 */
import { readFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";

import { compileReferenceMatcher, type ReferenceTarget } from "../src/reference-matching/index.ts";

interface VocabularyArtifact {
	targets: ReferenceTarget[];
}

function retiredRegexPass(text: string, targets: readonly ReferenceTarget[]): number {
	let count = 0;
	for (const target of targets) {
		const present = target.ignoreCase ? text.toLowerCase().includes(target.label.toLowerCase()) : text.includes(target.label);
		if (!present) continue;
		const escaped = target.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		if (new RegExp(`(^|[^A-Za-z0-9])(${escaped})(?![A-Za-z0-9])`, target.ignoreCase ? "i" : "").test(text)) count++;
	}
	return count;
}

function measured(label: string, runs: number, operation: () => number): void {
	const start = performance.now();
	let result = 0;
	for (let run = 0; run < runs; run++) result = operation();
	const elapsed = performance.now() - start;
	console.log(`${label}: ${(elapsed / runs).toFixed(2)} ms/run (${runs} runs; last hit count ${result})`);
}

const artifact = JSON.parse(
	await readFile(new URL("../../../apps/website/public/compendium/docs/references.json", import.meta.url), "utf8"),
) as VocabularyArtifact;
const article = JSON.parse(
	await readFile(new URL("../../../apps/website/public/compendium/docs/articles/srd/spells/spells-spell-descriptions-divine-word.json", import.meta.url), "utf8"),
) as { body: string };
const syntheticProse = artifact.targets
	.filter((target) => target.label.length > 2)
	.slice(0, 320)
	.map((target) => `A creature may consult ${target.label} before deciding what to do.`)
	.join(" ");

console.log(`Vocabulary: ${artifact.targets.length} targets.`);
console.log(`Real emitted article (Divine Word): ${article.body.length} UTF-16 units.`);
const compileStart = performance.now();
for (let run = 0; run < 10; run++) compileReferenceMatcher(artifact.targets);
console.log(`Trie compilation: ${((performance.now() - compileStart) / 10).toFixed(2)} ms/run (10 runs).`);
const matcher = compileReferenceMatcher(artifact.targets);
for (const [label, prose] of [["Real emitted article", article.body], ["Synthetic exact-name-heavy prose", syntheticProse]] as const) {
	console.log(`${label}: ${prose.length} UTF-16 units.`);
	measured(`${label}, warm trie (once per target)`, 100, () => matcher.match(prose, { oncePerTarget: true }).length);
	measured(`${label}, retired per-target RegExp`, 100, () => retiredRegexPass(prose, artifact.targets));
}
