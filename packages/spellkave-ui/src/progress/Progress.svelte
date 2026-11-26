<script lang="ts">
	import { Progress as BitsProgress } from "bits-ui";
	import { loomFrame } from "../lib/loom";
	import { cn } from "../lib/utils";
	import type { ProgressProps } from "./types";

	let {
		value = 0,
		max = 100,
		min = 0,
		label,
		class: className,
	}: ProgressProps = $props();

	const pct = $derived(
		value == null ? 0 : Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100)),
	);
</script>

<div class={cn("grid gap-2", className)}>
	{#if label}
		<p class="text-xs font-semibold tracking-[0.08em] text-[color:var(--muted-foreground)] uppercase">{label}</p>
	{/if}
	<BitsProgress.Root
		data-slot="progress"
		{value}
		{max}
		{min}
		class={cn(loomFrame, "relative h-3 overflow-hidden bg-[color:var(--muted)]")}
	>
		<div
			data-slot="progress-indicator"
			class="h-full bg-[color:var(--primary)] motion-safe:transition-[width] motion-reduce:transition-none"
			style:width="{pct}%"
		></div>
	</BitsProgress.Root>
</div>
