<script lang="ts">
	/**
	 * The look of one grouped-list section-header row (sk-jay0.1.8.63.5, the
	 * macOS/iOS pattern): the section's own name, emphasised — never a muted
	 * small-caps hairline, since a section change is a relevant event — an
	 * optional trailing detail, and a bottom rule. Presentation only: this
	 * component scrolls in normal flow with `ActivityFeed` section rows
	 * and no grouping decision (the host decides which items are headers and
	 * supplies both strings).
	 *
	 * `level` picks the heading element so the row reads as an actual heading
	 * to assistive tech, not just styled text — a caller sets it to whatever
	 * avoids colliding with a heading level already on the page (e.g. Play's
	 * Explore stream uses `4` because the Place tile's own place-name heading
	 * is already a `3`).
	 *
	 * `detailContent` (sk-jay0.1.8.63.6) is an optional snippet that wins over
	 * the plain `detail` string when supplied — the host's own escape hatch
	 * for linked prose (e.g. Play's public reference links) without this
	 * component knowing anything about what a "reference" is. The look stays
	 * owned here: both forms render inside the same trailing-detail span.
	 */
	import type { Snippet } from "svelte";

	type HeadingLevel = 2 | 3 | 4;
	let {
		title,
		detail,
		detailContent,
		level = 3,
	}: {
		title: string;
		detail?: string;
		detailContent?: Snippet;
		level?: HeadingLevel;
	} = $props();
</script>

<div
	class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 border-b border-[color:var(--border)] py-1.5"
>
	{#if level === 2}
		<h2 class="sk-title m-0 text-base">{title}</h2>
	{:else if level === 4}
		<h4 class="sk-title m-0 text-base">{title}</h4>
	{:else}
		<h3 class="sk-title m-0 text-base">{title}</h3>
	{/if}
	{#if detailContent}
		<span class="text-sm text-muted-foreground">{@render detailContent()}</span>
	{:else if detail}
		<span class="text-sm text-muted-foreground">{detail}</span>
	{/if}
</div>
