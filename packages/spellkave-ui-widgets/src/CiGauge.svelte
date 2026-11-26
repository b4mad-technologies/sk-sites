<script lang="ts">
	/**
	 * A half-circle gauge: the green share of finished runs, with the red share
	 * as the rest of the arc. Reads at a glance where a sentence of numbers
	 * would not.
	 */
	import type { CiGaugeProps } from "./ci-types";
	import InfoHint from "./InfoHint.svelte";

	let { green, value, label, caption, hint }: CiGaugeProps = $props();

	// A half circle of radius 40 from (10,50) to (90,50).
	const LENGTH = Math.PI * 40;
	const arc = "M10 50 A40 40 0 0 1 90 50";
	const filled = $derived(green === null ? 0 : Math.max(0, Math.min(1, green)) * LENGTH);
</script>

<div class="flex items-center gap-4 rounded-[var(--radius)] border border-border bg-card px-4 py-3" data-slot="ci-gauge">
	<svg viewBox="0 0 100 56" class="h-14 w-24 shrink-0" role="img" aria-label={`${label}: ${value}`}>
		<path d={arc} fill="none" stroke-width="10" stroke-linecap="butt" class={green === null ? "stroke-muted" : "stroke-destructive"} />
		{#if green !== null}
			<path d={arc} fill="none" stroke-width="10" stroke-linecap="butt" class="stroke-accent" stroke-dasharray={`${filled} ${LENGTH}`} />
		{/if}
	</svg>
	<span class="flex min-w-0 flex-col">
		<span class="font-mono text-2xl leading-none tabular-nums">{value}</span>
		<span class="mt-1 flex items-center gap-1 text-xs text-muted-foreground">{label}{#if hint}<InfoHint label={hint} />{/if}</span>
		{#if caption}<span class="mt-0.5 text-xs text-muted-foreground">{caption}</span>{/if}
	</span>
</div>
