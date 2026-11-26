<script lang="ts">
	import { Button } from "@spellkave/ui";

	let {
		oldestTick,
		latestTick,
		cursorTick,
		live,
		events = [],
		onPause,
		onPlay,
		onScrub,
	}: {
		oldestTick: number;
		latestTick: number;
		cursorTick: number;
		live: boolean;
		events?: { id: string; tick: number; kind: string; summary?: string }[];
		onPause: () => void;
		onPlay: () => void;
		onScrub: (tick: number) => void;
	} = $props();

	const span = $derived(Math.max(0, latestTick - oldestTick));
	const tickEvents = $derived(events.filter((event) => event.tick === cursorTick));
</script>

<div class="maps-radar-bar" data-testid="watch-radar" aria-label="Time radar">
	<div class="maps-radar-bar__row">
		{#if live}
			<Button size="xs" variant="outline" onclick={onPause}>Pause</Button>
		{:else}
			<Button size="xs" onclick={onPlay}>Live</Button>
		{/if}
		<span class="maps-radar-bar__tick" data-testid="radar-tick">
			{live ? "Live" : "Paused"} · tick {cursorTick}
		</span>
		<span class="maps-radar-bar__hint">Since you started watching. Reconnect resets.</span>
	</div>
	<input
		type="range"
		min={oldestTick}
		max={latestTick}
		step="1"
		value={cursorTick}
		disabled={span === 0}
		aria-label="Scrub world time"
		data-testid="radar-scrub"
		class="maps-radar-bar__scrub"
		oninput={(e) => onScrub(Number(e.currentTarget.value))}
	/>
	{#if tickEvents.length > 0}
		<ul class="maps-radar-bar__events" data-testid="radar-events">
			{#each tickEvents as event (event.id)}
				<li>{event.kind}{event.summary ? ` · ${event.summary}` : ""}</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.maps-radar-bar {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--card);
		color: var(--card-foreground);
	}
	.maps-radar-bar__row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.maps-radar-bar__tick,
	.maps-radar-bar__hint {
		font-size: 0.6875rem;
		color: var(--muted-foreground);
	}
	.maps-radar-bar__hint {
		margin-left: auto;
	}
	.maps-radar-bar__scrub {
		width: 100%;
	}
	.maps-radar-bar__events {
		margin: 0;
		padding-left: 1rem;
		font-size: 0.75rem;
	}
</style>
