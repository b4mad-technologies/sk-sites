import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { validateMetadataDocs } from "./metadata-docs-validator";

let root = "";
afterEach(() => {
	if (root) rmSync(root, { recursive: true, force: true });
	root = "";
});

function manifest(
	metadata: string,
	attachment = "",
	bundleId = "sample",
	dependencies = "",
): string {
	return `#:schema https://spellkave.dev/schema/world-manifest-1.0.0.json
schema_version = "1.0.0"
[[bundles]]
bundle_id = "${bundleId}"
display_name = "Sample"
author = "test"
version = "1.0.0"
depends_on = [${dependencies}]
description = "Sample"
${metadata}
${attachment}`;
}

function write(text: string): string {
	root = mkdtempSync(join(tmpdir(), "website-metadata-docs-"));
	mkdirSync(root, { recursive: true });
	const path = join(root, "manifest.toml");
	writeFileSync(path, text, "utf8");
	return path;
}

const validMetadata = `[metadata.docs]
version = 1
page_id = "sample"
title = "Sample reference"
nav_group = "reference"
intro = "Hello"
[[metadata.docs.sections]]
id = "rules"
title = "Rules"
intro = "Core rules"`;

describe("metadata docs convention", () => {
	it("accepts a valid page and entry attachment", () => {
		const path = write(
			manifest(
				validMetadata,
				`
[[metadata_attachments]]
bundle_id = "sample"
namespace = "sample.docs.entry"
target_kind = "entity_definition"
target_ref = "sample/example"
payload_json = '{"page_id":"sample","section_id":"rules"}'
`,
			),
		);
		expect(validateMetadataDocs({ rootManifestPath: path })).toEqual([]);
	});

	it("rejects a metadata typo even without attachments", () => {
		const path = write(manifest(validMetadata.replace("title =", "titel =")));
		expect(validateMetadataDocs({ rootManifestPath: path })).toEqual(
			expect.arrayContaining([expect.objectContaining({ message: "unknown key 'titel'" })]),
		);
	});

	it("rejects an entry that names a missing section", () => {
		const path = write(
			manifest(
				validMetadata,
				`
[[metadata_attachments]]
bundle_id = "sample"
namespace = "sample.docs.entry"
target_kind = "entity_definition"
target_ref = "sample/example"
payload_json = '{"page_id":"sample","section_id":"spells"}'
`,
			),
		);
		expect(validateMetadataDocs({ rootManifestPath: path })).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ message: expect.stringContaining("does not exist") }),
			]),
		);
	});

	it("accepts unrelated structured metadata when docs are absent", () => {
		const path = write(manifest('[metadata]\neditor = { theme = "dark" }'));
		expect(validateMetadataDocs({ rootManifestPath: path })).toEqual([]);
	});

	it("rejects wrong versions, section keys, and duplicate section ids", () => {
		const invalid = `${validMetadata.replace("version = 1", 'version = "1"').replace('intro = "Core rules"', 'intro = "Core rules"\ntypo = true')}
[[metadata.docs.sections]]
id = "rules"
title = "Again"
intro = "Again"`;
		const diagnostics = validateMetadataDocs({ rootManifestPath: write(manifest(invalid)) });
		expect(diagnostics.some((row) => row.message.includes("must be equal to constant"))).toBe(true);
		expect(diagnostics.some((row) => row.message === "unknown key 'typo'")).toBe(true);
		const duplicateSections = `${validMetadata}
[[metadata.docs.sections]]
id = "rules"
title = "Again"
intro = "Again"`;
		expect(
			validateMetadataDocs({ rootManifestPath: write(manifest(duplicateSections)) }).some((row) =>
				row.message.includes("duplicate section id"),
			),
		).toBe(true);
	});

	it("validates articles without relying on the route projector", () => {
		const invalidPages = `${validMetadata}
[[metadata.docs.sections.pages]]
id = "../unsafe"
title = "Unsafe"
body = "Body"
source = { path = "rules.md", anchor = "Unsafe", license = "CC-BY-4.0" }
[[metadata.docs.sections.pages]]
id = "../unsafe"
title = "Duplicate"
body = "Body"
source = { path = "rules.md", anchor = "Duplicate", license = "CC-BY-4.0" }`;
		const diagnostics = validateMetadataDocs({ rootManifestPath: write(manifest(invalidPages)) });
		expect(diagnostics.some((row) => row.message.includes("pattern"))).toBe(true);
		const duplicatePages = invalidPages.replaceAll("../unsafe", "safe-page");
		expect(
			validateMetadataDocs({ rootManifestPath: write(manifest(duplicatePages)) }).some((row) =>
				row.message.includes("duplicate page id"),
			),
		).toBe(true);
	});

	it("rejects malformed payloads, missing pages, wrong pages, and namespace owners", () => {
		const cases = [
			[`payload_json = '{'`, "valid JSON"],
			[`payload_json = '{"page_id":"other","section_id":"rules"}'`, "does not match"],
			[
				`namespace = "other.docs.entry"\npayload_json = '{"page_id":"sample","section_id":"rules"}'`,
				"prefixed",
			],
		] as const;
		for (const [body, message] of cases) {
			const attachment = `
[[metadata_attachments]]
bundle_id = "sample"
${body.startsWith("namespace") ? body : `namespace = "sample.docs.entry"\n${body}`}
target_kind = "entity_definition"
target_ref = "sample/example"`;
			const diagnostics = validateMetadataDocs({
				rootManifestPath: write(manifest(validMetadata, attachment)),
			});
			expect(diagnostics.some((row) => row.message.includes(message))).toBe(true);
		}
		const noPage = write(
			manifest(
				"",
				`
[[metadata_attachments]]
bundle_id = "sample"
namespace = "sample.docs.entry"
target_kind = "entity_definition"
target_ref = "sample/example"
payload_json = '{"page_id":"sample","section_id":"rules"}'`,
			),
		);
		expect(
			validateMetadataDocs({ rootManifestPath: noPage }).some((row) =>
				row.message.includes("no docs page"),
			),
		).toBe(true);
	});

	it("resolves dependency pages and rejects duplicate page ids across sources", () => {
		root = mkdtempSync(join(tmpdir(), "website-metadata-docs-dependency-"));
		const rootDir = join(root, "root");
		const depDir = join(root, "dep");
		mkdirSync(rootDir, { recursive: true });
		mkdirSync(depDir, { recursive: true });
		const rootPath = join(rootDir, "manifest.toml");
		const depPath = join(depDir, "manifest.toml");
		writeFileSync(rootPath, manifest(validMetadata, "", "sample", '"dep"'), "utf8");
		writeFileSync(
			depPath,
			manifest(validMetadata.replace('page_id = "sample"', 'page_id = "dependency"'), "", "dep"),
			"utf8",
		);
		expect(
			validateMetadataDocs({ rootManifestPath: rootPath, dependencyPaths: { dep: depPath } }),
		).toEqual([]);
		writeFileSync(depPath, manifest(validMetadata, "", "dep"), "utf8");
		expect(
			validateMetadataDocs({ rootManifestPath: rootPath, dependencyPaths: { dep: depPath } }).some(
				(row) => row.message.includes("also declared"),
			),
		).toBe(true);
	});
});
