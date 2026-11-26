<script lang="ts">
	import { DocsPageHeader } from "@spellkave/ui";
	import { firstSentence } from "@spellkave/ui-widgets/catalogue/first-sentence";
	import DescriptionField from "./DescriptionField.svelte";
	import type { DocsTag } from "./docs-types";
	import { pushPath } from "./parse-path";

	let {
		tag,
		view,
		chrome = true,
		sections = {},
	}: {
		tag: DocsTag;
		view: "inline" | "full";
		chrome?: boolean;
		/**
		 * Split the full view the same way `ResourceView` and `SubjectView`
		 * split theirs, so an entry page can lead with the description and
		 * defer the identity rows to the bottom instead of pushing both below
		 * the related-entry blocks.
		 */
		sections?: { header?: boolean; details?: boolean };
	} = $props();
	const showHeader = $derived(sections.header ?? true);
	const showDetails = $derived(sections.details ?? true);
	const summary = $derived(firstSentence(tag.description));

	function open(event: MouseEvent) {
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		event.preventDefault();
		pushPath(tag.href);
		window.scrollTo({ top: 0 });
	}
</script>

{#if view === "inline"}
	<p class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm" data-testid="tag-inline">
		<a class="[overflow-wrap:anywhere] text-primary underline-offset-4 hover:underline" href={tag.href} onclick={open}>{tag.display_name}</a>
		<span class="text-xs text-[color:var(--muted-foreground)]">{tag.ref}</span>
		{#if summary}<span class="text-xs text-[color:var(--muted-foreground)]">— {summary}</span>{/if}
	</p>
{:else}
	<article data-testid="tag-full">
		{#if showHeader}
			{#if chrome}<DocsPageHeader title={tag.display_name} description="Spellkave tag vocabulary" />{/if}
			<DescriptionField description={tag.description} field="tag_value_definitions.description" />
		{/if}
		{#if showDetails}
			<dl class="mt-6 grid max-w-[65ch] grid-cols-[max-content_minmax(0,1fr)] gap-x-6 gap-y-2 text-sm">
				<dt class="font-semibold">Tag ID</dt><dd class="min-w-0 break-words"><code>{tag.ref}</code></dd>
				<dt class="font-semibold">Owning bundle</dt><dd>{tag.bundle_id}</dd>
			</dl>
		{/if}
	</article>
{/if}
