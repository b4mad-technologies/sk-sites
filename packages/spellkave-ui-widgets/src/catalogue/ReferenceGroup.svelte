<script lang="ts">
	/**
	 * A labelled block of `EntryInline` rows — "References" / "Referenced
	 * by" lists on a full view. Collapses behind `Collapsible`
	 * (`@spellkave/ui`) once a group holds more than `COLLAPSE_THRESHOLD`
	 * entries, matching the threshold `CatalogueEntryPage`'s own
	 * owned/member groups already use
	 * (`RELATED_GROUP_COLLAPSE_THRESHOLD`) — a single row (a common tag,
	 * say) can be referenced hundreds of times.
	 *
	 * Rows are keyed by `href`, not by `ref`: an id does not identify a
	 * subject. `srd/ac` names both the fact read by attacks and the
	 * modifier target that composes it, and a predicate naming it resolves
	 * to BOTH — which is what the reader should see. `groupRows`
	 * (`reference-graph.ts`) already de-duplicates on the route for that
	 * reason; keying the block on `ref` instead made Svelte abort the
	 * render with `each_key_duplicate` on 711 of 7041 catalogue pages.
	 */
	import { Collapsible } from "@spellkave/ui";
	import EntryInline from "./EntryInline.svelte";
	import type { DocsReferenceGroup } from "./types";

	const COLLAPSE_THRESHOLD = 20;

	let {
		group,
		onNavigate,
	}: {
		group: DocsReferenceGroup;
		/** Passed straight to every `EntryInline` — see its own prop doc. */
		onNavigate?: (href: string, event: MouseEvent) => void;
	} = $props();
	const collapse = $derived(group.entries.length > COLLAPSE_THRESHOLD);
</script>

{#if group.entries.length > 0}
	<section class="mt-4" data-testid="reference-group" aria-label={group.label}>
		{#if collapse}
			<Collapsible title={`${group.label} (${group.entries.length})`}>
				{#snippet content()}
					<div class="space-y-2">
						{#each group.entries as entry (entry.href ?? entry.ref)}<EntryInline {entry} {onNavigate} />{/each}
					</div>
				{/snippet}
			</Collapsible>
		{:else}
			<h3 class="font-display text-lg font-medium">{group.label} ({group.entries.length})</h3>
			<div class="mt-2 space-y-2">
				{#each group.entries as entry (entry.href ?? entry.ref)}<EntryInline {entry} {onNavigate} />{/each}
			</div>
		{/if}
	</section>
{/if}
