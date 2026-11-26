<script lang="ts">
	import PlayFrame from "./PlayFrame.svelte";
	import type { EconomyProps } from "./types";

	/**
	 * Operator-approved label map (`play-battle-mode.md` §S4, 2026-09-08): a
	 * UI name for a server channel id, never an invented row. Keyed by the
	 * FULL channel id — an id this map does not carry (e.g. Movement, before
	 * `sk-0m4.123` binds it in content) falls back to the raw id rather than
	 * guessing a label for it.
	 */
	const CHANNEL_LABELS: Record<string, string> = {
		"srd/economy_channel/primary": "Action",
		"srd/economy_channel/bonus": "Bonus",
		"srd/economy_channel/reaction": "Reaction",
		"srd/economy_channel/object_interaction": "Interact",
	};

	function labelFor(channelId: string): string {
		return CHANNEL_LABELS[channelId] ?? channelId;
	}

	let { channels, density = "card", chrome = "frame" }: EconomyProps = $props();

	// One pip per channel THE READ RETURNED, in the read's own order — never
	// a fixed four-slot row. A channel absent from `channels` (unbound
	// content, or a failed read upstream) is simply absent here.
	const pips = $derived(
		channels.map((channel) => ({
			channelId: channel.channelId,
			label: labelFor(channel.channelId),
			spent: channel.spentMs > 0,
		})),
	);
	const spentCount = $derived(pips.filter((pip) => pip.spent).length);
	const stripDatum = $derived(channels.length > 0 ? `${spentCount}/${channels.length}` : undefined);
</script>

<PlayFrame
	slot="play-economy"
	titleId="play-economy-heading"
	title="Economy"
	meta={channels.length > 0 ? `${spentCount} of ${channels.length} spent` : undefined}
	{density}
	{chrome}
	glyph="claim"
	datum={stripDatum}
>
	{#if channels.length === 0}
		<p class="sk-play-prose sk-play-muted">No action economy reported yet.</p>
	{:else}
		<!-- Card density's own single-row scroll (mirrors Combat.svelte's
		     tracker/verb strips, `.sk-play-turnbar-strip`, §10 row S1,
		     decided 2026-09-09): the row scrolls instead of wrapping a second
		     line onto a fixed-height card tile. The scroll/scrollbar CSS
		     itself lives in Combat.svelte, scoped to `[data-slot="play-
		     combat"]` — the only card-density host this widget mounts inside
		     today (S4 mount step, sk-jay0.1.8.40). A future standalone
		     card-density mount outside Combat would need that rule
		     duplicated or hoisted; this widget's own class list stays ready
		     for it either way. -->
		<ul
			class="flex gap-1.5"
			class:flex-wrap={density === "stage"}
			class:sk-play-turnbar-strip={density === "card"}
			class:mt-3={density === "stage"}
			class:mt-2={density === "card"}
			aria-label="Action economy"
		>
			{#each pips as pip (pip.channelId)}
				<li
					class="sk-play-economy-pip"
					class:sk-play-economy-pip--spent={pip.spent}
					class:sk-play-economy-pip--compact={density === "card"}
					aria-label="{pip.label}, {pip.spent ? 'spent' : 'unspent'}"
				>
					<span aria-hidden="true" class="sk-play-economy-pip__dot"></span>
					<span>{pip.label}</span>
				</li>
			{/each}
		</ul>
	{/if}
</PlayFrame>

<style>
	:global(.sk-play-economy-pip) {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.25rem 0.6rem;
		border: 1px solid color-mix(in srgb, currentColor 25%, transparent);
		border-radius: var(--radius);
		font-size: 0.875rem;
	}

	:global(.sk-play-economy-pip__dot) {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		background-color: color-mix(in srgb, currentColor 35%, transparent);
	}

	:global(.sk-play-economy-pip--spent) {
		color: var(--primary);
		border-color: var(--primary);
	}

	:global(.sk-play-economy-pip--spent .sk-play-economy-pip__dot) {
		background-color: var(--primary);
	}

	/* Card density's own fixed tile height leaves no room for the pip's
	 * usual (stage-sized) padding once every other turn-bar row also needs
	 * its own line (`check:tile-clip`, same reason as Combat.svelte's own
	 * `.sk-play-roster-entry--compact`). Stage keeps the roomier default. */
	:global(.sk-play-economy-pip--compact) {
		padding: 0.05rem 0.4rem;
		font-size: 0.75rem;
	}
</style>
