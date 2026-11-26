<script lang="ts">
	import { EntryInline } from "@spellkave/ui-widgets/catalogue";
	import type { DocsArticle } from "./docs-types";
	import ResourceTable from "./ResourceTable.svelte";
	import ResourceView from "./ResourceView.svelte";
	import SubjectView from "./SubjectView.svelte";

	let { article }: { article: DocsArticle } = $props();
	const blocks = $derived(article.blocks ?? []);
</script>

<section class="mt-8" data-testid="docs-article-body">
	{#if article.guidance}
		<aside class="mb-6 text-sm text-[color:var(--muted-foreground)]" aria-label="Documentation status">
			<p>Content status: {article.guidance.content_status}. Server compatibility: {article.guidance.compatibility}.</p>
			<details><summary>Document version</summary><p class="break-all">{article.guidance.document_id} · {article.guidance.corpus_revision}</p></details>
		</aside>
	{/if}
	{#if article.body.trim() === ""}
		<p class="text-[color:var(--destructive)]">Missing required metadata: documentation page body.</p>
	{:else if article.blocks === undefined}
		<p class="text-[color:var(--destructive)]">Missing validated documentation blocks.</p>
	{:else}
		{#each blocks as block, index (`${block.kind}:${index}`)}
			{#if block.kind === "html"}
				<div class="max-w-[65ch] leading-relaxed [&_a]:text-primary [&_a]:underline-offset-4 [&_blockquote]:my-6 [&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:text-[color:var(--muted-foreground)] [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:font-display [&_h2]:font-medium [&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:font-display [&_h3]:font-medium [&_h4]:mt-6 [&_h4]:mb-2 [&_h4]:font-display [&_h4]:font-medium [&_li]:my-1 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-4 [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:text-left [&_th]:border [&_th]:border-border [&_th]:bg-muted-surface [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6">{@html block.html}</div>
			{:else if block.kind === "resource"}
				{@const resource = article.resources?.find((item) => item.ref === block.ref)}
				{#if resource}<ResourceView {resource} view={block.view} />
				{:else}<p class="text-[color:var(--destructive)]">Missing projected resource: {block.ref}</p>{/if}
			{:else if block.kind === "resource-table"}
				{@const resources = block.refs.flatMap((ref) => article.resources?.find((item) => item.ref === ref) ?? [])}
				{#if resources.length === block.refs.length}
					<ResourceTable {resources} nameLabel={block.nameLabel} descriptionLabel={block.descriptionLabel} />
				{:else}<p class="text-[color:var(--destructive)]">Missing projected resources for table.</p>{/if}
			{:else}
				{@const subject = article.subjects?.find((item) => item.kind === block.subjectKind && item.ref === block.ref)}
				{#if subject}<SubjectView {subject} view={block.view} />
				{:else}<p class="text-[color:var(--destructive)]">Missing projected subject: {block.ref}</p>{/if}
			{/if}
		{/each}
	{/if}

	{#each article.catalogue_lists ?? [] as list (list.title)}
		<!--
			What this ruleset holds for what the chapter just described. The
			chapter's own table stays above exactly as the SRD printed it — this
			is the way from those names to the entries that actually run
			(sk-jay0.3.5.91).
		-->
		<section class="mt-8" data-testid="docs-article-catalogue-list">
			<h2 class="mb-2 font-display font-medium">{list.title}</h2>
			{#each list.entries as entry (entry.ref)}
				<EntryInline {entry} />
			{/each}
		</section>
	{/each}

	<footer class="mt-8 border-t border-border pt-4" data-testid="docs-article-source">
		<h2 class="text-sm font-semibold tracking-tight">Article source</h2>
		<p class="mt-1 max-w-[65ch] break-words text-xs leading-5 text-[color:var(--muted-foreground)]">
			<code>{article.source.path}</code> · {article.source.anchor} · {article.source.license}
		</p>
	</footer>
</section>
