<script lang="ts">
	import wovenWorldHeroUrl from "../assets/woven-world-hero.webp";
	import Button from "../button/button.svelte";
	import { cn } from "../lib/utils";
	import type { HeroStoryStep, NarrativeHeroProps } from "./types";

	const DEFAULT_STORY_STEPS: HeroStoryStep[] = [
		{ step: 1, label: "See", description: "A guarded bridge", icon: "see" },
		{ step: 2, label: "Choose", description: "Offer safe passage", icon: "choose" },
		{ step: 3, label: "World responds", description: "The guard lowers the spear", icon: "respond" },
		{ step: 4, label: "The world changes", description: "The road opens and remembers your name.", icon: "change" },
	];

	const STORY_POSITIONS = [
		"lg:left-[7%] lg:top-[73%]",
		"lg:left-[27%] lg:top-[42%]",
		"lg:left-[56%] lg:top-[62%]",
		"lg:right-[2%] lg:top-[25%]",
	];

	let {
		class: className,
		headline = "The world understands what you mean",
		headlineSnippet,
		copy = "See what is possible.\nChoose what you do.\nThe world responds—and remembers.",
		copySnippet,
		imageUrl = wovenWorldHeroUrl,
		imageAlt = "A woven settlement around a guarded stone bridge, with paths leading into a living world",
		imageSnippet,
		primaryAction = { label: "Enter Spellkave", href: "#enter" },
		primaryActionSnippet,
		secondaryAction = { label: "Watch a world", href: "#watch" },
		secondaryActionSnippet,
		storySteps = DEFAULT_STORY_STEPS,
		storyStepSnippet,
		headingLevel = "h1",
		ariaLabel = "Narrative living world hero",
		...restProps
	}: NarrativeHeroProps = $props();

	const stepHeadingTag = $derived(
		headingLevel === "h1" ? "h2" : headingLevel === "h2" ? "h3" : "h4"
	);
</script>

<section
	data-slot="narrative-hero"
	aria-label={ariaLabel}
	class={cn(
		"relative isolate overflow-hidden border-b border-[color:var(--primary)]/55 bg-[color:var(--background)] text-[color:var(--foreground)] lg:min-h-[38rem]",
		className
	)}
	{...restProps}
>
	<div class="relative z-20 px-6 pb-8 pt-10 sm:px-10 sm:pb-10 lg:w-[35%] lg:max-w-[34rem] lg:px-12 lg:pb-14 lg:pt-14 xl:px-16">
		{#if headlineSnippet}
			{@render headlineSnippet()}
		{:else}
			<svelte:element
				this={headingLevel}
				class="sk-display max-w-full text-[clamp(2.5rem,3.15vw,3.75rem)] text-[color:var(--foreground)]"
			>
				{headline}
			</svelte:element>
		{/if}

		<div class="mt-6 flex items-center gap-2" aria-hidden="true">
			<span class="size-1.5 rotate-45 bg-[color:var(--primary)]"></span>
			<span class="size-1.5 rotate-45 bg-[color:var(--primary)]"></span>
			<span class="h-px w-24 bg-[color:var(--primary)]"></span>
		</div>

		{#if copySnippet}
			<div class="mt-6">{@render copySnippet()}</div>
		{:else if copy}
			<p class="mt-6 max-w-[34ch] whitespace-pre-line [font-family:var(--font-display)] text-lg leading-[1.55] text-[color:var(--foreground)] sm:text-xl">
				{copy}
			</p>
		{/if}

		<div class="mt-7 flex max-w-[19rem] flex-col gap-3" role="group" aria-label="Hero actions">
			{#if primaryActionSnippet}
				{@render primaryActionSnippet()}
			{:else if primaryAction}
				<Button
					variant={primaryAction.variant ?? "hero"}
					size={primaryAction.size ?? "lg"}
					href={primaryAction.href}
					target={primaryAction.target}
					rel={primaryAction.rel}
					onclick={primaryAction.onclick}
					disabled={primaryAction.disabled}
					aria-label={primaryAction.ariaLabel}
					class="w-full justify-between"
				>
					{primaryAction.label}
					<svg class="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="m6 3 5 5-5 5" /></svg>
				</Button>
			{/if}

			{#if secondaryActionSnippet}
				{@render secondaryActionSnippet()}
			{:else if secondaryAction}
				<Button
					variant={secondaryAction.variant ?? "hero-outline"}
					size={secondaryAction.size ?? "lg"}
					href={secondaryAction.href}
					target={secondaryAction.target}
					rel={secondaryAction.rel}
					onclick={secondaryAction.onclick}
					disabled={secondaryAction.disabled}
					aria-label={secondaryAction.ariaLabel}
					class="w-full justify-between"
				>
					{secondaryAction.label}
					<svg class="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="m6 3 5 5-5 5" /></svg>
				</Button>
			{/if}
		</div>
	</div>

	<div class="relative z-10 aspect-[3/2] min-h-72 overflow-hidden border-y border-[color:var(--primary)]/35 lg:absolute lg:inset-y-0 lg:left-[29%] lg:right-0 lg:aspect-auto lg:min-h-0 lg:border-y-0 lg:border-l">
		{#if imageSnippet}
			{@render imageSnippet()}
		{:else if imageUrl}
			<img src={imageUrl} alt={imageAlt} class="h-full w-full object-cover object-center [image-rendering:auto]" />
		{/if}
		<div class="pointer-events-none absolute inset-0 bg-[color:var(--background)]/15"></div>

		<svg
			class="pointer-events-none absolute inset-0 hidden h-full w-full text-[color:var(--primary)] lg:block"
			viewBox="0 0 1000 600"
			fill="none"
			preserveAspectRatio="none"
			aria-hidden="true"
		>
			<path class="living-thread-base" d="M90 500 C210 460 190 310 350 285 S535 410 625 355 S680 165 930 160" stroke="currentColor" stroke-width="2" stroke-dasharray="5 7" />
			<path class="living-thread-draw" d="M90 500 C210 460 190 310 350 285 S535 410 625 355 S680 165 930 160" pathLength="1" stroke="currentColor" stroke-width="2" />
		</svg>

	</div>

	<ol class="relative z-20 grid gap-px bg-[color:var(--primary)]/30 sm:grid-cols-2 lg:absolute lg:inset-y-0 lg:left-[29%] lg:right-0 lg:block lg:bg-transparent" aria-label="Action thread steps">
		{#each storySteps as item, index}
			<li class={cn("relative bg-[color:var(--background)] p-4 before:absolute before:bottom-0 before:left-[1.7rem] before:top-0 before:w-px before:bg-[color:var(--primary)]/60 before:content-[''] sm:before:hidden lg:absolute lg:w-[12.5rem] lg:bg-transparent lg:p-0", STORY_POSITIONS[index] ?? "lg:bottom-[2%] lg:right-[2%]")}>
				{#if storyStepSnippet}
					{@render storyStepSnippet(item, index)}
				{:else}
					<div class="relative z-10 flex items-start gap-3 lg:block lg:border lg:border-[color:var(--primary)]/75 lg:bg-[color:var(--background)]/94 lg:px-4 lg:pb-3 lg:pt-4 lg:shadow-lg">
						<span class="sk-num flex size-7 shrink-0 items-center justify-center rounded-full border border-[color:var(--primary)] text-sm text-[color:var(--primary)] lg:absolute lg:-left-3 lg:-top-4 lg:size-8 lg:bg-[color:var(--background)] lg:text-lg">{item.step}</span>
						<div class="absolute -top-10 left-1/2 hidden size-10 -translate-x-1/2 items-center justify-center rounded-full border border-[color:var(--primary)] bg-[color:var(--background)] text-[color:var(--primary)] lg:flex">
							{#if item.iconSnippet}
								{@render item.iconSnippet()}
							{:else if item.icon === "see"}
								<svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
							{:else if item.icon === "choose"}
								<svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
							{:else if item.icon === "respond"}
								<svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
							{:else}
								<svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></svg>
							{/if}
						</div>
						<div>
							<svelte:element this={stepHeadingTag} class="sk-label text-[color:var(--foreground)]">{item.label}</svelte:element>
							<p class="mt-1 [font-family:var(--font-display)] text-sm leading-snug text-[color:var(--muted-foreground)]">{item.description}</p>
						</div>
					</div>
				{/if}
			</li>
		{/each}
	</ol>
</section>

<style>
	.living-thread-base {
		opacity: 0;
		animation: thread-settle 1.4s ease-out forwards;
	}

	.living-thread-draw {
		stroke-dasharray: 1;
		stroke-dashoffset: 1;
		animation: thread-draw 1.4s ease-in-out forwards;
	}

	@keyframes thread-draw {
		0% {
			stroke-dashoffset: 1;
			opacity: 0.2;
		}
		85% {
			stroke-dashoffset: 0;
			opacity: 1;
		}
		100% {
			stroke-dashoffset: 0;
			opacity: 0;
		}
	}

	@keyframes thread-settle {
		0%,
		80% {
			opacity: 0;
		}
		100% {
			opacity: 0.82;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.living-thread-base {
			animation: none;
			opacity: 0.82;
		}

		.living-thread-draw {
			display: none;
			animation: none;
		}
	}
</style>
