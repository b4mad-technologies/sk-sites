<script lang="ts">
	import type { Snippet } from "svelte";
	import { cn } from "../lib/utils";
	import type { ReferenceCardProps } from "./types";

	let {
		label,
		title,
		href,
		facts = [],
		art,
		onNavigate,
		class: className,
		children,
	}: ReferenceCardProps & { children?: Snippet } = $props();

	function open(event: MouseEvent): void {
		onNavigate?.(event);
	}
</script>

<article
	data-slot="reference-card"
	class={cn("min-w-0 border-l-2 border-primary py-1 pl-4", className)}
>
	{#if art}
		<img
			loading="lazy"
			class="mb-2 h-24 w-24 rounded-[var(--radius)] border border-border object-contain"
			src={art.href}
			alt={art.alt ?? title}
		/>
	{/if}
	<p class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
	<h2 class="mt-1 font-[family-name:var(--font-display)] text-xl font-medium">
		{#if href}
			<a class="text-primary underline-offset-4 hover:underline" {href} onclick={open}>{title}</a>
		{:else}
			{title}
		{/if}
	</h2>
	{#if children}
		<div class="mt-1">{@render children()}</div>
	{/if}
	{#if facts.length > 0}
		<dl class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
			{#each facts as fact (fact.label + fact.value)}
				<div>
					<dt class="inline font-semibold">{fact.label}:</dt>
					<dd class="inline">
						{#if fact.href}
							<a
								class="text-primary underline-offset-4 hover:underline"
								href={fact.href}
								onclick={(event) => fact.onClick?.(event)}>{fact.value}</a
							>
						{:else}
							{fact.value}
						{/if}
					</dd>
				</div>
			{/each}
		</dl>
	{/if}
</article>
