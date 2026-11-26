<script lang="ts">
	import { cn } from "../lib/utils";
	import type { WovenCornerProps } from "./types";

	/**
	 * A corner ornament drawn as geometry in the theme's primary: an L of two
	 * hairlines with a stitched inner return and a small diamond at the elbow.
	 * Variants change the inner figure; the outer L is shared.
	 */
	const positions = {
		"top-left": "left-0 top-0",
		"top-right": "right-0 top-0 -scale-x-100",
		"bottom-left": "bottom-0 left-0 -scale-y-100",
		"bottom-right": "bottom-0 right-0 -scale-x-100 -scale-y-100",
	} as const;

	const figures = {
		branch: "M14 14 L14 60 M14 14 L60 14 M14 30 L30 14 M14 46 L46 14",
		stair: "M14 14 H40 V26 H28 V38 H14 Z",
		ladder: "M14 14 V64 M26 14 V64 M14 26 H26 M14 38 H26 M14 50 H26",
		bloom: "M14 14 C40 14 40 40 14 40 M14 14 C14 40 40 40 40 14",
	} as const;

	let {
		variant = "branch",
		position = "top-left",
		class: className,
	}: WovenCornerProps = $props();
</script>

<svg
	data-slot="woven-corner"
	data-variant={variant}
	aria-hidden="true"
	viewBox="0 0 96 96"
	class={cn(
		"pointer-events-none absolute z-0 size-24 origin-center text-[color:var(--primary)] sm:size-32",
		positions[position],
		className,
	)}
>
	<path d="M4 96 V4 H96" fill="none" stroke="currentColor" stroke-width="1.5" />
	<path d="M9 96 V9 H96" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3" />
	<path d={figures[variant]} fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" />
	<path d="M4 4 L9 -1 L14 4 L9 9 Z" fill="currentColor" />
</svg>
