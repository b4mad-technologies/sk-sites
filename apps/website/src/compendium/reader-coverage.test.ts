import { publishedRowKinds } from "@spellkave/srd-cc/docs/catalogue";
import {
	entryKindForTable,
	pagedRowKinds,
	rowKindCoverage,
	rowKindCoverageFor,
} from "@spellkave/srd-cc/docs/row-kind-coverage";
import { registeredRowViewKinds } from "@spellkave/ui-widgets/catalogue";
import { describe, expect, it } from "vitest";

/**
 * The reader's half of the coverage promise.
 *
 * Rule A — every manifest row kind is classified — lives in
 * `docs-coverage-validator.ts`, because it needs no Svelte and so can run in
 * the `tsx` CLI gate. Rule B lives HERE instead: it has to know which
 * components exist, `row-views.ts` imports `.svelte` files, and the CLI has no
 * Svelte compiler. Splitting them is a mechanical constraint, not a softening —
 * both run in CI.
 */

const published = publishedRowKinds();

function entryKindFor(table: string): string {
	const coverage = rowKindCoverageFor(table);
	if (coverage === undefined) throw new Error(`${table} is published but not classified`);
	return entryKindForTable(coverage);
}

describe("reader coverage", () => {
	it("classifies every kind it publishes as one that earns a page", () => {
		const paged = new Set(pagedRowKinds());
		expect(published.filter((kind) => !paged.has(kind))).toEqual([]);
	});

	// RULE B. A kind that reaches readers without a component does not fall
	// back to something poorer — it falls back to a raw JSON dump, which is not
	// documentation. Publishing is the moment this must hold, so publishing is
	// what the gate keys on.
	it("has a reader component for every kind it publishes", () => {
		const registered = new Set(registeredRowViewKinds());
		const missing = published
			.map((table) => ({ table, entryKind: entryKindFor(table) }))
			.filter(({ entryKind }) => !registered.has(entryKind))
			.map(({ table, entryKind }) => `${table} (entry kind '${entryKind}')`);
		expect(
			missing,
			`These kinds are published but have no component, so their pages would render as a raw JSON dump. Either write the component and register it in row-views.ts, or remove the kind's [[kind_sections]] row from sections.toml.`,
		).toEqual([]);
	});

	it("registers no component for a kind it does not publish", () => {
		// A component with nothing to render is dead code that reads as coverage.
		const publishedEntryKinds = new Set(published.map(entryKindFor));
		// The three kinds with their own long-standing typed views are published
		// through `entity_routes`/`tags_section` rather than `[[kind_sections]]`.
		const publishedElsewhere = new Set([
			"entity_definition",
			"entity",
			"resource_definition",
			"tag_value_definition",
		]);
		expect(
			registeredRowViewKinds().filter(
				(kind) => !publishedEntryKinds.has(kind) && !publishedElsewhere.has(kind),
			),
		).toEqual([]);
	});

	// The softer half: what is classified as deserving a page but is not
	// published yet. This is allowed to be non-empty — it is the honest measure
	// of how far the reader still has to go — but it must stay VISIBLE, so the
	// count is asserted and a shrinking backlog has to be recorded here.
	it("reports how many page-worthy kinds are still unpublished", () => {
		const publishedSet = new Set(published);
		const elsewhere = new Set([
			"entity_definitions",
			"entities",
			"resource_definitions",
			"tag_value_definitions",
			"place_graphs",
			"place_nodes",
			"place_edges",
			"session_definitions",
			"bundles",
		]);
		const waiting = pagedRowKinds().filter(
			(kind) => !publishedSet.has(kind) && !elsewhere.has(kind),
		);
		expect(
			waiting,
			'A kind classified surface = "page" that nothing publishes reaches readers only as a raw table row. Publish it, or reclassify it with a reason.',
		).toEqual([]);
	});

	it("keeps every classified kind in exactly one bucket", () => {
		const surfaces = new Map<string, string>();
		for (const row of rowKindCoverage()) {
			expect(surfaces.has(row.kind)).toBe(false);
			surfaces.set(row.kind, row.surface);
		}
		expect(surfaces.size).toBe(rowKindCoverage().length);
	});
});
