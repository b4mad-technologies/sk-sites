<script lang="ts">
	import InfoCardProvider from "./InfoCardProvider.svelte";
	import InfoLink from "./InfoLink.svelte";
	import type { InfoCardResolve } from "./types";

	// Reproduces the ui-lab demo's exact wiring: `open` is passed ONE-WAY
	// (never `bind:open`) and kept in sync purely through `onOpenChange` —
	// same as `InfoCardDemo.svelte`'s `infoCardOpen`/`onInfoCardOpenChange`.
	// The plain (uncontrolled) `info-card-test-harness.svelte` never passes
	// `open` at all, so it can't catch a regression that only shows up under
	// this externally-driven shape.
	let {
		resolve,
		openDelay,
		closeDelay,
		pinDwell,
		hostClosed = false,
	}: {
		resolve: InfoCardResolve;
		openDelay?: number;
		closeDelay?: number;
		pinDwell?: number;
		/**
		 * Simulates something ELSE in the host driving `open` to `false` while
		 * a card is open — e.g. the demo's ActionMenu closing the info card —
		 * as opposed to the provider's own `onOpenChange` doing it.
		 */
		hostClosed?: boolean;
	} = $props();

	let open = $state(false);

	function onOpenChange(next: boolean) {
		open = next;
	}

	$effect(() => {
		if (hostClosed) open = false;
	});
</script>

<InfoCardProvider {resolve} {openDelay} {closeDelay} {pinDwell} {open} {onOpenChange}>
	<p>
		Before <InfoLink refId="root">Root Link</InfoLink> after.
	</p>
</InfoCardProvider>

<button type="button">Outside</button>
