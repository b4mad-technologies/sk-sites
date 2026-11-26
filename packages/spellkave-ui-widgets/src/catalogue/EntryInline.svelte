<script lang="ts">
	import { catalogueOpen } from "./navigate";
	/**
	 * Smallest entry render: a linked title, its raw ref in small muted
	 * text, and an optional pre-trimmed summary. Generalises what
	 * `TagView`'s inline branch and `TagChip` each hand-roll today.
	 *
	 * Takes the already-light `DocsRowEntryReference` shape (no full
	 * `description`) instead of computing `firstSentence` itself: a
	 * `ReferenceGroup` can list hundreds of rows, so trimming happens once,
	 * at the point the summary is produced, not on every inline render. A
	 * per-kind "inline" view that starts from a full `DocsRowEntryView`
	 * should pass `summary={firstSentence(row.description)}` — see
	 * `first-sentence.ts`, and `TagView`'s own inline branch for the
	 * pattern this replaces.
	 */
	import type { DocsRowEntryReference } from "./types";

	let {
		entry,
		onNavigate,
	}: {
		entry: DocsRowEntryReference;
		/**
		 * Router for `entry.href`. Default: the docs catalogue's own
		 * `catalogueOpen`. A non-docs caller (the Maps drawer routes through
		 * `publishMapsLocator`) passes its own; it receives the raw href and
		 * the click event so it can keep the modifier-click behaviour.
		 */
		onNavigate?: (href: string, event: MouseEvent) => void;
	} = $props();

	function open(event: MouseEvent) {
		const href = entry.href;
		if (href === undefined || href === "") return;
		if (onNavigate !== undefined) {
			onNavigate(href, event);
			return;
		}
		catalogueOpen(href, event);
	}
</script>

<p class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm" data-testid="entry-inline">
	{#if entry.href}
		<a
			class="[overflow-wrap:anywhere] text-primary underline-offset-4 hover:underline"
			href={entry.href}
			onclick={open}>{entry.title}</a
		>
	{:else}
		<span class="[overflow-wrap:anywhere]">{entry.title}</span>
	{/if}
	<span class="text-xs text-[color:var(--muted-foreground)]">{entry.ref}</span>
	{#if entry.summary}<span class="text-xs text-[color:var(--muted-foreground)]">— {entry.summary}</span>{/if}
</p>
