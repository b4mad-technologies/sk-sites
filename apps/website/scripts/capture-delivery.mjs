#!/usr/bin/env tsx
/**
 * Regenerates `src/compendium/delivery-report.json` — how many manifest rows
 * of each kind are provably shown to a reader, and how many reach nobody.
 *
 * Run this deliberately, after reviewing why `delivery.test.ts` went red.
 * The undelivered count is expected to FALL as owner rows and relation edges
 * get delivered (sk-jay0.3.5.71). A rise means something stopped being shown,
 * which is the case worth stopping for. `just website-census` (sk-0ea.13) is
 * the one regenerate entry point and runs this alongside the other two
 * committed compendium snapshots.
 *
 *   pnpm --filter @spellkave/website exec tsx scripts/capture-delivery.mjs
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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
} from "@spellkave/world-author";
import { measureDelivery } from "../src/compendium/delivery.ts";
import { projectMetadataDocsIndex } from "../src/compendium/project-metadata-docs.ts";
import { DOCS_PROJECTION_ROOTS } from "./metadata-docs-registry.mts";

const websiteRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const outputRoot = mkdtempSync(join(tmpdir(), "spellkave-delivery-"));
try {
	const index = projectMetadataDocsIndex(DOCS_PROJECTION_ROOTS, join(outputRoot, "index.json"));
	const manifestDir = resolve(websiteRoot, "../../packages/spellkave-srd-cc/fixtures");
	const manifest = inspectManifest(loadFlattened(manifestDir, "manifest.toml")).manifest;
	const report = measureDelivery(
		manifest,
		index,
		outputRoot,
		{ natural: rowIdentityColumns(ROW_KIND_NATURAL_KEY), composite: rowCompositeColumns(ROW_KIND_COMPOSITE_KEY) },
		catalogueIdentities(ROW_KIND_NATURAL_KEY),
	);
	const target = join(websiteRoot, "src/compendium/delivery-report.json");
	writeFileSync(target, `${JSON.stringify(report, null, "\t")}\n`);
	console.log(
		`[website] captured delivery: ${report.delivered} of ${report.authored} rows shown, ${report.undelivered} reach nobody -> ${target}`,
	);
} finally {
	rmSync(outputRoot, { recursive: true, force: true });
}
