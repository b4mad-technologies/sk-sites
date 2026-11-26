<script lang="ts">
	import heroPartyUrl from "../assets/journey-hero-party.webp";
	import livingWorldUrl from "../assets/journey-living-world.webp";
	import shapeWorldUrl from "../assets/journey-shape-world.webp";
	import { cn } from "../lib/utils";
	import type { JourneyBandProps, JourneyStep } from "./types";

	const DEFAULT_JOURNEY_STEPS: JourneyStep[] = [
		{
			step: 1,
			title: "Enter a living world",
			description: "Explore a persistent world already in motion. No fixed path waits for you.",
			imageUrl: livingWorldUrl,
			imageAlt: "A woven settlement and hill castle already alive with inhabitants",
		},
		{
			step: 2,
			title: "Claim your hero",
			description: "Become part of its places, relationships and history.",
			imageUrl: heroPartyUrl,
			imageAlt: "A woven scout, guardian and scholar standing together",
		},
		{
			step: 3,
			title: "Shape what comes next",
			description: "Discover possible actions, attempt your own ideas, and leave changes others inherit.",
			imageUrl: shapeWorldUrl,
			imageAlt: "Five woven inhabitants rebuilding a stone bridge together",
		},
	];

	let {
		class: className,
		steps = DEFAULT_JOURNEY_STEPS,
		stepSnippet,
		tagline = "Open rules. Meaningful possibilities. Lasting consequences.",
		taglineSnippet,
		ariaLabel = "Three-step journey band",
		...restProps
	}: JourneyBandProps = $props();
</script>

<!--
	The reading band. It sits on the theme's paper material (--paper / --paper-ink),
	never on an inverted foreground, so it stays a light band under every theme.
-->
<section
	data-slot="journey-band"
	aria-label={ariaLabel}
	class={cn(
		"relative overflow-hidden border-y border-t-4 border-double border-b-[color:var(--border)] border-t-[color:var(--primary)] bg-[color:var(--paper)] text-[color:var(--paper-ink)] [background-image:var(--paper-image)] [background-size:var(--paper-size)]",
		className
	)}
	{...restProps}
>
	<ol class="mx-auto grid max-w-[96rem] grid-cols-1 px-5 pb-4 pt-8 sm:px-8 md:grid-cols-3 lg:px-12" aria-label="Journey steps">
		{#each steps as item, index}
			<li class="relative flex min-w-0 flex-col border-b border-[color:var(--paper-ink)]/25 py-7 last:border-b-0 md:border-b-0 md:border-r md:px-8 md:first:pl-0 md:last:border-r-0 md:last:pr-0">
				{#if stepSnippet}
					{@render stepSnippet(item, index)}
				{:else}
					<div class="flex items-center gap-4">
						<span class="sk-num flex size-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--paper-ink)] bg-[color:var(--paper)] text-lg text-[color:var(--paper-ink)]">{item.step}</span>
						<h3 class="sk-display text-xl text-[color:var(--paper-ink)] lg:text-2xl">{item.title}</h3>
					</div>

					{#if item.imageSnippet || item.imageUrl}
						<div class="my-5 flex min-h-36 flex-1 items-center justify-center sm:min-h-44">
							{#if item.imageSnippet}
								{@render item.imageSnippet()}
							{:else}
								<img src={item.imageUrl} alt={item.imageAlt ?? item.title} class="h-40 w-full object-contain mix-blend-multiply sm:h-48 [image-rendering:auto]" />
							{/if}
						</div>
					{/if}

					<p class="max-w-[34ch] [font-family:var(--font-display)] text-lg leading-[1.45] text-[color:var(--paper-ink)]">{item.description}</p>
				{/if}
			</li>
		{/each}
	</ol>

	{#if taglineSnippet}
		{@render taglineSnippet()}
	{:else if tagline}
		<p class="sk-label px-5 pb-6 text-center text-[color:var(--paper-ink)]">{tagline}</p>
	{/if}
</section>
