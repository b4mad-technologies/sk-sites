import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
	buildDocsCensus,
	collectCensusSource,
	type DocsCensus,
	type DocsCensusSource,
} from "./docs-census";
import committedCensus from "./docs-census.json";
import type { DocsIndexV1 } from "./docs-types";
import { realDocsProjection } from "./real-docs-projection";

/**
 * Replaces `manifest-catalogue-parity.test.ts`: instead of comparing the
 * registered projection to a frozen pre-migration snapshot, this re-runs the
 * projection, recomputes a small content census, and diffs it against the
 * committed `docs-census.json`. On drift it names the changed section(s) —
 * regenerate deliberately with `just website-census` (documented
 * in `docs/metadata-docs.md`).
 */

let index: DocsIndexV1;
let outputRoot = "";
let source: DocsCensusSource[];

beforeAll(async () => {
	const shared = realDocsProjection();
	outputRoot = shared.outputRoot;
	index = shared.index;
	source = collectCensusSource(index, outputRoot);
}, 180_000);

function changedSections(expected: DocsCensus, actual: DocsCensus): string[] {
	const expectedById = new Map(
		expected.pages.flatMap((page) =>
			page.sections.map((section) => [`${page.page_id}:${section.id}`, section] as const),
		),
	);
	const actualById = new Map(
		actual.pages.flatMap((page) =>
			page.sections.map((section) => [`${page.page_id}:${section.id}`, section] as const),
		),
	);
	const changed: string[] = [];
	for (const id of new Set([...expectedById.keys(), ...actualById.keys()])) {
		const left = expectedById.get(id);
		const right = actualById.get(id);
		if (!left) changed.push(`${id}: new section (entry_count ${right?.entry_count})`);
		else if (!right) changed.push(`${id}: section removed`);
		else if (left.digest !== right.digest || left.entry_count !== right.entry_count)
			changed.push(
				`${id}: content changed (entry_count ${left.entry_count} -> ${right.entry_count})`,
			);
	}
	return changed;
}

describe("documentation content census", () => {
	it("matches the committed census exactly, naming any drifted section", () => {
		const actual = buildDocsCensus(source);
		const expected = committedCensus as unknown as DocsCensus;
		const diff = changedSections(expected, actual);
		expect(
			diff,
			diff.length > 0
				? `documentation content drifted — regenerate deliberately with 'just website-census' after confirming the change is intended:\n${diff.join("\n")}`
				: "",
		).toEqual([]);
		expect(actual.digest).toBe(expected.digest);
		expect(actual.total_entry_count).toBe(expected.total_entry_count);
	}, 180_000);

	it("keeps the committed census artifact small", () => {
		const raw = readFileSync(resolve(import.meta.dirname, "docs-census.json"), "utf8");
		expect(Buffer.byteLength(raw)).toBeLessThan(64 * 1024);
	});

	it("gives every routed entry a unique href within its page", () => {
		// A featured article's `href` is null (sk-jay0.7.93): it owns no route
		// of its own, so it never enters this check — only rows that DO carry
		// a route can collide, and no two of those may share one.
		const byPage = new Map<string, DocsCensusSource[]>();
		for (const entry of source)
			byPage.set(entry.page_id, [...(byPage.get(entry.page_id) ?? []), entry]);
		const violations: string[] = [];
		for (const [page_id, entries] of byPage) {
			const byHref = new Map<string, DocsCensusSource[]>();
			for (const entry of entries) {
				if (entry.href === null) continue;
				byHref.set(entry.href, [...(byHref.get(entry.href) ?? []), entry]);
			}
			for (const [href, group] of byHref) {
				if (group.length === 1) continue;
				violations.push(
					`page '${page_id}' href '${href}': ${group.length} entries [${group.map((entry) => entry.kind).join(",")}]`,
				);
			}
		}
		expect(violations).toEqual([]);
	});

	it("gives every entry a non-empty display name", () => {
		const blank = source
			.filter((entry) => entry.name.trim().length === 0)
			.map((entry) => entry.ref);
		expect(blank).toEqual([]);
	});

	it("gives every art reference a resolvable href, license, and hash", () => {
		const incomplete = source
			.filter((entry) => entry.art !== null)
			.filter(
				(entry) =>
					!entry.art?.href.startsWith("/") ||
					entry.art?.license.length === 0 ||
					entry.art?.hash.length === 0,
			)
			.map((entry) => entry.ref);
		expect(incomplete).toEqual([]);
	});

	it("resolves every typed relation target to a known entry at the stated href", () => {
		// Keyed by kind AND ref. An id alone does not identify a subject:
		// measured over the SRD manifest, 76 ids name a subject in two kinds at
		// once — `srd/speed-walk` is both a resource and a modifier target, and 34
		// class features are both an entity definition and a capability. A
		// ref-only index silently kept whichever entry came last and then called
		// every relation to the other one unresolved.
		const hrefByIdentity = new Map(
			source.map((entry) => [`${entry.entryKind ?? entry.kind}:${entry.ref}`, entry.href]),
		);
		const unresolved = source.flatMap((entry) =>
			entry.relationTargets
				.filter(
					(relation) => hrefByIdentity.get(`${relation.kind}:${relation.ref}`) !== relation.href,
				)
				.map((relation) => `${entry.ref} -> ${relation.kind}:${relation.ref}`),
		);
		expect(unresolved).toEqual([]);
	});
});
