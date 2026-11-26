<script lang="ts">
	import { DocsPageHeader } from "@spellkave/ui";
	import CatalogueFacets from "./CatalogueFacets.svelte";
	import CatalogueList from "./CatalogueList.svelte";
	import type { DocsArticleSummary, DocsCatalogueEntrySummary, DocsPage, DocsSection } from "./docs-types";
	import { metadataStringDiagnostic } from "./metadata-diagnostics";
	import { pushPath } from "./parse-path";
	import { renderSheetHtml } from "./sheet-html";
	import { groupCatalogueByNamespace, groupSrdCatalogueEntries, humanizeNamespaceSegment } from "./srd-catalogue-groups";

	let {
		page,
		section = null,
		catalogue = [],
		familyHeadings = {},
		familyNouns = {},
		namespacePrefix = null,
	}: {
		page: DocsPage;
		section?: DocsSection | null;
		catalogue?: DocsCatalogueEntrySummary[];
		familyHeadings?: Record<string, string>;
		familyNouns?: Record<string, { singular: string; plural: string }>;
		/**
		 * Present when this page lists a hierarchical namespace within
		 * `section` instead of the section's normal family-grouped catalogue
		 * (sk-jay0.3.5.66) — `""` for the section's own top-level namespaces
		 * (e.g. `/docs/srd/tags`), or a deeper slug prefix (e.g. `"spell"`
		 * for `/docs/srd/tags/spell`). `null` keeps the existing family
		 * grouping for every other section.
		 */
		namespacePrefix?: string | null;
	} = $props();
	const current = $derived(section ?? page);
	const namespaceListing = $derived(
		section && namespacePrefix !== null ? groupCatalogueByNamespace(catalogue, namespacePrefix) : null,
	);
	// A namespace page's title is computed from the path segment, not
	// authored metadata, so it skips the diagnostic check below and falls
	// back to the section's own title only at the namespace root ("").
	const namespaceTitle = $derived(
		namespacePrefix ? humanizeNamespaceSegment(namespacePrefix.split("/").at(-1) ?? namespacePrefix) : null,
	);
	const grouping = $derived(
		namespaceListing === null && section?.primary_families !== undefined
			? groupSrdCatalogueEntries(section.primary_families, familyHeadings, familyNouns, catalogue)
			: null,
	);
	const titlePath = $derived(section ? `metadata.docs.sections[id=${section.id}].title` : "metadata.docs.title");
	const introPath = $derived(section ? `metadata.docs.sections[id=${section.id}].intro` : "metadata.docs.intro");
	const titleDiagnostic = $derived(namespaceTitle ? null : metadataStringDiagnostic(current.title, titlePath));
	const introDiagnostic = $derived(
		namespaceTitle ? null : metadataStringDiagnostic(current.intro, introPath, { allowEmpty: true }),
	);
	// The rendered title: a computed namespace title wins outright (nothing
	// authored to validate), otherwise the usual diagnostic-or-authored-text.
	const displayTitle = $derived(namespaceTitle ?? titleDiagnostic ?? current.title);
	// A non-featured article always carries its own href (sk-jay0.7.93); the
	// type predicate narrows that back so the link below needs no cast.
	const standalonePages = $derived(
		section?.pages?.filter(
			(article): article is DocsArticleSummary & { href: string } =>
				article.featured_reference === undefined,
		) ?? [],
	);

	/**
	 * Whether the section offers reading of its own — articles or guides.
	 *
	 * Such a section leads the reader through that prose, and the
	 * undifferentiated catalogue dump below it was noise: `playing-the-game`
	 * listed nine articles and then 53 unsorted resource rows (Charisma, Armor
	 * Class, every skill DC) under a "Reference entries" heading that told the
	 * reader nothing about how they relate. Those entries are reached from the
	 * prose that uses them instead.
	 *
	 * Where the catalogue is the section's only index — `mechanics` (2034
	 * entries), `tags`, an adventure bundle's `cast` — the list stays, because
	 * dropping it would leave an empty page and no way to browse them.
	 */
	const hasOwnReading = $derived(
		(section?.pages?.length ?? 0) > 0 || (section?.documents?.length ?? 0) > 0,
	);

	function open(href: string, event: MouseEvent) {
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		event.preventDefault();
		pushPath(href);
	}

	function sectionTitleDiagnostic(value: unknown, id: string): string | null {
		return metadataStringDiagnostic(value, `metadata.docs.sections[id=${id}].title`);
	}

	function sectionIntroDiagnostic(value: unknown, id: string): string | null {
		return metadataStringDiagnostic(value, `metadata.docs.sections[id=${id}].intro`, { allowEmpty: true });
	}
</script>

<section data-testid={section === null ? "docs-page-overview" : "docs-section-overview"}>
	<nav class="crumb" aria-label="Breadcrumb">
		<a href="/docs" onclick={(event) => open("/docs", event)}>Documentation</a>
		<span aria-hidden="true">·</span>
		{#if section}
			<a href={page.href} onclick={(event) => open(page.href, event)}>{page.title}</a>
			<span aria-hidden="true">·</span>
		{/if}
		<span>{displayTitle}</span>
	</nav>
	<DocsPageHeader title={displayTitle}>
		{#snippet intro()}
			{#if introDiagnostic}<p class="diagnostic">{introDiagnostic}</p>
			{:else if current.intro !== ""}<div class="markdown">{@html renderSheetHtml(current.intro, "markdown")}</div>{/if}
		{/snippet}
	</DocsPageHeader>

	{#if section === null && page.bundle}
		<section data-testid="docs-page-bundle">
			<h2>About this bundle</h2>
			<dl class="bundle-facts">
				<dt>Display name</dt>
				<dd>{page.bundle.display_name}</dd>
				<dt>Version</dt>
				<dd>{page.bundle.version}</dd>
				<dt>Author</dt>
				<dd>{page.bundle.author}</dd>
				<dt>Depends on</dt>
				<dd>{page.bundle.depends_on.length ? page.bundle.depends_on.join(", ") : "Nothing"}</dd>
			</dl>
			{#if page.bundle.description !== ""}<div class="markdown">{@html renderSheetHtml(page.bundle.description, "markdown")}</div>{/if}
			<CatalogueFacets facets={page.bundle.facets} />
		</section>
	{/if}
	{#if section === null && page.sections.length > 0}
		<h2>Sections</h2>
		<ul>
			{#each page.sections as item (item.id)}
				<li>
					<strong><a href={item.href} onclick={(event) => open(item.href, event)}>{sectionTitleDiagnostic(item.title, item.id) ?? item.title}</a></strong>
					{#if sectionIntroDiagnostic(item.intro, item.id)}<span class="diagnostic">{sectionIntroDiagnostic(item.intro, item.id)}</span>
					{:else if item.intro !== ""}<span class="markdown">{@html renderSheetHtml(item.intro, "markdown")}</span>{/if}
				</li>
			{/each}
		</ul>
	{/if}
	{#if section && standalonePages.length > 0}
		<h2>Articles</h2>
		<ul>
			{#each standalonePages as article (article.id)}
				<li><strong><a href={article.href} onclick={(event) => open(article.href, event)}>{article.title}</a></strong></li>
			{/each}
		</ul>
	{/if}
	{#if section && (section.documents?.length ?? 0) > 0}
		<h2>Guides</h2>
		<ul>
			{#each section.documents ?? [] as document (document.id)}
				<li><strong><a href={document.href} onclick={(event) => open(document.href, event)}>{document.title}</a></strong></li>
			{/each}
		</ul>
	{/if}
	{#if section && namespaceListing}
		<!--
			Hierarchical slug listing (sk-jay0.3.5.66, currently only the SRD
			`tags` section): namespaces first — each one a plain link/count
			row, not a `ReferenceCard`, because a pure namespace segment (no
			tag of its own at that exact slug) has no display copy to show —
			then direct leaf tags via the same smallest card every other
			section's catalogue uses.
		-->
		{#if namespaceListing.namespaces.length > 0}
			<h2>Namespaces</h2>
			<ul>
				{#each namespaceListing.namespaces as group (group.slug)}
					{@const href = `${section.href}/${group.slug}`}
					<li>
						<strong><a {href} onclick={(event) => open(href, event)}>{humanizeNamespaceSegment(group.segment)}</a></strong>
						<span>{group.count} {group.count === 1 ? "entry" : "entries"}</span>
					</li>
				{/each}
			</ul>
		{/if}
		{#if namespaceListing.leaves.length > 0}
			<h2>Tags</h2>
			<CatalogueList entries={namespaceListing.leaves} noun={{ singular: "tag", plural: "tags" }} />
		{/if}
	{:else if section && catalogue.length > 0}
		{#if grouping}
			<!--
				The primary list carries no heading of its own: the section's own
				`h1` (above) already names the subject ("Classes"), and a
				"Reference entries" label directly under it said nothing a reader
				didn't already know (sk-jay0.3.5.64 round 2 judgement call — kept
				consistent across all nine SRD sections rather than deciding it
				per section). A section with an empty primary list (character-
				creation today) renders nothing here at all, same as before.
			-->
			{#if grouping.primary.length > 0}
				<CatalogueList entries={grouping.primary} />
			{/if}
			{#each grouping.secondary as group (group.family)}
				<details>
					<summary>{group.heading} ({group.entries.length})</summary>
					<CatalogueList entries={group.entries} noun={group.noun} />
				</details>
			{/each}
		{:else if !hasOwnReading}
			<h2>Reference entries</h2>
			<CatalogueList entries={catalogue} />
		{/if}
	{/if}
</section>

<style>
	.crumb { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; margin: 0 0 0.35rem; color: var(--muted-foreground); font-size: 0.75rem; }
	.crumb a { color: var(--foreground); text-underline-offset: 0.2em; }
	.diagnostic { color: var(--destructive); line-height: 1.6; }
	.bundle-facts { display: grid; grid-template-columns: minmax(8rem, auto) 1fr; gap: 0.35rem 1rem; margin: 0.5rem 0; }
	.bundle-facts dt { font-weight: 500; color: var(--muted-foreground); }
	.bundle-facts dd { margin: 0; }
	h2 { margin: 1.75rem 0 0.5rem; font-family: var(--font-display); font-weight: 500; }
	details { margin: 1.75rem 0 0.5rem; }
	details[open] summary { margin-bottom: 0.5rem; }
	summary { cursor: pointer; font-family: var(--font-display); font-weight: 500; font-size: 1.25rem; padding: 0.5rem 0; }
	summary:hover, summary:focus-visible { color: var(--primary); }
	ul { margin: 0; padding: 0; list-style: none; border-top: 1px solid var(--border); }
	li { border-bottom: 1px solid var(--border); }
	li { display: grid; gap: 0.35rem; min-height: 44px; padding: 1rem 0.15rem; }
	li strong a { color: inherit; text-decoration: none; }
	li strong a:hover, li strong a:focus-visible { color: var(--primary); }
	span { color: var(--muted-foreground); line-height: 1.5; }
</style>
