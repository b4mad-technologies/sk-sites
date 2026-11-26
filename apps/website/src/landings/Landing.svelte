<script lang="ts">
	import { theme } from "@spellkave/ui/theme";
	import BoardLanding from "./BoardLanding.svelte";
	import ChronicleLanding from "./ChronicleLanding.svelte";
	import WovenLanding from "./WovenLanding.svelte";

	/**
	 * One landing arrangement per theme world. The theme store is the single
	 * source of truth (cookie-persisted across *.spellkave.com); switching the
	 * theme recomposes the page rather than recolouring it.
	 */
	let { signInHref }: { signInHref: string } = $props();
</script>

{#if theme.id === "loom-paper"}
	<div id="top">
		<ChronicleLanding {signInHref} />
	</div>
{:else if theme.id === "worlds-in-motion"}
	<div id="top">
		<BoardLanding {signInHref} />
	</div>
{:else}
	<WovenLanding {signInHref} />
{/if}
