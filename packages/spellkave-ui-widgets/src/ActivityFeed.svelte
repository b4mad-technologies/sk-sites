<script lang="ts" generics="T extends { id: string }">
	import type { Snippet } from "svelte";

	/**
	 * A neutral ordered activity feed. The host owns each entry's language,
	 * presentation and lifecycle; this primitive owns only list semantics,
	 * an honest empty state, and a stable per-entry DOM hook.
	 *
	 * `isSectionHeader` marks a section divider with a stable DOM hook.
	 * Headers scroll in normal flow with their section (owner decision
	 * 2026-11-04); they must not cover speaker names. The host owns the
	 * heading presentation and decides which entries qualify.
	 */
	let {
		items,
		ariaLabel,
		emptyText,
		renderItem,
		isSectionHeader,
		readable = false,
	}: {
		items: readonly T[];
		ariaLabel: string;
		emptyText: string;
		renderItem: Snippet<[T]>;
		/** Left-aligned reading column shared by compact and expanded transcripts. */
		readable?: boolean;
		isSectionHeader?: (item: T) => boolean;
	} = $props();
</script>

{#if items.length === 0}
	<p class="sk-play-prose sk-play-muted m-0" data-slot="activity-feed-empty">{emptyText}</p>
{:else}
	<ol class:activity-feed--readable={readable} aria-label={ariaLabel} data-slot="activity-feed">
		{#each items as item (item.id)}
			{#if isSectionHeader?.(item)}
				<li data-activity-id={item.id} data-slot="activity-feed-header">
					{@render renderItem(item)}
				</li>
			{:else}
				<li data-activity-id={item.id}>
					{@render renderItem(item)}
				</li>
			{/if}
		{/each}
	</ol>
{/if}

<style>
	.activity-feed--readable { width: 100%; max-width: 46rem; margin-inline-end: auto; }
	/* A journal-length feed (Play's continuous Explore stream,
	   sk-jay0.1.8.60, up to a thousand rows) skips layout/paint for rows the
	   viewport cannot currently show. `contain-intrinsic-size` gives the
	   browser a placeholder size before it has ever rendered a row, so
	   scrollbar length and jump-to-bottom math stay stable off-screen. */
	li {
		content-visibility: auto;
		contain-intrinsic-size: auto 3rem;
	}

	/* Keep the divider fully rendered while it scrolls with ordinary rows.
	   The current place remains available in the host's dock status. */
	li[data-slot="activity-feed-header"] {
		content-visibility: visible;
		width: 100%;
	}
</style>
