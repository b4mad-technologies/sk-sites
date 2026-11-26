import type { DocsIndexV1, DocsSection } from "./docs-types";
import type { CompendiumRoute, ResolvedCompendiumRoute } from "./types";

function normalizePathname(pathname: string): string {
	const noQueryOrHash = pathname.split(/[?#]/)[0] ?? "/";
	return noQueryOrHash.replace(/\/+$/, "") || "/";
}

/**
 * Retired documentation paths, rewritten to where the content lives now.
 * sk-jay0.3.5.80: the SRD bundle's `authoring-patterns` chapter (and its
 * legacy section-scoped route) moved to the non-manifest `/docs/authoring`
 * root — see `project-authoring-docs.ts`. Add an entry here, never a
 * redirect elsewhere, so every caller of `parseCompendiumPath` sees only
 * canonical paths and old links keep resolving.
 */
const LEGACY_DOCS_REDIRECTS: ReadonlyArray<readonly [RegExp, (match: RegExpExecArray) => string]> =
	[
		[
			/^\/docs\/srd\/authoring-patterns\/([a-z0-9-]+)$/,
			(match) => `/docs/authoring/patterns/${match[1]}`,
		],
		[/^\/docs\/srd\/authoring-patterns$/, () => "/docs/authoring/patterns"],
	];

function canonicalDocsPathname(path: string): string {
	for (const [pattern, target] of LEGACY_DOCS_REDIRECTS) {
		const match = pattern.exec(path);
		if (match) return target(match);
	}
	return path;
}

/** Public documentation has one namespace. Content structure comes from the projected index. */
export function parseCompendiumPath(pathname: string): CompendiumRoute | null {
	const path = canonicalDocsPathname(normalizePathname(pathname));
	if (path === "/docs") return { corpus: "docs", page: "index" };
	if (path.startsWith("/docs/")) return { corpus: "docs", page: "path", pathname: path };
	return null;
}

function decode(value: string | undefined): string | null {
	if (!value) return null;
	try {
		return decodeURIComponent(value) || null;
	} catch {
		return null;
	}
}

function resolveSectionTail(
	pageId: string,
	section: DocsSection,
	tail: string[],
): ResolvedCompendiumRoute {
	if (tail.length === 0) return { page: "section", pageId, sectionId: section.id };
	if (tail.length === 2 && tail[0] === "resource") {
		const resourceRef = decode(tail[1]);
		return resourceRef &&
			section.pages?.some((article) =>
				article.resource_routes?.some((route) => route.ref === resourceRef),
			)
			? { page: "resource", pageId, sectionId: section.id, resourceRef }
			: { page: "missing" };
	}
	if (
		tail.length === 3 &&
		tail[0] === "subject" &&
		(tail[1] === "entity_definition" || tail[1] === "entity")
	) {
		const subjectRef = decode(tail[2]);
		return subjectRef &&
			section.pages?.some((article) =>
				article.subject_routes?.some((route) => route.kind === tail[1] && route.ref === subjectRef),
			)
			? { page: "subject", pageId, sectionId: section.id, subjectKind: tail[1], subjectRef }
			: { page: "missing" };
	}
	if (tail.length === 0 || tail.some((segment) => !segment)) return { page: "missing" };
	// Single-segment routes (documents/standalone pages/resource-embedded
	// routes) stay exactly as before — none of those ever nest, so a
	// multi-segment tail can never match one.
	const slug = tail.join("/");
	if (tail.length === 1) {
		const nonCatalogueKnown =
			section.documents?.some((item) => item.slug === slug) ||
			section.pages?.some((item) => item.featured_reference === undefined && item.id === slug) ||
			section.pages?.some((item) =>
				item.resource_routes?.some((route) => route.href.endsWith(`/${slug}`)),
			);
		if (nonCatalogueKnown) return { page: "entry", pageId, sectionId: section.id, slug };
	}
	// The catalogue itself may be lazily loaded (`catalogue_href`) rather
	// than inline — `catalogue_slugs` carries just the slug strings
	// alongside the href so the resolver never needs to fetch the whole
	// catalogue (facts, descriptions, art) just to answer a routing
	// question. Falls back to an inline `catalogue` array's own slugs when
	// present (hand-built test fixtures, sk-jay0.3.5.66).
	const catalogueSlugs = section.catalogue_slugs ?? section.catalogue?.map((item) => item.slug);
	if (catalogueSlugs?.includes(slug)) return { page: "entry", pageId, sectionId: section.id, slug };
	// A slug that is a strict PREFIX of at least one known entry slug is a
	// namespace index, never a fabricated entry — this replaces the old
	// `section.catalogue_href` truthy fallback, which resolved ANY slug to
	// `entry` once a section had a lazy catalogue at all (sk-jay0.3.5.66).
	if (catalogueSlugs?.some((candidate) => candidate.startsWith(`${slug}/`)))
		return { page: "namespace", pageId, sectionId: section.id, slug };
	return { page: "missing" };
}

/** Resolve by longest authored page/section href, without corpus-specific route code. */
export function resolveCompendiumRoute(
	pathname: string,
	index: Pick<DocsIndexV1, "pages" | "technical_sources">,
): ResolvedCompendiumRoute {
	const parsed = parseCompendiumPath(pathname);
	if (!parsed) return { page: "missing" };
	if (parsed.page === "index") return { page: "index" };
	const path = parsed.pathname;
	const technical = path.slice("/docs/technical/".length).split("/").filter(Boolean);
	if (path.startsWith("/docs/technical/") && (technical.length === 1 || technical.length === 2)) {
		const bundleId = decode(technical[0]);
		if (!bundleId) return { page: "missing" };
		const source = index.technical_sources?.find((item) => item.source_id === bundleId);
		if (!source) return { page: "missing" };
		if (technical.length === 1) return { page: "technical-bundle", bundleId };
		const table = decode(technical[1]);
		return table && source.tables.some((item) => item.table === table)
			? { page: "technical-table", bundleId, table }
			: { page: "missing" };
	}
	const page = [...index.pages]
		.sort((a, b) => b.href.length - a.href.length)
		.find((candidate) => path === candidate.href || path.startsWith(`${candidate.href}/`));
	if (!page) {
		return index.pages.some((candidate) => candidate.href.startsWith(`${path}/`))
			? { page: "collection", pathname: path }
			: { page: "missing" };
	}
	if (path === page.href) return { page: "overview", pageId: page.page_id };
	const section = [...page.sections]
		.sort((a, b) => b.href.length - a.href.length)
		.find((candidate) => path === candidate.href || path.startsWith(`${candidate.href}/`));
	if (!section) return { page: "missing" };
	return resolveSectionTail(
		page.page_id,
		section,
		path.slice(section.href.length).split("/").filter(Boolean),
	);
}

export function isCompendiumPath(pathname: string): boolean {
	return parseCompendiumPath(pathname) !== null;
}

export function pushPath(path: string): void {
	window.history.pushState({}, "", path);
	window.dispatchEvent(new PopStateEvent("popstate"));
}
