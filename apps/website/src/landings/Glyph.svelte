<script lang="ts">
	/** One-stroke glyphs for the landings; drawn, so every theme gets the same weight. */
	const paths: Record<string, string> = {
		before: "M10 3v14M4 8l6-5 6 5M5 17h10",
		who: "M7 5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM13 6a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM2 16c1-3 3-4 5-4s4 1 5 4M11 15c.5-2 2-3 3.5-3S17 13 17 15",
		changed: "M4 10h8m0 0-3-3m3 3-3 3M14 5v10",
		continues: "M3 10c3-5 6-5 9 0s6 5 5 0M15 8l2 2-2 2",
		enter: "M4 10h9m0 0-3-3m3 3-3 3M13 4h3v12h-3",
		watch: "M2 10s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5zM10 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4z",
		world: "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM3 10h14M10 3c3 3 3 11 0 14M10 3c-3 3-3 11 0 14",
		time: "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM10 6v4l3 2",
		people: "M7 5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM2 16c1-3 3-4 5-4s4 1 5 4M13 7a2 2 0 1 1 0 4M14 12c2 0 3.5 1.5 4 4",
		chevron: "M7 5l5 5-5 5",
		expand: "M5 8l5 5 5-5",
	};

	let { name, class: className = "size-4" }: { name: string; class?: string } = $props();
</script>

<svg
	viewBox="0 0 20 20"
	fill="none"
	stroke="currentColor"
	stroke-width="1.5"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
	class={className}
>
	<path d={paths[name] ?? paths.world} />
</svg>
