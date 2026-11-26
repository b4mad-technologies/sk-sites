import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
	catalogueIdentities,
	rowCompositeColumns,
	rowIdentityColumns,
	rowKindCoverage,
} from "@spellkave/srd-cc/docs/row-kind-coverage";
import { ROW_KIND_COMPOSITE_KEY, ROW_KIND_NATURAL_KEY } from "@spellkave/world-author";
import { beforeAll, describe, expect, it } from "vitest";
import {
	collectWitnesses,
	emittedArticles,
	emittedCatalogueEntries,
	emittedPages,
} from "./delivery";
import type { DocsIndexV1, DocsTechnicalTable } from "./docs-types";
import { buildTechnicalDocsProjection, type DocsProjectionRoot } from "./project-metadata-docs";
import { realDocsProjection } from "./real-docs-projection";

/**
 * The overflow basin holds only rows that are broken, never rows nobody placed.
 *
 * `docs-coverage-validator.test.ts` already proves every manifest row of every
 * registered bundle is on a page or in the basin, never both and never
 * neither. What it cannot say is WHY a row is in the basin, and a new row that
 * simply has no home yet looks exactly like a legitimate one: its count pin is
 * regenerated and the row is forgotten. This test closes that gap. Every basin
 * row must explain itself, and the only explanation accepted is one derived
 * from the data: the row names an id that no row in any registered bundle
 * defines. That is broken content (an undefined niche, a missing definition),
 * fixed in the content, not in the reader. Anything else fails here with its
 * table and row, and the way out is to give it a page (sk-jay0.3.5.76).
 *
 * The owner's goal for the reader is a browsable human view of every TOML row
 * of the bundles it publishes; this is the gate that keeps it true.
 */

type Row = Record<string, unknown>;

let index: DocsIndexV1;
let outputRoot = "";
let roots: readonly DocsProjectionRoot[] = [];
let defined: ReadonlySet<string> = new Set();

beforeAll(async () => {
	const shared = realDocsProjection();
	outputRoot = shared.outputRoot;
	const registry = (await import(
		pathToFileURL(resolve(import.meta.dirname, "../../scripts/metadata-docs-registry.mts")).href
	)) as { DOCS_PROJECTION_ROOTS: readonly DocsProjectionRoot[] };
	roots = registry.DOCS_PROJECTION_ROOTS;
	index = shared.index;
	defined = definedIds();
}, 180_000);

function basinRows(): Array<{ source: string; table: string; row: Row }> {
	const out: Array<{ source: string; table: string; row: Row }> = [];
	for (const source of index.technical_sources ?? [])
		for (const summary of source.tables) {
			if (summary.table === "manifest_metadata") continue;
			const artifact = JSON.parse(
				readFileSync(join(outputRoot, summary.href.slice("/compendium/docs/".length)), "utf8"),
			) as DocsTechnicalTable;
			for (const row of artifact.rows)
				out.push({ source: source.source_id, table: summary.table, row });
		}
	return out;
}

/** Every id any row of any registered bundle defines, by its table's identity column. */
function definedIds(): ReadonlySet<string> {
	const identity = rowIdentityColumns(ROW_KIND_NATURAL_KEY);
	const ids = new Set<string>();
	for (const tables of buildTechnicalDocsProjection(roots).tables.values())
		for (const [table, rows] of tables) {
			const column = identity[table];
			if (column === undefined) continue;
			for (const row of rows) if (typeof row[column] === "string") ids.add(row[column] as string);
		}
	return ids;
}

/** The ids a row names that nothing defines: a reference column holding an unknown id. */
function danglingIds(row: Row): string[] {
	return Object.entries(row)
		.filter(([column, value]) => /(?:_id|_key)$/.test(column) && typeof value === "string")
		.filter(([, value]) => value !== "" && !defined.has(value as string))
		.map(([column, value]) => `${column}=${String(value)}`);
}

describe("overflow basin", () => {
	it("holds only rows that name something no bundle defines", () => {
		const unexplained = basinRows()
			.filter(({ row }) => danglingIds(row).length === 0)
			.map(({ source, table, row }) => `${source}:${table} ${JSON.stringify(row).slice(0, 200)}`);
		expect(
			unexplained,
			"these rows reach no page and are not broken: give them a home on a page",
		).toEqual([]);
	});

	it("names what each broken row points at, so the content fix is findable", () => {
		// Today exactly one: an SRD niche attachment on a niche and an edge that
		// no bundle defines (sk-jay0.3.5.70). Listed so a reader of a failure
		// sees the dangling ids, not just a count.
		const broken = basinRows().map(
			({ source, table, row }) => `${source}:${table} ${danglingIds(row).join(" ")}`,
		);
		expect(broken).toEqual([
			"srd:spatial_niche_attachments place_edge_id=0 niche_id=srd/niche/traversable-square",
		]);
	});

	it("never shows a row its classification says has no reader surface", () => {
		// A kind classified `surface = "none"` that a page renders anyway means the
		// classification lies about the reader. turn_scheduler did exactly that
		// for one commit: rendered on its session's page by hand, still "none".
		const none = new Set(
			rowKindCoverage()
				.filter((kind) => kind.surface === "none")
				.map((kind) => kind.kind),
		);
		const witnessed = collectWitnesses(
			emittedCatalogueEntries(index, outputRoot),
			emittedArticles(index, outputRoot),
			// The same keys and identities the projection itself uses.
			{
				natural: rowIdentityColumns(ROW_KIND_NATURAL_KEY),
				composite: rowCompositeColumns(ROW_KIND_COMPOSITE_KEY),
			},
			catalogueIdentities(ROW_KIND_NATURAL_KEY),
			emittedPages(index),
		);
		const shownButNone = [...witnessed.reasons.keys()].filter((table) => none.has(table));
		expect(shownButNone).toEqual([]);
	}, 60_000);
});
