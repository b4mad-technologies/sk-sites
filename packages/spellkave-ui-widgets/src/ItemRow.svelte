<script lang="ts">
	import Glyph from "./Glyph.svelte";

	/**
	 * One carried/equipped item row, shared by Pack (button form) and
	 * Inspect's CARRYING list (link form when `href` is set). Extracted from
	 * Pack's stage list so Maps renders kit rows with the same glyph, stack
	 * count and equipped label instead of forking the markup.
	 */
	let {
		id,
		name,
		quantity,
		equipped = null,
		depth = 0,
		href,
		onSelect,
		selected = false,
		testId,
	}: {
		id: string;
		name: string;
		quantity?: number;
		/** Slot label (or slot id) when the item is worn/wielded. */
		equipped?: string | null;
		/** Containment depth; rows inside a carried container indent. */
		depth?: number;
		/** Link form: rendered as an anchor so the row is a shareable locator. */
		href?: string;
		onSelect?: (id: string) => void;
		selected?: boolean;
		testId?: string;
	} = $props();
</script>

{#if href !== undefined}
	<a
		class="sk-play-row flex items-center gap-2 text-left"
		style={depth > 0 ? `padding-left: ${0.75 + depth * 1.25}rem` : undefined}
		data-testid={testId}
		aria-current={selected ? "true" : undefined}
		{href}
		onclick={(event) => {
			if (onSelect !== undefined) {
				event.preventDefault();
				onSelect(id);
			}
		}}
	>
		<Glyph name="thing" class="size-4 shrink-0 opacity-70" />
		<span class="min-w-0 flex-1 font-medium">{name}</span>
		{#if (quantity ?? 1) > 1}
			<span class="sk-num sk-play-muted shrink-0 text-sm">×{quantity}</span>
		{/if}
		{#if equipped}
			<span class="sk-label sk-play-muted shrink-0">{equipped}</span>
		{/if}
	</a>
{:else}
	<button
		type="button"
		class="sk-play-row flex items-center gap-2 text-left"
		style={depth > 0 ? `padding-left: ${0.75 + depth * 1.25}rem` : undefined}
		data-testid={testId}
		aria-pressed={selected}
		onclick={() => onSelect?.(id)}
	>
		<Glyph name="thing" class="size-4 shrink-0 opacity-70" />
		<span class="min-w-0 flex-1 font-medium">{name}</span>
		{#if (quantity ?? 1) > 1}
			<span class="sk-num sk-play-muted shrink-0 text-sm">×{quantity}</span>
		{/if}
		{#if equipped}
			<span class="sk-label sk-play-muted shrink-0">{equipped}</span>
		{/if}
	</button>
{/if}
