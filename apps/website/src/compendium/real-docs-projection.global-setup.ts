/**
 * Projects the real registered docs corpus once per vitest run, for every test
 * file in the `compendium-corpus` project.
 *
 * Those files only read the projection (index.json plus the lazy artifacts
 * beside it); before this setup each one re-ran the same whole-corpus
 * projection in its own worker (sk-jay0.7.164.34). Files that project a
 * changed corpus still call `projectMetadataDocsIndex` themselves.
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { TestProject } from "vitest/node";
import { type MarkdownDocsRoot, projectMarkdownDocsPage } from "./project-authoring-docs";
import { type DocsProjectionRoot, projectMetadataDocsIndex } from "./project-metadata-docs";

let outputRoot = "";

export default async function setup(project: TestProject): Promise<() => void> {
	outputRoot = mkdtempSync(join(tmpdir(), "spellkave-real-docs-projection-"));
	const registry = (await import(
		pathToFileURL(resolve(import.meta.dirname, "../../scripts/metadata-docs-registry.mts")).href
	)) as {
		DOCS_PROJECTION_ROOTS: readonly DocsProjectionRoot[];
		MARKDOWN_DOCS_ROOTS: readonly MarkdownDocsRoot[];
	};
	projectMetadataDocsIndex(registry.DOCS_PROJECTION_ROOTS, join(outputRoot, "index.json"));
	// Both real-content suites read these same immutable Markdown artifacts.
	// Render each registered root once, including the expensive guidance corpus.
	const markdown = registry.MARKDOWN_DOCS_ROOTS.map((root) =>
		projectMarkdownDocsPage(root, outputRoot),
	);
	writeFileSync(join(outputRoot, "markdown-pages.json"), JSON.stringify(markdown));
	project.provide("realDocsProjectionRoot", outputRoot);
	return () => {
		if (outputRoot) rmSync(outputRoot, { recursive: true, force: true });
	};
}

declare module "vitest" {
	export interface ProvidedContext {
		realDocsProjectionRoot: string;
	}
}
