<script lang="ts">
	import { Button } from "@spellkave/ui";
	import Glyph from "./Glyph.svelte";
	import PlayFrame from "./PlayFrame.svelte";
	import type { SceneProps } from "./types";

	let {
		place,
		onMove,
		busy = false,
		readState = "ready",
		showExits = true,
		density = "card",
		chrome = "frame",
	}: SceneProps = $props();

	const exitsDatum = $derived(`${place.exits.length} ${place.exits.length === 1 ? "way out" : "ways out"}`);
	const description = $derived(place.description.trim());
</script>

<PlayFrame
	slot="play-scene"
	titleId="play-scene-{place.id}"
	title={place.name}
	titleTone="world"
	meta="Place"
	{density}
	{chrome}
	glyph="compass"
	datum={exitsDatum}
>
	{#if chrome === "bare"}
		<h3 id="play-scene-{place.id}" class="sk-display m-0 text-2xl">{place.name}</h3>
	{/if}
	{#if density !== "strip"}
		{#if readState === "failed"}
			<p class="sk-play-prose" role="alert">Place description could not be loaded.</p>
		{:else if readState === "loading"}
			<p class="sk-play-prose" role="status">Loading place description…</p>
		{:else if description === ""}
			<p class="sk-play-prose sk-play-muted">No description available.</p>
		{:else}
			<!-- Card density (sk-jay0.1.8.102): the description is its own scroll
			     region, so a host that sizes the card (PlacePanel) can let only the
			     text scroll while the place name and the rows below keep their size.
			     Without a height bound from the host it never scrolls. -->
			<p class={["sk-play-prose", density === "card" && "scene-description sk-stream-scroll"]}>{description}</p>
		{/if}
	{/if}
	{#if showExits && place.exits.length > 0}
		<ul
			class="flex flex-wrap gap-2"
			class:mt-5={density === "stage"}
			class:mt-3={density === "card"}
			aria-label="Ways out from {place.name}"
		>
			{#each place.exits as exit (exit.id)}
				<li class="min-w-0 max-w-full">
					<!-- Button's own base is `whitespace-nowrap shrink-0`: a long
					     exit label never wrapped and never shrank, so it overflowed
					     the tile. PlayFrame's `:global([data-slot^="play-"] …)` rule
					     wraps it for every consumer. `min-w-[12rem]` is a floor that
					     CSS wrap alone does not give: without it an inline-flex
					     Button collapses toward its icon when two long labels share
					     a wide row. -->
					<Button
						variant="woven-secondary"
						size="sm"
						type="button"
						class="max-w-full min-w-[12rem] shrink basis-auto gap-2"
						disabled={busy}
						title={exit.gated ? "Something stands at this way; the world decides the attempt." : undefined}
						onclick={onMove === undefined ? undefined : () => onMove(exit.id)}
					>
						<Glyph name="compass" class="size-4 shrink-0 opacity-80" />
						<span class="min-w-0">{exit.direction ? `${exit.label} (${exit.direction})` : exit.label}</span>
						{#if exit.gated}
							<span class="sk-label sk-play-muted shrink-0" aria-label="gated">·</span>
						{/if}
					</Button>
				</li>
			{/each}
		</ul>
	{/if}
</PlayFrame>
