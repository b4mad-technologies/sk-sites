<script lang="ts">
	import { cn } from "../lib/utils";
	import type { WovenDividerProps } from "./types";

	/**
	 * A stitched rule drawn as geometry, so it follows the theme's primary and
	 * never ships as a raster crop. `stitch` is a running stitch between two
	 * hairlines; `knot` adds a row of small diamonds like a woven selvedge.
	 */
	let { variant = "stitch", class: className }: WovenDividerProps = $props();
</script>

<svg
	data-slot="woven-divider"
	data-variant={variant}
	aria-hidden="true"
	preserveAspectRatio="none"
	viewBox={variant === "knot" ? "0 0 400 24" : "0 0 400 12"}
	class={cn("block w-full text-[color:var(--primary)]", variant === "stitch" ? "h-3" : "h-6", className)}
>
	{#if variant === "knot"}
		<line x1="0" y1="3" x2="400" y2="3" stroke="currentColor" stroke-width="1" vector-effect="non-scaling-stroke" />
		<line x1="0" y1="21" x2="400" y2="21" stroke="currentColor" stroke-width="1" vector-effect="non-scaling-stroke" />
		<g fill="currentColor">
			{#each Array.from({ length: 25 }, (_, index) => index * 16 + 8) as x}
				<path d={`M${x} 6 L${x + 6} 12 L${x} 18 L${x - 6} 12 Z`} />
			{/each}
		</g>
	{:else}
		<line x1="0" y1="1" x2="400" y2="1" stroke="currentColor" stroke-width="1" vector-effect="non-scaling-stroke" />
		<line x1="0" y1="6" x2="400" y2="6" stroke="currentColor" stroke-width="2" stroke-dasharray="8 6" vector-effect="non-scaling-stroke" />
		<line x1="0" y1="11" x2="400" y2="11" stroke="currentColor" stroke-width="1" vector-effect="non-scaling-stroke" />
	{/if}
</svg>
