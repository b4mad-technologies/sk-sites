#!/usr/bin/env tsx
/**
 * Regenerates the two committed compendium snapshots (sk-0ea.13):
 *
 *  - `src/compendium/docs-census.json`: the registered documentation
 *    projection's content census (see `docs-census.ts`'s own header).
 *  - `src/compendium/compendium-census.json`: every other frozen row-count
 *    literal that used to be hand-bumped across `manifest-coverage.test.ts`,
 *    `docs-coverage-validator.test.ts`, `capability-grants.test.ts`, and
 *    `bundle-info.test.ts` on every content PR.
 *
 * Run this deliberately, after reviewing the content change that caused one
 * of those tests to fail — never to make a red test go away without reading
 * why it went red. `just website-census` is the one regenerate entry point;
 * it wraps this script (which now writes both files) and
 * `capture-delivery.mjs` (the third committed compendium snapshot,
 * `delivery-report.json`).
 *
 * `--check` performs a fresh capture, validates coverage, and byte-compares
 * all three committed snapshots. It never writes snapshots; any drift or
 * invalid projection fails rather than manufacturing an artifact diff.
 *
 *   pnpm --filter @spellkave/website exec tsx scripts/capture-docs-census.mjs
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
	catalogueIdentities,
	rowCompositeColumns,
	rowIdentityColumns,
} from "@spellkave/srd-cc/docs/row-kind-coverage";
import {
	inspectManifest,
	loadFlattened,
	ROW_KIND_COMPOSITE_KEY,
	ROW_KIND_NATURAL_KEY,
	loadBundleChainDetailed,
} from "@spellkave/world-author";
import {
	manifestRowCount,
	MANIFEST_COVERAGE_PROJECTION_ROOTS,
	projectedRows,
	tableOccurrenceCount,
} from "../src/compendium/compendium-census.ts";
import { emittedCatalogueEntries, measureDelivery } from "../src/compendium/delivery.ts";
import { buildDocsCensus, collectCensusSource } from "../src/compendium/docs-census.ts";
import { validateProjectedDocsCoverage } from "../src/compendium/docs-coverage-validator.ts";
import {
	buildTechnicalDocsProjection,
	projectMetadataDocsIndex,
} from "../src/compendium/project-metadata-docs.ts";
import { DOCS_PROJECTION_ROOTS } from "./metadata-docs-registry.mts";

/** @typedef {import("../src/compendium/compendium-census.ts").CompendiumCensus} CompendiumCensus */

const websiteRoot = dirname(dirname(fileURLToPath(import.meta.url)));
/** @param {{ check?: boolean, snapshotRoot?: string, docsRoots?: readonly import("../src/compendium/project-metadata-docs.ts").DocsProjectionRoot[] }} [options] */
export function captureDocsCensus({
	check = false,
	snapshotRoot = resolve(websiteRoot, "src/compendium"),
	docsRoots = DOCS_PROJECTION_ROOTS,
} = {}) {
	const outputRoot = mkdtempSync(join(tmpdir(), "spellkave-docs-census-"));
	try {
		const index = projectMetadataDocsIndex(docsRoots, join(outputRoot, "index.json"));

		// docs-census.json: the content census over the registered projection.
		const census = buildDocsCensus(collectCensusSource(index, outputRoot));
		const censusPath = join(snapshotRoot, "docs-census.json");

		// compendium-census.json: every other frozen absolute.
		const loaded = MANIFEST_COVERAGE_PROJECTION_ROOTS.map((root) =>
			loadBundleChainDetailed({
				rootManifestPath: root.rootManifestPath,
				resolveDependency: (bundleId) => root.dependencyPaths?.[bundleId],
			}),
		);
		const manifestProjection = buildTechnicalDocsProjection(MANIFEST_COVERAGE_PROJECTION_ROOTS);
		const rows = projectedRows(manifestProjection.tables);
		const modifierTargets = rows.filter(
			(row) => row.table === "modifier_target_definitions" && row.row.bundle_id === "srd",
		);
		const attackRollOccurrences = modifierTargets.filter(
			(row) => row.row.target_id === "srd/attack_roll",
		).length;

		const coverage = validateProjectedDocsCoverage(
			index,
			outputRoot,
			buildTechnicalDocsProjection(docsRoots),
		);
		if (coverage.diagnostics.length > 0) {
			throw new Error(
				`[website] refusing to capture compendium-census.json: docs coverage validation failed:\n${coverage.diagnostics.map((d) => `- ${d.path}: ${d.message}`).join("\n")}`,
			);
		}

		const grantEntries = [...emittedCatalogueEntries(index, outputRoot)];
		const backwardGrants = grantEntries.flatMap((entry) => entry.granting_tags ?? []);

		function page(pageId) {
			const found = index.pages.find((candidate) => candidate.page_id === pageId);
			if (!found) throw new Error(`[website] compendium-census capture: no docs page '${pageId}'`);
			return found;
		}
		function facetRows(pageId, label) {
			const bundle = page(pageId).bundle;
			if (!bundle)
				throw new Error(`[website] compendium-census capture: '${pageId}' has no bundle block`);
			const facet = bundle.facets.find((candidate) => candidate.label === label);
			if (!facet)
				throw new Error(
					`[website] compendium-census capture: '${pageId}' bundle has no '${label}' facet`,
				);
			return facet.rows;
		}

		/** @type {CompendiumCensus} */
		const compendiumCensus = {
			manifest_rows: {
				srd: manifestRowCount(loaded[0]?.manifest ?? {}),
				elven_mini: manifestRowCount(loaded[1]?.manifest ?? {}),
			},
			modifier_target_definitions: {
				srd_total: modifierTargets.length,
				attack_roll_occurrences: attackRollOccurrences,
			},
			table_occurrences: {
				consequence_frame_writes: tableOccurrenceCount(rows, "consequence_frame_writes"),
				roll_table_entries: tableOccurrenceCount(rows, "roll_table_entries"),
				place_edge_affordance: tableOccurrenceCount(rows, "place_edge_affordance"),
				place_node_traces: tableOccurrenceCount(rows, "place_node_traces"),
				entity_containment: tableOccurrenceCount(rows, "entity_containment"),
			},
			docs_coverage: {
				rich_entries: coverage.rich_entries,
				technical_rows: coverage.technical_rows,
				technical_metadata_envelopes: coverage.technical_metadata_envelopes,
			},
			capability_grants: {
				backward: backwardGrants.length,
			},
			bundle_info: {
				srd_movement_defaults: facetRows("srd", "Movement defaults").length,
				srd_metadata_namespaces: facetRows("srd", "Metadata namespaces").length,
				elven_mini_movement_defaults: facetRows("elven-mini", "Movement defaults").length,
			},
		};
		const compendiumCensusPath = join(snapshotRoot, "compendium-census.json");
		const snapshots = [
			[censusPath, census],
			[compendiumCensusPath, compendiumCensus],
		];
		if (check) {
			const manifest = inspectManifest(
				loadFlattened(
					resolve(websiteRoot, "../../packages/spellkave-srd-cc/fixtures"),
					"manifest.toml",
				),
			).manifest;
			const delivery = measureDelivery(
				manifest,
				index,
				outputRoot,
				{
					natural: rowIdentityColumns(ROW_KIND_NATURAL_KEY),
					composite: rowCompositeColumns(ROW_KIND_COMPOSITE_KEY),
				},
				catalogueIdentities(ROW_KIND_NATURAL_KEY),
			);
			snapshots.push([join(snapshotRoot, "delivery-report.json"), delivery]);
			for (const [path, snapshot] of snapshots) {
				if (readFileSync(path, "utf8") !== `${JSON.stringify(snapshot, null, "\t")}\n`) {
					throw new Error(
						`[website] refusing count-neutral capture: snapshot drift at ${path}; run just website-census and review the changes`,
					);
				}
			}
			console.log("[website] verified unchanged compendium snapshots");
			return;
		}
		// Do not publish either census until the entire capture has validated.
		for (const [path, snapshot] of snapshots) {
			writeFileSync(path, `${JSON.stringify(snapshot, null, "\t")}\n`);
		}
		console.log(
			`[website] captured docs census: ${census.total_entry_count} entries across ${census.pages.length} page(s) -> ${censusPath}`,
		);
		console.log(
			`[website] captured compendium census: ${compendiumCensus.manifest_rows.elven_mini} manifest rows, ${compendiumCensus.docs_coverage.rich_entries} rich entries, ${compendiumCensus.capability_grants.backward} capability grants -> ${compendiumCensusPath}`,
		);
	} finally {
		rmSync(outputRoot, { recursive: true, force: true });
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
	const args = process.argv.slice(2);
	if (args.some((arg) => arg !== "--check"))
		throw new Error("Usage: capture-docs-census.mjs [--check]");
	captureDocsCensus({ check: args.includes("--check") });
}
