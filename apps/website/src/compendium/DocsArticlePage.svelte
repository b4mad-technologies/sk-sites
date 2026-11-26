<script lang="ts">
	import { DocsPageHeader } from "@spellkave/ui";
	import DocsArticleBody from "./DocsArticleBody.svelte";
	import type { DocsArticle, DocsArticleSummary, DocsPage, DocsSection } from "./docs-types";
	import { pushPath } from "./parse-path";
	import ResourceView from "./ResourceView.svelte";
	import SubjectView from "./SubjectView.svelte";

	let { page, section, article }: { page: DocsPage; section: DocsSection; article: DocsArticle } = $props();
	// A non-featured article always carries its own href (sk-jay0.7.93); the
	// type predicate narrows that back into the array element type so
	// `previous`/`next` below can link to it without a cast.
	const standaloneArticles = $derived(
		(section.pages ?? []).filter(
			(item): item is DocsArticleSummary & { href: string } => item.featured_reference === undefined,
		),
	);
	const articleIndex = $derived(standaloneArticles.findIndex((item) => item.id === article.id));
	const previous = $derived(articleIndex > 0 ? standaloneArticles[articleIndex - 1] : undefined);
	const next = $derived(articleIndex >= 0 ? standaloneArticles[articleIndex + 1] : undefined);
	const featuredResource = $derived(
		article.featured_reference?.kind === "resource_definition"
			? article.resources?.find((item) => item.ref === article.featured_reference?.ref)
			: undefined,
	);
	const featuredSubject = $derived(
		article.featured_reference !== undefined &&
		article.featured_reference.kind !== "resource_definition"
			? article.subjects?.find(
					(item) =>
						item.kind === article.featured_reference?.kind &&
						item.ref === article.featured_reference?.ref,
				)
			: undefined,
	);

	function open(href: string, event: MouseEvent) {
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		event.preventDefault();
		pushPath(href);
		window.scrollTo({ top: 0 });
	}
</script>

<article data-testid="docs-article-page">
	<nav class="mb-2 flex flex-wrap items-center gap-2 text-sm text-[color:var(--muted-foreground)]" aria-label="Breadcrumb">
		<a class="text-[color:var(--foreground)] underline underline-offset-4" href={page.href} onclick={(event) => open(page.href, event)}>{page.title}</a>
		<span aria-hidden="true">·</span>
		<a class="text-[color:var(--foreground)] underline underline-offset-4" href={section.href} onclick={(event) => open(section.href, event)}>{section.title}</a>
		<span aria-hidden="true">·</span>
		<span>{article.title}</span>
	</nav>
	<DocsPageHeader title={article.title} />
	{#if featuredSubject}
		<SubjectView subject={featuredSubject} view="compact" />
	{:else if featuredResource}
		<ResourceView resource={featuredResource} view="compact" />
	{/if}
	<DocsArticleBody {article} />

	{#if previous || next}
		<nav class="mt-8 grid grid-cols-2 gap-4 border-t border-border pt-4" aria-label="Articles">
			{#if previous}<a href={previous.href} onclick={(event) => open(previous.href, event)}>← {previous.title}</a>{:else}<span></span>{/if}
			{#if next}<a class="text-right" href={next.href} onclick={(event) => open(next.href, event)}>{next.title} →</a>{/if}
		</nav>
	{/if}
</article>
