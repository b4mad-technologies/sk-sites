import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { DocsArticle, DocsIndexV1, DocsSearchEntry } from "./docs-types";
import {
	type MarkdownDocsRoot,
	mergeMarkdownDocsRoots,
	projectMarkdownDocsPage,
} from "./project-authoring-docs";

import { realMarkdownDocsProjection } from "./real-docs-projection";

const SOURCE_BASE = "https://example.invalid/repo/blob/main/";

describe("Markdown-backed documentation root (sk-jay0.3.5.80)", () => {
	let sourceDir = "";
	let outputRoot = "";

	beforeEach(() => {
		sourceDir = mkdtempSync(join(tmpdir(), "spellkave-authoring-docs-source-"));
		outputRoot = mkdtempSync(join(tmpdir(), "spellkave-authoring-docs-output-"));
		writeFileSync(
			join(sourceDir, "index.md"),
			"# Pattern index\n\nA short intro paragraph.\n\nMore prose that is not the intro.\n\n- [`alpha`](./alpha.md)\n",
		);
		writeFileSync(
			join(sourceDir, "alpha.md"),
			"# Alpha pattern\n\nLinks to [beta](./beta.md) and to [an unrelated doc](../other.md).\n",
		);
		writeFileSync(join(sourceDir, "beta.md"), "# Beta pattern\n\nNo outbound links.\n");
	});

	afterEach(() => {
		rmSync(sourceDir, { recursive: true, force: true });
		rmSync(outputRoot, { recursive: true, force: true });
	});

	function root(): MarkdownDocsRoot {
		return {
			sourceDir,
			sourceLabel: "fixtures/patterns",
			sourceBase: SOURCE_BASE,
			pageId: "authoring",
			title: "Authoring Patterns",
			navGroup: "reference",
			introDocumentSlug: "index",
			refFamily: "pattern",
			section: { id: "patterns", title: "Patterns", intro: "Test patterns." },
		};
	}

	it("projects one document per Markdown file, slugged from the filename", () => {
		const { page } = projectMarkdownDocsPage(root(), outputRoot);
		expect(page.page_id).toBe("authoring");
		expect(page.href).toBe("/docs/authoring");
		expect(page.intro).toBe("A short intro paragraph.");
		expect(page.sections).toHaveLength(1);
		const documents = page.sections[0]?.documents ?? [];
		expect(documents.map((document) => document.slug).sort()).toEqual(["alpha", "beta", "index"]);
		for (const document of documents) {
			expect(document.href).toBe(`/docs/authoring/patterns/${document.slug}`);
			expect(document.ref).toBe(`authoring/pattern/${document.slug}`);
		}
	});

	it("resolves a pattern-to-pattern link to its own published route, and an out-of-catalog link to the source base", () => {
		projectMarkdownDocsPage(root(), outputRoot);
		const alpha = JSON.parse(
			readFileSync(resolve(outputRoot, "documents/authoring/patterns/alpha.json"), "utf8"),
		) as DocsArticle;
		const html = alpha.blocks
			?.filter((block) => block.kind === "html")
			.map((block) => block.html)
			.join("\n");
		expect(html).toContain('href="/docs/authoring/patterns/beta"');
		expect(html).toContain(`href="${SOURCE_BASE}fixtures/other.md"`);
	});

	it("returns one search row per document", () => {
		const { search } = projectMarkdownDocsPage(root(), outputRoot);
		expect(search.map((row: DocsSearchEntry) => row.ref).sort()).toEqual([
			"authoring/pattern/alpha",
			"authoring/pattern/beta",
			"authoring/pattern/index",
		]);
	});

	it("merges into an existing projected index.json and search.json without disturbing manifest-backed pages", () => {
		const baseIndex: DocsIndexV1 = {
			version: 1,
			pages: [
				{
					page_id: "srd",
					title: "SRD",
					intro: "",
					nav_group: "reference",
					href: "/docs/srd",
					sections: [],
				},
			],
		};
		const baseSearch: DocsSearchEntry[] = [];
		writeFileSync(resolve(outputRoot, "index.json"), JSON.stringify(baseIndex));
		writeFileSync(resolve(outputRoot, "search.json"), JSON.stringify(baseSearch));
		const merged = mergeMarkdownDocsRoots(resolve(outputRoot, "index.json"), [root()]);
		expect(merged.pages.map((page) => page.page_id)).toEqual(["srd", "authoring"]);
		const rewrittenSearch = JSON.parse(
			readFileSync(resolve(outputRoot, "search.json"), "utf8"),
		) as DocsSearchEntry[];
		expect(rewrittenSearch).toHaveLength(3);
	});

	it("rejects a page id that collides with an already-projected manifest page", () => {
		const baseIndex: DocsIndexV1 = {
			version: 1,
			pages: [
				{
					page_id: "authoring",
					title: "Collides",
					intro: "",
					nav_group: "reference",
					href: "/docs/authoring",
					sections: [],
				},
			],
		};
		writeFileSync(resolve(outputRoot, "index.json"), JSON.stringify(baseIndex));
		writeFileSync(resolve(outputRoot, "search.json"), JSON.stringify([]));
		expect(() => mergeMarkdownDocsRoots(resolve(outputRoot, "index.json"), [root()])).toThrow(
			/collides/,
		);
	});
});

describe("the registered root, real content (sk-jay0.3.5.80 acceptance)", () => {
	it("publishes every *.md file in the source dir, each with a title/body, and no dangling pattern-to-pattern link", async () => {
		const registry = (await import(
			pathToFileURL(resolve(import.meta.dirname, "../../scripts/metadata-docs-registry.mts")).href
		)) as { MARKDOWN_DOCS_ROOTS: readonly MarkdownDocsRoot[] };
		const root = registry.MARKDOWN_DOCS_ROOTS.find((candidate) => candidate.pageId === "authoring");
		expect(root).toBeDefined();
		if (!root) throw new Error("unreachable");
		// Derived from the real directory listing, never the literal count —
		// this test still catches a missing/extra file if the corpus changes.
		const expectedSlugs = readdirSync(root.sourceDir)
			.filter((name) => name.endsWith(".md"))
			.map((name) => name.slice(0, -".md".length))
			.sort();
		expect(expectedSlugs.length).toBeGreaterThan(0);
		const { page, outputRoot: tmp } = realMarkdownDocsProjection(root.pageId);
		const documents = page.sections[0]?.documents ?? [];
		expect(documents.map((document) => document.slug).sort()).toEqual(expectedSlugs);
		const publishedHrefs = new Set(documents.map((document) => document.href));
		const insidePrefix = `${page.href}/`;
		for (const document of documents) {
			expect(document.title.trim().length).toBeGreaterThan(0);
			const artifact = JSON.parse(
				readFileSync(
					resolve(
						tmp,
						"documents",
						root.pageId,
						root.section.id,
						`${encodeURIComponent(document.id)}.json`,
					),
					"utf8",
				),
			) as DocsArticle;
			expect(artifact.body.trim().length).toBeGreaterThan(0);
			const html = (artifact.blocks ?? [])
				.filter((block) => block.kind === "html")
				.map((block) => block.html)
				.join("\n");
			for (const match of html.matchAll(/href="([^"]+)"/g)) {
				const href = match[1];
				if (href?.startsWith(insidePrefix)) {
					expect(
						publishedHrefs.has(href),
						`'${document.slug}' links to '${href}', which no published document resolves to`,
					).toBe(true);
				}
			}
		}
	}, 30_000);
});
