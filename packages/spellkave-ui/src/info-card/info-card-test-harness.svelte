<script lang="ts">
	import InfoCardProvider from "./InfoCardProvider.svelte";
	import InfoLink from "./InfoLink.svelte";
	import type { InfoCardResolve } from "./types";

	// Test-only wrapper: gives InfoLink a Provider ancestor and one fixed
	// root-level trigger; every scenario is expressed through what `resolve`
	// returns (matching `dock-bar-test-harness.svelte`'s pattern).
	let {
		resolve,
		openDelay,
		closeDelay,
		pinDwell,
		hideRootLink = false,
	}: {
		resolve: InfoCardResolve;
		openDelay?: number;
		closeDelay?: number;
		pinDwell?: number;
		/** Simulates a stream list re-render dropping the opening link while its card stays open. */
		hideRootLink?: boolean;
	} = $props();
</script>

<InfoCardProvider {resolve} {openDelay} {closeDelay} {pinDwell}>
	<p>
		Before {#if !hideRootLink}<InfoLink refId="root">Root Link</InfoLink>{/if} after.
	</p>
</InfoCardProvider>

<button type="button">Outside</button>
