/**
 * Hands a test file the real docs corpus projection that
 * `real-docs-projection.global-setup.ts` wrote once for the whole vitest run.
 *
 * The output directory is shared by every file in the `compendium-corpus`
 * project: read from it, never write into it.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { inject } from "vitest";
import type { DocsIndexV1, DocsPage, DocsSearchEntry } from "./docs-types";

function sharedOutputRoot(): string {
	const outputRoot = inject("realDocsProjectionRoot");
	if (!outputRoot)
		throw new Error(
			"no shared docs projection: run this file in the website `compendium-corpus` vitest project",
		);
	return outputRoot;
}

export function realDocsProjection(): { index: DocsIndexV1; outputRoot: string } {
	const outputRoot = sharedOutputRoot();
	const index = JSON.parse(readFileSync(join(outputRoot, "index.json"), "utf8")) as DocsIndexV1;
	return { index, outputRoot };
}

/** Registered Markdown roots rendered once beside the shared manifest projection. */
export function realMarkdownDocsProjection(pageId: string): {
	page: DocsPage;
	search: DocsSearchEntry[];
	outputRoot: string;
} {
	const outputRoot = sharedOutputRoot();
	const pages = JSON.parse(readFileSync(join(outputRoot, "markdown-pages.json"), "utf8")) as Array<{
		page: DocsPage;
		search: DocsSearchEntry[];
	}>;
	const result = pages.find(({ page }) => page.page_id === pageId);
	if (!result) throw new Error(`Missing shared Markdown projection: ${pageId}`);
	return { ...result, outputRoot };
}
