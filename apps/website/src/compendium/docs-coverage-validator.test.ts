import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { setImmediate } from "node:timers/promises";
import { pathToFileURL } from "node:url";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { CompendiumCensus } from "./compendium-census";
import committedCensus from "./compendium-census.json";
import { validateProjectedDocsCoverage } from "./docs-coverage-validator";
import type { DocsIndexV1 } from "./docs-types";
import {
	buildTechnicalDocsProjection,
	type DocsProjectionRoot,
	projectMetadataDocsIndex,
} from "./project-metadata-docs";

const census = committedCensus as unknown as CompendiumCensus;
/** Shown on every drift so a red run always names the fix, never just a number. */
const DRIFT = "compendium census drift: run `just website-census`";

describe("generated documentation coverage", () => {
	let root = "";
	let index: DocsIndexV1;
	let roots: readonly DocsProjectionRoot[];
	beforeAll(async () => {
		root = mkdtempSync(join(tmpdir(), "spellkave-docs-coverage-test-"));
		const registry = (await import(
			pathToFileURL(resolve(import.meta.dirname, "../../scripts/metadata-docs-registry.mts")).href
		)) as { DOCS_PROJECTION_ROOTS: readonly DocsProjectionRoot[] };
		roots = registry.DOCS_PROJECTION_ROOTS;
		index = projectMetadataDocsIndex(roots, join(root, "index.json"));
	}, 180_000);
	afterAll(() => {
		if (root) rmSync(root, { recursive: true, force: true });
	});

	it("accounts for every rich artifact and every basin occurrence", () => {
		// Page-or-basin partition sizes. Structural invariant: `diagnostics` must
		// stay empty (no row missing from both halves, none in both). The three
		// absolute totals live in `compendium-census.json` (`just website-census`
		// regenerates it); `technical_rows` is expected to FALL as owner rows and
		// relation edges are delivered (sk-jay0.3.5.71) — a RISE means pages
		// stopped showing rows they used to show, worth a deliberate look before
		// regenerating.
		expect(
			validateProjectedDocsCoverage(index, root, buildTechnicalDocsProjection(roots)),
			DRIFT,
		).toEqual({
			diagnostics: [],
			rich_entries: census.docs_coverage.rich_entries,
			technical_rows: census.docs_coverage.technical_rows,
			technical_metadata_envelopes: census.docs_coverage.technical_metadata_envelopes,
		});
	}, 180_000);

	it("rejects an emitted route that the application resolver cannot serve", () => {
		const broken = structuredClone(index);
		broken.pages[0]!.sections[0]!.href = "/outside-docs";
		expect(validateProjectedDocsCoverage(broken, root).diagnostics).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					message: expect.stringContaining("does not resolve through the application router"),
				}),
			]),
		);
	});

	it("rejects missing lazy artifacts and rows that fall out of both halves", () => {
		const catalogueHref = index.pages
			.flatMap((page) => page.sections)
			.find((section) => section.catalogue_href)?.catalogue_href;
		expect(catalogueHref).toBeDefined();
		const artifact = join(root, catalogueHref!.replace("/compendium/docs/", ""));
		const backup = `${artifact}.coverage-test-backup`;
		renameSync(artifact, backup);
		try {
			expect(validateProjectedDocsCoverage(index, root).diagnostics).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						message: expect.stringContaining("missing or invalid documentation artifact"),
					}),
				]),
			);
		} finally {
			renameSync(backup, artifact);
		}
		// Dropping a basin table no longer reads as "the dump is incomplete" — the
		// dump is allowed to be incomplete now. It reads as the thing that actually
		// harms a reader: those rows are on no page and in no artifact either, so
		// they have silently left the site altogether.
		// The basin is nearly empty now, so drop a table that really holds rows
		// rather than whichever happens to come first.
		const broken = structuredClone(index);
		const holder = broken.technical_sources!.find((source) =>
			source.tables.some((table) => table.table !== "manifest_metadata"),
		)!;
		holder.tables = holder.tables.filter((table) => table.table === "manifest_metadata");
		expect(
			validateProjectedDocsCoverage(broken, root, buildTechnicalDocsProjection(roots)).diagnostics,
		).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					message: expect.stringContaining("appear on no page and in no technical artifact"),
				}),
			]),
		);
	}, 180_000);

	it("rejects same-count changed and duplicate-replacement basin occurrences", () => {
		const technical = buildTechnicalDocsProjection(roots);
		// Any real basin table will do: the duplicate case below builds its own
		// second row instead of needing the basin to hold two.
		const source = index.technical_sources!.find((candidate) =>
			candidate.tables.some((table) => table.table !== "manifest_metadata"),
		)!;
		const summary = source.tables.find((table) => table.table !== "manifest_metadata")!;
		const artifact = join(root, summary.href.replace("/compendium/docs/", ""));
		const original = JSON.parse(readFileSync(artifact, "utf8")) as {
			rows: Record<string, unknown>[];
		};
		const changed = structuredClone(original);
		changed.rows[0] = { ...changed.rows[0], coverage_test_change: true };
		writeFileSync(artifact, JSON.stringify(changed));
		try {
			// The basin may hold fewer rows than the manifest authors, never other
			// ones. Both mutations keep the row COUNT identical, so only comparing
			// against the authored corpus catches them.
			expect(validateProjectedDocsCoverage(index, root, technical).diagnostics).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						message: expect.stringContaining("the manifest does not author"),
					}),
				]),
			);
			// A duplicate in place of a real row: two copies of the first authored
			// row where the manifest has one, with the counts kept consistent.
			const duplicated = { ...original, rows: [original.rows[0]!, original.rows[0]!] };
			writeFileSync(artifact, JSON.stringify(duplicated));
			const recounted = structuredClone(index);
			const recountedSource = recounted.technical_sources!.find(
				(candidate) => candidate.source_id === source.source_id,
			)!;
			recountedSource.row_count += 1;
			recountedSource.tables.find((table) => table.table === summary.table)!.count += 1;
			expect(validateProjectedDocsCoverage(recounted, root, technical).diagnostics).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						message: expect.stringContaining("the manifest does not author"),
					}),
				]),
			);
		} finally {
			writeFileSync(artifact, JSON.stringify(original));
		}
	}, 180_000);

	it("rejects typed targets whose href no longer matches the catalogue identity", () => {
		const broken = structuredClone(index);
		const link = broken.pages.flatMap((page) => page.links ?? [])[0];
		expect(link).toBeDefined();
		link!.href = "/docs/srd/spells/not-the-target";
		expect(validateProjectedDocsCoverage(broken, root).diagnostics).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ message: expect.stringContaining("typed target resolves") }),
			]),
		);
	});

	it("rejects an article route whose embedded target was dropped", () => {
		const summary = index.pages
			.flatMap((page) => page.sections)
			.flatMap((section) => section.pages ?? [])
			.find(
				(page) => (page.resource_routes?.length ?? 0) > 0 || (page.subject_routes?.length ?? 0) > 0,
			)!;
		expect(summary).toBeDefined();
		const artifact = join(root, summary.artifact_href.replace("/compendium/docs/", ""));
		const original = JSON.parse(readFileSync(artifact, "utf8")) as {
			resources?: unknown[];
			subjects?: unknown[];
		};
		const changed = structuredClone(original);
		if (summary.resource_routes?.length) changed.resources = [];
		else changed.subjects = [];
		writeFileSync(artifact, JSON.stringify(changed));
		try {
			expect(validateProjectedDocsCoverage(index, root).diagnostics).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ message: expect.stringContaining("route membership") }),
				]),
			);
		} finally {
			writeFileSync(artifact, JSON.stringify(original));
		}
	}, 180_000);
});

describe("arbitrary authored documentation roots", () => {
	it("accepts a non-SRD bundle and section without a representation allowlist", () => {
		const root = mkdtempSync(join(tmpdir(), "spellkave-docs-arbitrary-"));
		try {
			const manifest = join(root, "manifest.toml");
			writeFileSync(
				manifest,
				`#:schema https://spellkave.dev/schema/world-manifest-1.0.0.json
schema_version = "1.0.0"
[[bundles]]
bundle_id = "example"
display_name = "Example"
author = "test"
version = "1.0.0"
depends_on = []
description = "Example"
[metadata.docs]
version = 1
page_id = "example"
title = "Example"
nav_group = "reference"
intro = "Example reference."
[[metadata.docs.sections]]
id = "unusual"
title = "Unusual"
intro = "An arbitrary section."
`,
				"utf8",
			);
			const output = join(root, "public", "index.json");
			const roots = [{ rootManifestPath: manifest }];
			const index = projectMetadataDocsIndex(roots, output);
			expect(
				validateProjectedDocsCoverage(
					index,
					join(root, "public"),
					buildTechnicalDocsProjection(roots),
				),
			).toMatchObject({ diagnostics: [] });
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	it("the CLI ignores unrelated TOMLs but fails a missing declared include", () => {
		const root = mkdtempSync(join(tmpdir(), "spellkave-docs-cli-closure-"));
		try {
			const manifest = join(root, "manifest.toml");
			const included = join(root, "included.toml");
			writeFileSync(included, "[metadata.example]\nvalue = 'included'\n", "utf8");
			writeFileSync(join(root, "unreferenced-malformed.toml"), "this is not TOML = [", "utf8");
			writeFileSync(
				manifest,
				`#:schema https://spellkave.dev/schema/world-manifest-1.0.0.json
schema_version = "1.0.0"
[[include]]
path = "included.toml"
[[bundles]]
bundle_id = "closure-test"
display_name = "Closure Test"
author = "test"
version = "1.0.0"
depends_on = []
description = "Closure Test"
[metadata.docs]
version = 1
page_id = "closure-test"
title = "Closure Test"
nav_group = "reference"
intro = "Closure test."
[[metadata.docs.sections]]
id = "reference"
title = "Reference"
intro = "Reference section."
`,
				"utf8",
			);
			const websiteRoot = resolve(import.meta.dirname, "../..");
			const run = () =>
				spawnSync("pnpm", ["exec", "tsx", "scripts/validate-metadata-docs.mts", manifest], {
					cwd: websiteRoot,
					encoding: "utf8",
				});
			const removedFlag = spawnSync(
				"pnpm",
				["exec", "tsx", "scripts/validate-metadata-docs.mts", "--all-fixtures"],
				{ cwd: websiteRoot, encoding: "utf8" },
			);
			expect(removedFlag.status).not.toBe(0);
			expect(`${removedFlag.stdout}${removedFlag.stderr}`).toContain(
				"usage: validate-metadata-docs",
			);
			const valid = run();
			expect({ status: valid.status, stderr: valid.stderr }).toEqual({ status: 0, stderr: "" });
			rmSync(included);
			const missing = run();
			expect(missing.status).not.toBe(0);
			expect(`${missing.stdout}${missing.stderr}`).toContain("included.toml");
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	}, 180_000);
});

// These file-backed projections are CPU-bound. Give Vitest's worker RPC an
// event-loop turn between cases instead of chaining synchronous work past its
// heartbeat deadline; this does not wait on elapsed time or relax assertions.
afterEach(async () => {
	await setImmediate();
});
