import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
	catalogueIdentities,
	rowCompositeColumns,
	rowIdentityColumns,
} from "@spellkave/srd-cc/docs/row-kind-coverage";
import { ROW_KIND_COMPOSITE_KEY, ROW_KIND_NATURAL_KEY } from "@spellkave/world-author";
import { render } from "@testing-library/svelte";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import DocsPageOverview from "./DocsPageOverview.svelte";
import { measureDelivery } from "./delivery";
import { validateProjectedDocsCoverage } from "./docs-coverage-validator";
import type { DocsFacet, DocsIndexV1 } from "./docs-types";
import { buildTechnicalDocsProjection, projectMetadataDocsIndex } from "./project-metadata-docs";

// Unlike Aldwin's NPC key, this synthetic identity occurs nowhere in public content.
const privateSubject = "af34c972e0156b8d".repeat(4);
const website = resolve(import.meta.dirname, "../..");
let scratch = "";
let publicRoot = "";
let index: DocsIndexV1;
let full: ReturnType<typeof buildTechnicalDocsProjection>;

function bindingFacet(value: DocsIndexV1): DocsFacet {
	const facet = value.pages[0]?.bundle?.facets.find((item) => item.table === "role_bindings");
	if (!facet) throw new Error("binding bundle facet missing");
	return facet;
}

function allFiles(root: string): string[] {
	return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
		const path = join(root, entry.name);
		return entry.isDirectory() ? allFiles(path) : [path];
	});
}

beforeAll(() => {
	scratch = mkdtempSync(join(tmpdir(), "role-binding-public-output-"));
	publicRoot = join(scratch, "public", "compendium", "docs");
	const manifest = join(scratch, "manifest.toml");
	writeFileSync(
		manifest,
		`#:schema https://spellkave.dev/schema/world-manifest-1.0.0.json
schema_version = "1.0.0"
[[bundles]]
bundle_id = "privacy"
display_name = "Privacy"
author = "test"
version = "1.0.0"
depends_on = []
[[role_bindings]]
binding_id = "privacy/private-binding"
bundle_id = "privacy"
subject = "${privateSubject}"
role_id = "dm"
extent_kind_ref = "place_graph"
extent_ref = "privacy/region"
description = "Build-time authority configuration"
[metadata.docs]
version = 1
page_id = "privacy"
title = "Privacy"
nav_group = "reference"
intro = "Public authority scopes."
[[metadata.docs.sections]]
id = "overview"
title = "Overview"
intro = "Bundle configuration."
`,
	);
	const roots = [{ rootManifestPath: manifest }];
	// Simulate an earlier generator's private artifact, including an obsolete
	// source not referenced by this projection. Both files must stop shipping.
	for (const source of ["privacy", "retired-source"]) {
		const oldRoot = join(publicRoot, "technical", source);
		mkdirSync(oldRoot, { recursive: true });
		writeFileSync(join(oldRoot, "role_bindings.json"), JSON.stringify({ subject: privateSubject }));
	}
	index = projectMetadataDocsIndex(roots, join(publicRoot, "index.json"));
	full = buildTechnicalDocsProjection(roots);
	const delivery = measureDelivery(
		Object.fromEntries(full.tables.get("privacy") ?? []),
		index,
		publicRoot,
		{
			natural: rowIdentityColumns(ROW_KIND_NATURAL_KEY),
			composite: rowCompositeColumns(ROW_KIND_COMPOSITE_KEY),
		},
		catalogueIdentities(ROW_KIND_NATURAL_KEY),
	);
	writeFileSync(join(publicRoot, "delivery-report.json"), JSON.stringify(delivery));
	writeFileSync(
		join(publicRoot, "compendium-census.json"),
		JSON.stringify({
			manifest_rows: delivery.authored,
			docs_coverage: validateProjectedDocsCoverage(index, publicRoot, full),
		}),
	);
});

afterAll(() => {
	if (scratch) rmSync(scratch, { recursive: true, force: true });
});

describe("public role-binding projection", () => {
	it("renders the fixture binding scope without its private principal", () => {
		const page = index.pages[0];
		if (!page) throw new Error("fixture bundle page missing");
		const { container } = render(DocsPageOverview, { page });
		const text = container.textContent ?? "";
		for (const field of ["role_id", "extent_kind_ref", "extent_ref", "bundle_id"]) {
			expect(text).toContain(field);
		}
		for (const value of ["dm", "place_graph", "privacy/region", "privacy"]) {
			expect(text).toContain(value);
		}
		expect(container.innerHTML).not.toContain(privateSubject);
		expect(text).not.toContain("subject");
		expect(text).not.toContain("binding_id");
		expect(text).not.toContain("Build-time authority configuration");
	});

	it("measures the redacted row against its private build-time source", () => {
		expect(full.tables.get("privacy")?.get("role_bindings")?.[0]?.subject).toBe(privateSubject);
		expect(bindingFacet(index).rows).toEqual([
			{
				role_id: "dm",
				extent_kind_ref: "place_graph",
				extent_ref: "privacy/region",
				bundle_id: "privacy",
			},
		]);
		expect(bindingFacet(index).source_digests).toEqual([expect.stringMatching(/^[0-9a-f]{64}$/)]);
		expect(validateProjectedDocsCoverage(index, publicRoot, full).diagnostics).toEqual([]);
	});

	it.each([
		"tamper",
		"duplicate",
		"missing",
		"private-field",
	])("refuses %s even when a source digest is present", (mutation) => {
		const changed = structuredClone(index);
		const facet = bindingFacet(changed);
		if (mutation === "tamper") facet.rows[0]!.extent_ref = "privacy/wider";
		if (mutation === "duplicate") {
			facet.rows.push({ ...facet.rows[0] });
			facet.source_digests!.push(facet.source_digests![0]!);
		}
		if (mutation === "missing") {
			facet.rows = [];
			facet.source_digests = [];
		}
		if (mutation === "private-field") facet.rows[0]!.subject = privateSubject;
		expect(
			validateProjectedDocsCoverage(changed, publicRoot, full).diagnostics.length,
		).toBeGreaterThan(0);
	});

	it("retains private build-time filtering but refuses public raw technical fallback", () => {
		const manifest = join(scratch, "uncovered.toml");
		writeFileSync(
			manifest,
			// An unmatched bundle owner leaves this row out of all public facets.
			readFileSync(join(scratch, "manifest.toml"), "utf8").replace(
				'bundle_id = "privacy"\nsubject',
				'bundle_id = "uncovered"\nsubject',
			),
		);
		const roots = [{ rootManifestPath: manifest }];
		expect(
			buildTechnicalDocsProjection(roots, new Set())
				.tables.get("privacy")
				?.get("role_bindings")?.[0]?.subject,
		).toBe(privateSubject);
		const output = join(scratch, "uncovered-public", "index.json");
		expect(() => projectMetadataDocsIndex(roots, output)).toThrow(
			/raw technical fallback is forbidden/,
		);
		expect(
			allFiles(join(scratch, "uncovered-public")).filter((path) =>
				readFileSync(path).includes(Buffer.from(privateSubject)),
			),
		).toEqual([]);
	});

	it("rejects a raw technical artifact even when it matches the full authored source", () => {
		const changed = structuredClone(index);
		const source = changed.technical_sources?.find((item) => item.source_id === "privacy");
		if (!source) throw new Error("technical source summary missing");
		const dir = join(publicRoot, "technical", "privacy");
		const path = join(dir, "role_bindings.json");
		mkdirSync(dir, { recursive: true });
		writeFileSync(
			path,
			JSON.stringify({
				version: 1,
				source_id: "privacy",
				table: "role_bindings",
				bundle_ids: ["privacy"],
				rows: full.tables.get("privacy")?.get("role_bindings"),
			}),
		);
		source.tables.push({
			table: "role_bindings",
			count: 1,
			href: "/compendium/docs/technical/privacy/role_bindings.json",
		});
		source.row_count += 1;
		try {
			expect(validateProjectedDocsCoverage(changed, publicRoot, full).diagnostics).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						message: "raw technical fallback for redacted rows is forbidden",
					}),
				]),
			);
		} finally {
			rmSync(path);
		}
	});

	it("builds the site with sourcemaps and finds zero private-subject hits in its entire output", () => {
		const config = join(scratch, "privacy-build.config.mts");
		writeFileSync(
			config,
			`import base from ${JSON.stringify(join(website, "vite.config.ts"))};
export default async env => ({ ...(typeof base === "function" ? await base(env) : await base), publicDir: ${JSON.stringify(join(scratch, "public"))} });\n`,
		);
		const output = join(scratch, "dist");
		const build = spawnSync(
			"pnpm",
			[
				"exec",
				"vite",
				"build",
				"--config",
				config,
				"--outDir",
				output,
				"--emptyOutDir",
				"--sourcemap",
			],
			{
				cwd: website,
				// A production build needs the login site origin (requireLoginOrigin).
				env: {
					...process.env,
					VITEST: "true",
					VITE_SPELLKAVE_LOGIN_ORIGIN: "https://login.spellkave.com",
				},
				timeout: 60_000,
				encoding: "utf8",
				maxBuffer: 4 * 1024 * 1024,
			},
		);
		expect(build.error, build.stderr).toBeUndefined();
		expect(build.status, build.stderr).toBe(0);
		const files = allFiles(output);
		expect(files.some((path) => path.endsWith(".html"))).toBe(true);
		expect(files.some((path) => path.endsWith(".map"))).toBe(true);
		expect(files.some((path) => path.endsWith("/search.json"))).toBe(true);
		expect(files.some((path) => path.endsWith("/delivery-report.json"))).toBe(true);
		expect(files.some((path) => path.endsWith("/compendium-census.json"))).toBe(true);
		expect(
			files.filter((path) => readFileSync(path).includes(Buffer.from(privateSubject))),
		).toEqual([]);
	}, 75_000);
});
