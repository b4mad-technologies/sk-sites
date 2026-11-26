import { mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type { DocsMetadata } from "@spellkave/tool-contracts";
import { renderDocsMarkdown } from "./docs-markdown";
import type {
	DocsArticle,
	DocsDocumentSummary,
	DocsIndexV1,
	DocsNavGroup,
	DocsPage,
	DocsSearchEntry,
} from "./docs-types";
import { buildDocsSearchIndex } from "./project-metadata-docs";

/**
 * A documentation root that is NOT a bundle manifest (`DocsProjectionRoot` in
 * `project-metadata-docs.ts`): a plain directory of Markdown files, published
 * verbatim. The world-author pattern catalog (sk-jay0.3.5.80) was the first
 * root — "never copy, always reference" (the owner ruling that
 * retired the SRD bundle's own copy, `packages/spellkave-srd-cc/fixtures/
 * base/authoring-patterns/`).
 *
 * This is deliberately a SIBLING projector, not a new kind of
 * `DocsProjectionRoot`: it shares the `DocsIndexV1`/`DocsPage` shape (so the
 * existing router, sidebar, and reader components need no changes) and the
 * shared `docs-markdown.ts` rendering pipeline, but has no manifest, no
 * catalogue, no technical basin, and no delivery witness — none of those
 * concepts apply to a folder of authored Markdown. `project-metadata-docs.ts`
 * (the manifest projector) is read here only for its already-generic
 * `buildDocsSearchIndex` helper; it is never imported for its
 * manifest-reading machinery.
 *
 * Every editorial decision (page id/title/nav group, section id/title/intro,
 * the document `family`/`ref` prefix, which document supplies the page
 * intro) is an authored field here, never a constant in this module — owner
 * rule: editorial decisions are authored data, not code. The registry
 * (`scripts/metadata-docs-registry.mts`) is the one place that authors them.
 */
export interface MarkdownDocsRoot {
	/** Explicit planning/historical reference page, excluded from supported search. */
	includeUnsupported?: boolean;
	publishedSources?: ReadonlyMap<string, string>;
	/** Generated package corpus projection, supplied at build time. */
	documents?: readonly {
		id: string;
		slug: string;
		title: string;
		body: string;
		sourcePath: string;
		metadata: DocsMetadata;
	}[];
	/** Directory holding one Markdown file per document, flat, no subdirectories. */
	sourceDir: string;
	/**
	 * Repo-relative label for `sourceDir`, used for `DocsSource.path` and to
	 * resolve every relative link inside these files (pattern-to-pattern and
	 * out-of-catalog alike) — kept separate from the real filesystem
	 * `sourceDir` so this module never assumes it runs from a checkout at a
	 * fixed depth.
	 */
	sourceLabel: string;
	/** Public route id; also the default mount `/docs/<pageId>`. */
	pageId: string;
	/** Reader-facing page title. */
	title: string;
	/** Sidebar group this page's link is filed under (`CompendiumSidebar.svelte`). */
	navGroup: DocsNavGroup;
	/** Public mount below `/docs`; defaults to `/docs/<pageId>`. */
	mount?: string;
	/**
	 * Absolute HTTPS base a relative link outside the published set resolves
	 * against (`docs-markdown.ts`'s own `sourceBase` resolution — the same
	 * mechanism a manifest-authored `source_base` drives). Authored by the
	 * registry, never a literal here: this module stays free of any
	 * particular external host, same posture the manifest-driven projector
	 * keeps by reading `source_base` off authored metadata instead of a
	 * constant (`no-github.test.ts` guards the on-site half of that rule).
	 */
	sourceBase: string;
	/** The one section every document is published under. */
	section: { id: string; title: string; intro: string };
	/** `document.family`, and the `<refFamily>/<slug>` half of each `document.ref`. */
	refFamily: string;
	/** `document.ref` is `<pageId>/<refFamily>/<slug>`; overrides the default prefix when set. */
	refPrefix?: string;
	/** Slug of the document whose first prose paragraph becomes `page.intro`. */
	introDocumentSlug: string;
}

interface ParsedPatternDoc {
	metadata?: DocsMetadata;
	id: string;
	slug: string;
	title: string;
	body: string;
	/** Repo-relative path, matching the convention every other docs source uses. */
	sourcePath: string;
}

/** Every reader-facing field the H1 heading and body of one pattern file supplies. */
function parsePatternFile(root: MarkdownDocsRoot, name: string): ParsedPatternDoc {
	const slug = name.slice(0, -".md".length);
	const raw = readFileSync(join(root.sourceDir, name), "utf8");
	const heading = /^# ([^\n]+)\r?\n(?:\r?\n)?/.exec(raw);
	if (heading?.[1] === undefined) {
		throw new Error(`authoring docs: pattern '${name}' has no H1 title.`);
	}
	return {
		id: slug,
		slug,
		title: heading[1],
		body: raw.slice(heading[0].length).replace(/\r?\n+$/u, ""),
		sourcePath: `${root.sourceLabel}/${name}`,
	};
}

/** The page intro: the first prose paragraph of the authored intro document, plain text, capped. */
function introFromDocument(root: MarkdownDocsRoot, body: string): string {
	const paragraph = body
		.replace(/^# [^\n]+\r?\n\s*/, "")
		.split(/\r?\n\r?\n/u)[0]
		?.replace(/\s+/gu, " ")
		.trim();
	if (!paragraph) {
		throw new Error(
			`authoring docs: intro document '${root.introDocumentSlug}' has no intro paragraph.`,
		);
	}
	return paragraph.slice(0, 600);
}

function atomicWrite(target: string, content: string): void {
	mkdirSync(resolve(target, ".."), { recursive: true });
	const temporary = `${target}.tmp-${process.pid}`;
	writeFileSync(temporary, content, "utf8");
	renameSync(temporary, target);
}

/**
 * Project one Markdown-backed documentation page: parse every `*.md` file in
 * `root.sourceDir` into a document, resolve pattern-to-pattern links to their
 * own published routes (same-page `publishedSources`, exactly the mechanism
 * `project-metadata-docs.ts` uses for a manifest-backed page), and resolve
 * every other relative link to its GitHub blob URL via `source_base` — the
 * same behavior the retired SRD-bundle copy served on the live website.
 *
 * Writes one lazy document artifact per pattern under
 * `<outputRoot>/documents/<page_id>/<section_id>/<id>.json` and returns the
 * compact `DocsPage` (for `index.json`) plus this page's own search rows
 * (for `search.json`) — both merged into the shared projection by the caller.
 */
export function projectMarkdownDocsPage(
	root: MarkdownDocsRoot,
	outputRoot: string,
): { page: DocsPage; search: DocsSearchEntry[] } {
	const mount = root.mount ?? `/docs/${root.pageId}`;
	const refPrefix = root.refPrefix ?? `${root.pageId}/${root.refFamily}/`;
	const names = (root.documents ? [] : readdirSync(root.sourceDir))
		.filter((name) => name.endsWith(".md"))
		.sort((left, right) => left.localeCompare(right));
	const patterns: ParsedPatternDoc[] = root.documents
		? [...root.documents]
		: names.map((name) => parsePatternFile(root, name));
	if (new Set(patterns.map((doc) => doc.slug)).size !== patterns.length)
		throw new Error("Duplicate public document route");
	const introPattern = patterns.find((pattern) => pattern.slug === root.introDocumentSlug);
	if (introPattern === undefined) {
		throw new Error(`authoring docs: expected an intro document '${root.introDocumentSlug}.md'.`);
	}
	const sectionHref = `${mount}/${root.section.id}`;
	const publishedSources = new Map<string, string>(
		patterns.map((pattern) => [
			pattern.sourcePath,
			`${sectionHref}/${encodeURIComponent(pattern.slug)}`,
		]),
	);
	for (const [source, href] of root.publishedSources ?? []) publishedSources.set(source, href);
	const documentArtifactDir = resolve(outputRoot, "documents", root.pageId, root.section.id);
	const documentSummaries: DocsDocumentSummary[] = [];
	const richDocuments: Array<
		DocsArticle & { href: string; ref: string; slug: string; family: string }
	> = [];
	for (const pattern of patterns) {
		const ref = `${refPrefix}${pattern.slug}`;
		const href = `${sectionHref}/${encodeURIComponent(pattern.slug)}`;
		const artifactHref = `/compendium/docs/documents/${root.pageId}/${root.section.id}/${encodeURIComponent(pattern.id)}.json`;
		const renderBody = pattern.sourcePath.endsWith(".toml")
			? `\`\`\`toml\n${pattern.body}\n\`\`\``
			: pattern.body;
		const blocks = renderDocsMarkdown(renderBody, {
			directives: false,
			sourcePath: pattern.sourcePath,
			sourceBase: root.sourceBase,
			publishedSources,
			self: { kind: "document", ref },
		});
		const document: DocsArticle & { href: string; ref: string; slug: string; family: string } = {
			...(pattern.metadata ? { guidance: pattern.metadata } : {}),
			id: pattern.id,
			title: pattern.title,
			href,
			artifact_href: artifactHref,
			body: pattern.body,
			source: {
				path: pattern.sourcePath,
				anchor: pattern.title,
				license: "LicenseRef-Spellkave-Proprietary",
			},
			blocks,
			ref,
			slug: pattern.slug,
			family: root.refFamily,
		};
		atomicWrite(
			resolve(documentArtifactDir, `${encodeURIComponent(pattern.id)}.json`),
			`${JSON.stringify(document, null, 2)}\n`,
		);
		const supported = !pattern.metadata || pattern.metadata.content_status === "implemented";
		if (supported) richDocuments.push(document);
		if (!supported && !root.includeUnsupported) continue;
		const { body: _body, source: _source, blocks: _blocks, ...compact } = document;
		documentSummaries.push(compact);
	}
	const page: DocsPage = {
		page_id: root.pageId,
		title: root.title,
		intro: introFromDocument(root, introPattern.body),
		nav_group: root.navGroup,
		source_base: root.sourceBase,
		href: mount,
		sections: [
			{
				id: root.section.id,
				title: root.section.title,
				intro: root.section.intro,
				href: sectionHref,
				documents: documentSummaries,
			},
		],
	};
	const richIndex: DocsIndexV1 = {
		version: 1,
		pages: [
			{
				...page,
				sections: [
					{
						id: root.section.id,
						title: root.section.title,
						intro: root.section.intro,
						href: sectionHref,
						documents: richDocuments,
					},
				],
			},
		],
	};
	return { page, search: buildDocsSearchIndex(richIndex) };
}

/**
 * Fold every `MarkdownDocsRoot`'s page into an already-projected
 * `index.json`/`search.json` (written by `projectMetadataDocsIndex`), in
 * place. Deliberately a second pass over the SAME artifacts rather than a
 * parameter threaded into the manifest projector: the two projectors do not
 * share a root type, and merging their OUTPUT keeps them independently
 * testable and independently owned.
 */
export function mergeMarkdownDocsRoots(
	indexPath: string,
	roots: readonly MarkdownDocsRoot[],
): DocsIndexV1 {
	const outputRoot = dirname(indexPath);
	const searchPath = resolve(outputRoot, "search.json");
	const index = JSON.parse(readFileSync(indexPath, "utf8")) as DocsIndexV1;
	const search = JSON.parse(readFileSync(searchPath, "utf8")) as DocsSearchEntry[];
	const pageIds = new Set(index.pages.map((page) => page.page_id));
	const mergedPages = [...index.pages];
	const mergedSearch = [...search];
	for (const root of roots) {
		const { page, search: rows } = projectMarkdownDocsPage(root, outputRoot);
		if (pageIds.has(page.page_id)) {
			throw new Error(
				`authoring docs: page id '${page.page_id}' collides with a manifest-backed page`,
			);
		}
		pageIds.add(page.page_id);
		mergedPages.push(page);
		mergedSearch.push(...rows);
	}
	const merged: DocsIndexV1 = { ...index, pages: mergedPages };
	atomicWrite(indexPath, `${JSON.stringify(merged, null, 2)}\n`);
	atomicWrite(searchPath, `${JSON.stringify(mergedSearch, null, 2)}\n`);
	return merged;
}
