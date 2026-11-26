<script lang="ts">
	import { InfoLink } from "@spellkave/ui";
	import Glyph from "./Glyph.svelte";
	import { groupOccupants } from "./occupants";
	import PlayFrame from "./PlayFrame.svelte";
	import type { OccupantsProps } from "./types";

	let {
		occupants,
		selectedId = null,
		onSelect,
		infoRefFor,
		density = "card",
		chrome = "frame",
	}: OccupantsProps = $props();

	const preview = $derived(occupants.slice(0, 3));
	const groups = $derived(groupOccupants(occupants));
</script>

<PlayFrame
	slot="play-occupants"
	titleId="play-occupants-heading"
	title="Here"
	meta={occupants.length > 0 ? `${occupants.length} present` : undefined}
	{density}
	{chrome}
	glyph="person"
	datum="{occupants.length} present"
>
	{#if occupants.length === 0}
		<p class="sk-play-prose sk-play-muted">No one and nothing stands out.</p>
	{:else if density === "stage"}
		{#if chrome === "bare"}
			<h3 id="play-occupants-heading" class="sk-label m-0">Here</h3>
		{/if}
		{#each groups as group (group.key)}
			<section class="mt-3">
				<h4 class="sk-label sk-play-muted m-0">{group.label}</h4>
				<ul class="sk-play-list" aria-label={group.label}>
					{#each group.items as occupant (occupant.id)}
						<li>
							<button
								type="button"
								class="sk-play-row"
								aria-pressed={selectedId === occupant.id}
								onclick={() => onSelect?.(occupant.id)}
							>
								<Glyph name={occupant.kind} class="size-5 shrink-0 opacity-80" />
								<span class="min-w-0 flex-1">
									<span class="block font-medium">{occupant.name}</span>
									<span class="sk-play-muted block text-sm">{occupant.note}</span>
								</span>
							</button>
						</li>
					{/each}
				</ul>
			</section>
		{/each}
	{:else}
		<p class="sk-play-muted m-0 mt-2 text-sm">
			<!-- Names carry commas ("Aldwin, keeper of the hearth-ledger"), so a
			     comma list read as more people than were here. -->
			{occupants.length} here: {#each preview as occupant, index (occupant.id)}
				{@const infoRef = infoRefFor?.(occupant)}
				{#if infoRef}
					<InfoLink refId={infoRef} onclick={() => onSelect?.(occupant.id)}>{occupant.name}</InfoLink>
				{:else if onSelect}
					<button
						type="button"
						class="sk-play-inline-select"
						aria-pressed={selectedId === occupant.id}
						onclick={() => onSelect(occupant.id)}
					>{occupant.name}</button>
				{:else}{occupant.name}{/if}{#if index < preview.length - 1}{" · "}{/if}
			{/each}{occupants.length > preview.length ? " …" : ""}
		</p>
	{/if}
</PlayFrame>

<style>
	/* Card-density names remain a compact prose list, but a host that owns
	   selection exposes each visible name as the same select-only gesture the
	   stage roster uses. */
	.sk-play-inline-select {
		padding: 0;
		border: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		text-decoration: underline dotted;
		text-underline-offset: 0.16em;
		cursor: pointer;
	}

	.sk-play-inline-select[aria-pressed="true"] { color: var(--primary); }
	.sk-play-inline-select:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
</style>
