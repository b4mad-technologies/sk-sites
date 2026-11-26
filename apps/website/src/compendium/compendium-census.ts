import { resolve } from "node:path";
import type { DocsProjectionRoot } from "./project-metadata-docs";

/**
 * One generated snapshot for every frozen row-count literal that used to be
 * hand-bumped across `manifest-coverage.test.ts`, `docs-coverage-validator.test.ts`,
 * `capability-grants.test.ts`, and `bundle-info.test.ts` on every content PR
 * (sk-0ea.13). The committed artifact is `compendium-census.json`, written by
 * `scripts/capture-docs-census.mjs`; the recipe is `just website-census`.
 *
 * The tests keep their structural invariants as real assertions (sum of
 * sources equals projection length, every row projects once, and so on) —
 * only the absolute numbers a content change moves live here.
 */
export interface CompendiumCensus {
	/** Non-`include` row totals per registered closure, in
	 * `MANIFEST_COVERAGE_PROJECTION_ROOTS` order (SRD alone, then the merged
	 * SRD+DM+Elven Mini closure). */
	manifest_rows: { srd: number; elven_mini: number };
	modifier_target_definitions: { srd_total: number; attack_roll_occurrences: number };
	table_occurrences: {
		consequence_frame_writes: number;
		roll_table_entries: number;
		place_edge_affordance: number;
		place_node_traces: number;
		entity_containment: number;
	};
	docs_coverage: {
		rich_entries: number;
		technical_rows: number;
		technical_metadata_envelopes: number;
	};
	capability_grants: { backward: number };
	bundle_info: {
		srd_movement_defaults: number;
		srd_metadata_namespaces: number;
		elven_mini_movement_defaults: number;
	};
}

const REPO_ROOT = resolve(import.meta.dirname, "../../../..");
const SRD_ROOT = resolve(REPO_ROOT, "packages/spellkave-srd-cc/fixtures/manifest.toml");
const DM_ROOT = resolve(REPO_ROOT, "packages/spellkave-srd-cc/fixtures/dm/manifest.toml");

/**
 * The narrower registered-root pair `manifest-coverage.test.ts` (and the
 * capture script) load directly, bypassing the `dm` bundle's own separately
 * mounted root in `scripts/metadata-docs-registry.mts` — see that test's own
 * header for why: the point here is the two intended dependency closures
 * (SRD alone, and the merged SRD+DM+Elven Mini closure), not every publicly
 * mounted page.
 */
export const MANIFEST_COVERAGE_PROJECTION_ROOTS: readonly DocsProjectionRoot[] = [
	{ rootManifestPath: SRD_ROOT, mount: "/docs/srd", assetMounts: { "srd-art": "/srd-art" } },
	{
		rootManifestPath: resolve(
			REPO_ROOT,
			"packages/spellkave-adventure-elven-mini/fixtures/adventure.manifest.toml",
		),
		dependencyPaths: { srd: SRD_ROOT, dm: DM_ROOT },
		assetMounts: {
			"srd-art": "/srd-art",
			"elven-mini-art": "/compendium/adventures/elven-mini/art",
		},
	},
];

/** Non-`include` row count of a loaded manifest closure. Shared by
 * `manifest-coverage.test.ts` and the capture script so the two can never
 * disagree about what counts as a row. */
export function manifestRowCount(manifest: Record<string, unknown>): number {
	return Object.entries(manifest).reduce(
		(sum, [table, value]) => sum + (table !== "include" && Array.isArray(value) ? value.length : 0),
		0,
	);
}

/** Every non-`manifest_metadata` row a technical projection emits, flattened
 * across sources and tables. Shared by `manifest-coverage.test.ts` and the
 * capture script. */
export function projectedRows(
	tables: ReadonlyMap<string, ReadonlyMap<string, ReadonlyArray<Record<string, unknown>>>>,
): Array<{ source: string; table: string; row: Record<string, unknown> }> {
	return [...tables].flatMap(([source, sourceTables]) =>
		[...sourceTables].flatMap(([table, rows]) =>
			table === "manifest_metadata" ? [] : rows.map((row) => ({ source, table, row })),
		),
	);
}

/** How many projected rows carry a given table name. */
export function tableOccurrenceCount(
	rows: ReadonlyArray<{ table: string }>,
	table: string,
): number {
	return rows.filter((row) => row.table === table).length;
}
