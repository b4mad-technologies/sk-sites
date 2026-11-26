<script lang="ts">
	import { JourneyBand, NarrativeHero } from "@spellkave/ui";
	import CuratedWorldPreview from "../components/CuratedWorldPreview.svelte";

	/**
	 * Living Grammar landing: the woven night world. The hero shows the river
	 * road at dusk; the curated example below keeps the guarded bridge, so no
	 * two sections share one image.
	 */
	let {
		signInHref,
		watchHref = "#watch",
	}: { signInHref: string; watchHref?: string } = $props();
</script>

<div id="top">
	<NarrativeHero
		imageUrl="/assets/worlds/woven-river-road.webp"
		imageAlt="A woven hillside settlement at dusk seen from the river road, lanterns lit, a ferry crossing and travellers arriving"
		primaryAction={{ label: "Enter Spellkave", href: signInHref }}
		secondaryAction={{ label: "Watch a world", href: watchHref }}
	/>
</div>
<JourneyBand />
<CuratedWorldPreview {signInHref} />
