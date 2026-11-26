<script lang="ts">
	import { onMount } from "svelte";
	import SiteFooter from "../components/SiteFooter.svelte";
	import CatalogueEntryPage from "./CatalogueEntryPage.svelte";
	import Compendium404 from "./Compendium404.svelte";
	import CompendiumLayout from "./CompendiumLayout.svelte";
	import DocsArticlePage from "./DocsArticlePage.svelte";
	import DocsAttributions from "./DocsAttributions.svelte";
	import DocsOverview from "./DocsOverview.svelte";
	import DocsPageOverview from "./DocsPageOverview.svelte";
	import type { DocsArticle, DocsCatalogueEntry, DocsCatalogueEntrySummary, DocsIndexV1, DocsPage, DocsResource, DocsSearchEntry, DocsSection, DocsSubject, DocsTechnicalSourceSummary, DocsTechnicalTable } from "./docs-types";
	import {
		loadDocsArticle,
		loadDocsCatalogue,
		loadDocsCatalogueEntry,
		loadDocsDocument,
		loadDocsIndex,
		loadDocsTechnicalTable,
	} from "./load";
	import { resolveCompendiumRoute } from "./parse-path";
	import ResourceView from "./ResourceView.svelte";
	import SubjectView from "./SubjectView.svelte";
	import TechnicalBundlePage from "./TechnicalBundlePage.svelte";
	import type { CompendiumRoute, ResolvedCompendiumRoute } from "./types";

	let { route, search, pathname }: { route: CompendiumRoute; search: string; pathname: string } = $props();

	let docsIndex = $state<DocsIndexV1 | null>(null);
	let docsLoad: Promise<DocsIndexV1> | null = null;
	let searchRows = $state<DocsSearchEntry[]>([]);
	let docsPage = $state<DocsPage | null>(null);
	let docsSection = $state<DocsSection | null>(null);
	let docsArticle = $state<DocsArticle | null>(null);
	let docsResource = $state<DocsResource | null>(null);
	let docsSubject = $state<DocsSubject | null>(null);
	let docsCatalogueEntry = $state<DocsCatalogueEntry | null>(null);
	let docsCatalogue = $state<DocsCatalogueEntrySummary[]>([]);
	let technicalBundle = $state<DocsTechnicalSourceSummary | null>(null);
	let technicalTable = $state<DocsTechnicalTable | null>(null);
	let collectionIndex = $state<DocsIndexV1 | null>(null);
	let collectionTitle = $state("Documentation");
	let resolvedRoute = $state<ResolvedCompendiumRoute>({ page: "missing" });
	let error = $state<string | null>(null);
	let loading = $state(true);

	function ensureDocsIndex(): Promise<DocsIndexV1> {
		if (docsIndex) return Promise.resolve(docsIndex);
		if (docsLoad) return docsLoad;
		const pending = loadDocsIndex().then((loaded) => {
			docsIndex = loaded;
			return loaded;
		});
		docsLoad = pending;
		void pending.then(
			() => {
				if (docsLoad === pending) docsLoad = null;
			},
			() => {
				if (docsLoad === pending) docsLoad = null;
			},
		);
		return pending;
	}

	/**
	 * Present when the current route should list a hierarchical namespace
	 * within a section instead of the section's normal family-grouped
	 * catalogue (sk-jay0.3.5.66) — see `groupCatalogueByNamespace` in
	 * `srd-catalogue-groups.ts`. A `namespace` route is always one (its
	 * `slug` is the prefix); a `section` route is one too, at prefix `""`,
	 * but only when that section's own catalogue actually uses
	 * slash-hierarchical slugs (detected from the loaded catalogue itself,
	 * not a hardcoded section id, so a future hierarchical section needs no
	 * change here).
	 */
	function namespacePrefixForRoute(
		current: ResolvedCompendiumRoute,
		catalogue: DocsCatalogueEntrySummary[],
	): string | null {
		if (current.page === "namespace") return current.slug;
		if (current.page === "section" && catalogue.some((entry) => entry.slug.includes("/"))) return "";
		return null;
	}

	function pageForRoute(index: DocsIndexV1, current: ResolvedCompendiumRoute): DocsPage | null {
		return "pageId" in current ? index.pages.find((page) => page.page_id === current.pageId) ?? null : null;
	}

	function sectionForRoute(page: DocsPage, current: ResolvedCompendiumRoute): DocsSection | null {
		return "sectionId" in current ? page.sections.find((section) => section.id === current.sectionId) ?? null : null;
	}

	async function articleForSubject(section: DocsSection, kind: string, ref: string): Promise<DocsArticle | null> {
		const matches = (section.pages ?? []).filter((article) =>
			article.subject_routes?.some((subject) => subject.kind === kind && subject.ref === ref),
		);
		return matches.length === 1 && matches[0]?.artifact_href ? loadDocsArticle(matches[0].artifact_href) : null;
	}

	async function articleForResource(section: DocsSection, ref: string): Promise<DocsArticle | null> {
		const matches = (section.pages ?? []).filter((article) =>
			article.resource_routes?.some((resource) => resource.ref === ref),
		);
		return matches.length === 1 && matches[0]?.artifact_href ? loadDocsArticle(matches[0].artifact_href) : null;
	}

	async function catalogueForSection(section: DocsSection): Promise<DocsCatalogueEntrySummary[]> {
		if (section.catalogue) return section.catalogue;
		return section.catalogue_href ? loadDocsCatalogue(section.catalogue_href) : [];
	}

	onMount(() => {
		// Navigation and search are independent of the active documentation route.
		// Their background failures must never replace an authored docs page with a 404.
		void ensureDocsIndex().catch(() => undefined);
	});

	$effect(() => {
		const current = route;
		const currentPathname = pathname;
		let cancelled = false;
		loading = true;
		error = null;
		docsPage = null;
		docsSection = null;
		docsArticle = null;
		docsResource = null;
		docsSubject = null;
		docsCatalogueEntry = null;
		docsCatalogue = [];
		technicalBundle = null;
		technicalTable = null;
		collectionIndex = null;
		async function active<T>(pending: Promise<T>): Promise<T> {
			const value = await pending;
			if (cancelled) throw new Error("route load cancelled");
			return value;
		}

		async function loadPage() {
			const index = await active(ensureDocsIndex());
			if (cancelled) return;
			const resolved = resolveCompendiumRoute(currentPathname, index);
			resolvedRoute = resolved;
			if (resolved.page === "missing") { error = "missing"; loading = false; return; }
			if (resolved.page === "index") { loading = false; return; }
			if (resolved.page === "collection") {
				collectionIndex = { ...index, pages: index.pages.filter((page) => page.href.startsWith(`${resolved.pathname}/`)) };
				collectionTitle = (resolved.pathname.split("/").at(-1) ?? "documentation").replace(/(^|-)([a-z])/g, (_, separator: string, letter: string) => `${separator === "-" ? " " : ""}${letter.toUpperCase()}`);
				loading = false;
				return;
			}
			if (resolved.page === "technical-bundle" || resolved.page === "technical-table") {
				technicalBundle = index.technical_sources?.find((source) => source.source_id === resolved.bundleId) ?? null;
				if (!technicalBundle) error = "missing";
				else if (resolved.page === "technical-table") technicalTable = await active(loadDocsTechnicalTable(resolved.bundleId, resolved.table));
				loading = false;
				return;
			}
			const page = pageForRoute(index, resolved);
			const section = page && sectionForRoute(page, resolved);
			docsPage = page;
			docsSection = section;
			if (!page) error = "missing";
			else if (resolved.page === "overview") { /* page is enough */ }
			else if (!section) error = "missing";
			else if (resolved.page === "entry") {
				docsCatalogue = await active(catalogueForSection(section));
				const catalogue = docsCatalogue.find((item) => item.slug === resolved.slug);
				const document = section.documents?.find((item) => item.slug === resolved.slug);
				const standaloneArticle = section.pages?.find(
					(item) => item.featured_reference === undefined && item.id === resolved.slug,
				);
				if (catalogue) docsCatalogueEntry = await active(loadDocsCatalogueEntry(catalogue.artifact_href));
				else if (document) docsArticle = await active(loadDocsDocument(document.artifact_href));
				else if (standaloneArticle?.artifact_href)
					docsArticle = await active(loadDocsArticle(standaloneArticle.artifact_href));
				else {
					const path = currentPathname;
					const summary = section.pages?.find((article) => article.resource_routes?.some((item) => item.href === path));
					const article = summary?.artifact_href ? await active(loadDocsArticle(summary.artifact_href)) : null;
					docsResource = article?.resources?.find((item) => item.href === path) ?? null;
					if (!docsResource) error = "missing";
				}
			} else if (resolved.page === "resource") {
				const article = await active(articleForResource(section, resolved.resourceRef));
				docsResource = article?.resources?.find((item) => item.ref === resolved.resourceRef) ?? null;
				if (!docsResource) error = "missing";
			} else if (resolved.page === "subject") {
				const article = await active(articleForSubject(section, resolved.subjectKind, resolved.subjectRef));
				docsSubject = article?.subjects?.find((item) => item.kind === resolved.subjectKind && item.ref === resolved.subjectRef) ?? null;
				if (!docsSubject) error = "missing";
			} else docsCatalogue = await active(catalogueForSection(section));
			loading = false;
		}

		void loadPage().catch((cause: unknown) => {
			if (cancelled) return;
			error = cause instanceof Error ? cause.message : String(cause);
			loading = false;
		});
		return () => {
			cancelled = true;
		};
	});

	$effect(() => {
		if (typeof document === "undefined") return;
		if (docsCatalogueEntry) document.title = `${docsCatalogueEntry.display_name} · ${docsSection?.title ?? "Docs"} · Spellkave`;
		else if (docsSubject) document.title = `${docsSubject.display_name} · ${docsSubject.kind === "entity" ? "Seeded entity" : "Entity definition"} · Spellkave`;
		else if (docsResource) document.title = `${docsResource.display_name} · Resource definition · Spellkave`;
		else if (docsArticle) document.title = `${docsArticle.title} · ${docsSection?.title ?? "Docs"} · Spellkave`;
		else if (docsSection) document.title = `${docsSection.title} · ${docsPage?.title ?? "Docs"} · Spellkave`;
		else if (docsPage) document.title = `${docsPage.title} · Spellkave`;
		else document.title = "Docs · Spellkave";
	});
</script>

<CompendiumLayout {route} {docsIndex} {searchRows}>
	{#if loading}
		<div class="status" role="status" aria-busy="true"><p>Loading catalogue…</p></div>
	{:else if error === "missing"}
		<Compendium404 homeHref="/docs" homeLabel="Back to documentation" />
	{:else if error}
		<Compendium404 message="The catalogue export is not available in this build." homeHref="/docs" homeLabel="Back to documentation" />
	{:else if resolvedRoute.page === "index" && docsIndex}
		<DocsOverview index={docsIndex} />
	{:else if collectionIndex}
		<DocsOverview index={collectionIndex} title={collectionTitle} />
	{:else if technicalBundle}
		<TechnicalBundlePage bundle={technicalBundle} table={technicalTable ?? undefined} />
	{:else if docsPage && docsSection && docsCatalogueEntry}
		<CatalogueEntryPage entry={docsCatalogueEntry} page={docsPage} section={docsSection} catalogue={docsCatalogue} familyHeadings={docsIndex?.family_headings ?? {}} familyNouns={docsIndex?.family_nouns ?? {}} identityNamespaces={docsIndex?.identity_namespaces ?? {}} />
	{:else if docsPage && docsSection && docsArticle}
		<DocsArticlePage page={docsPage} section={docsSection} article={docsArticle} />
	{:else if docsResource}
		<ResourceView resource={docsResource} view="full" page={docsPage ?? undefined} section={docsSection ?? undefined} />
	{:else if docsSubject}
		<SubjectView subject={docsSubject} view="full" page={docsPage ?? undefined} section={docsSection ?? undefined} />
	{:else if docsPage}
		<DocsPageOverview page={docsPage} section={docsSection} catalogue={docsCatalogue} familyHeadings={docsIndex?.family_headings ?? {}} familyNouns={docsIndex?.family_nouns ?? {}} namespacePrefix={namespacePrefixForRoute(resolvedRoute, docsCatalogue)} />
	{:else}
		<Compendium404 />
	{/if}

	{#if docsPage?.attributions?.length}
		<DocsAttributions attributions={docsPage.attributions} />
	{/if}
</CompendiumLayout>
<SiteFooter />

<style>
	.status { min-height: 8rem; color: var(--muted-foreground); }
</style>
