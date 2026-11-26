<script lang="ts">
	/**
	 * One-stroke glyphs for play widgets: action verbs, occupant kinds, and a
	 * compass for exits. Drawn, not typed, so every theme gets the same weight.
	 */
	const paths: Record<string, string> = {
		speak: "M3 4h14v9H8l-4 3v-3H3z",
		walk: "M8 3a1 1 0 1 0 0 2 1 1 0 0 0 0-2zM6 17l2-6 1-2 2 1 1 3 3 1M9 9l-3 2v3M12 11l1 6",
		melee: "M4 16 14 6m0 0 2-2M14 6l-1-1M5 15l-2 2M10 8l3 3",
		claim: "M10 3l2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1z",
		person: "M10 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM4 17c1-3 3-4 6-4s5 1 6 4",
		thing: "M4 7l6-3 6 3v7l-6 3-6-3zM10 10l6-3M10 10 4 7M10 10v7",
		creature: "M4 12c0-4 3-7 6-7s6 3 6 7l-2 3H6zM7 9h1M12 9h1M4 12l-1 3M16 12l1 3",
		compass: "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM10 5v2M10 13v2M5 10h2M13 10h2M12.5 7.5 11 11l-3.5 1.5L9 9z",
		map: "M3 5l5-2 4 2 5-2v12l-5 2-4-2-5 2zM8 3v12M12 5v12",
		chronicle: "M5 3h8l3 3v11H5zM13 3v3h3M8 9h5M8 12h5",
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
	<path d={paths[name] ?? paths.thing} />
</svg>
