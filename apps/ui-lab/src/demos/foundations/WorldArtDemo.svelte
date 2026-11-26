<script lang="ts">
	import { characterArt, itemArt } from "../sample-art";
	import { Artwork } from "@spellkave/ui-widgets";
</script>

<div class="grid w-full gap-8">
	<section aria-labelledby="world-art-widget">
		<h3 id="world-art-widget" class="sk-display text-xl">Reusable artwork</h3>
		<p class="mt-2 text-sm text-muted-foreground">Artwork receives a source, alternative text and loading state. The consuming app owns authorization, asset references and telemetry.</p>
		<div class="mt-4 flex flex-wrap items-start gap-6">
			{#if itemArt[0]}<figure><Artwork src={itemArt[0].url} alt={itemArt[0].name} state="ready" /><figcaption class="text-xs">Selected detail</figcaption></figure>{/if}
			{#if characterArt[0]}<figure><Artwork src={characterArt[0].url} alt={characterArt[0].name} state="ready" compact /><figcaption class="text-xs">Compact portrait</figcaption></figure>{/if}
			<figure><Artwork alt="Survey drone" state="loading" /><figcaption class="text-xs">Loading</figcaption></figure>
			<figure><Artwork alt="Survey drone" state="error" /><figcaption class="text-xs">Unavailable</figcaption></figure>
		</div>
	</section>
	<section aria-labelledby="world-art-people">
		<h3 id="world-art-people" class="sk-display text-xl">People and creatures</h3>
		<ul class="mt-4 grid grid-cols-3 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(12rem,1fr))]" aria-label="Character sprites">
			{#each characterArt as entry}
				<li class="grid justify-items-center gap-2 text-center">
					<img
						src={entry.url}
						alt={entry.name}
						width={entry.size * 2}
						height={entry.size * 2}
						class="h-auto max-w-full [image-rendering:pixelated]"
						style="width: {entry.size * 2}px; aspect-ratio: 1 / 1;"
					/>
					<span class="text-xs font-semibold tracking-[0.03em]">{entry.name}</span>
					<span class="sk-label text-[color:var(--muted-foreground)]">{entry.kind}</span>
				</li>
			{/each}
		</ul>
	</section>
	<section aria-labelledby="world-art-items">
		<h3 id="world-art-items" class="sk-display text-xl">Items</h3>
		<ul class="mt-4 grid grid-cols-4 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(8rem,1fr))]" aria-label="Item sprites">
			{#each itemArt as entry}
				<li class="grid justify-items-center gap-2 text-center">
					<img
						src={entry.url}
						alt={entry.name}
						width={entry.size * 2}
						height={entry.size * 2}
						class="h-auto max-w-full [image-rendering:pixelated]"
						style="width: {entry.size * 2}px; aspect-ratio: 1 / 1;"
					/>
					<span class="text-xs font-semibold tracking-[0.03em]">{entry.name}</span>
				</li>
			{/each}
		</ul>
	</section>
</div>
