<script lang="ts">
	/**
	 * The "Tags" section of a page: one chip per tag the subject carries, each a
	 * link to the tag's own page where that tag has one.
	 *
	 * Shared, because a tag junction has to be followable from BOTH of its ends
	 * and the tag's own page already lists its members generically. Rendering the
	 * forward half in each per-kind component would mean writing it once per
	 * kind, and the kinds that forgot are exactly the ones whose junction rows
	 * reached no reader (sk-jay0.3.5.71.4).
	 *
	 * Renders nothing when there are no tags, so a caller can include it
	 * unconditionally.
	 */
	import type { DocsTagLink } from "./docs-types";
	import TagChip from "./TagChip.svelte";

	let { links, heading = "Tags" }: { links: readonly DocsTagLink[]; heading?: string } = $props();
</script>

{#if links.length > 0}
	<section class="mt-8" data-testid="tag-list">
		<h2 class="font-display text-xl font-medium">{heading}</h2>
		<ul class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
			{#each links as link (link.tag)}<li><TagChip {link} /></li>{/each}
		</ul>
	</section>
{/if}
