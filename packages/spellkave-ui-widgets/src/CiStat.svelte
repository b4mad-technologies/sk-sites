<script lang="ts">
	/** One number with its icon and a short label: a tile in a row of key figures. */
	import CiIconGlyph from "./CiIconGlyph.svelte";
	import type { CiStatProps } from "./ci-types";
	import InfoHint from "./InfoHint.svelte";

	let { icon, value, label, tone = "neutral", hint }: CiStatProps = $props();
</script>

<div class="flex items-center gap-3 rounded-[var(--radius)] border border-border bg-card px-4 py-3" data-slot="ci-stat">
	<span
		class={[
			"grid size-9 shrink-0 place-items-center rounded-full",
			tone === "alert" ? "bg-destructive/10 text-destructive" : tone === "good" ? "bg-accent/15 text-accent" : tone === "info" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
		]}
	>
		<CiIconGlyph name={icon} class="size-5" />
	</span>
	<span class="flex min-w-0 flex-col">
		<span class={["font-mono text-2xl leading-none tabular-nums", tone === "alert" ? "text-destructive" : tone === "muted" ? "text-muted-foreground" : ""]}>{value}</span>
		<span class="mt-1 flex items-center gap-1 text-xs text-muted-foreground">{label}{#if hint}<InfoHint label={hint} />{/if}</span>
	</span>
</div>
