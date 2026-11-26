<script lang="ts">
	import { Button } from "@spellkave/ui";

	let primaryRef = $state<HTMLButtonElement | null>(null);

	function focusPrimary() {
		primaryRef?.focus();
	}
</script>

<div class="grid gap-6">
	<!-- Woven frames: the product's own controls. Material follows the theme tokens. -->
	<div class="flex flex-wrap items-center gap-3">
		<Button variant="woven-primary" bind:ref={primaryRef}>Enter Spellkave</Button>
		<Button variant="woven-secondary" onclick={focusPrimary}>Watch a world</Button>
		<Button variant="woven-icon" size="compact" aria-label="Open settings">
			<svg class="size-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="10" cy="10" r="3" /><path d="M10 2v3M10 15v3M2 10h3M15 10h3M4.3 4.3l2.2 2.2M13.5 13.5l2.2 2.2M4.3 15.7l2.2-2.2M13.5 6.5l2.2-2.2" /></svg>
		</Button>
		<Button variant="woven-icon" size="seal" aria-label="Search worlds">
			<svg class="size-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5" /><path d="m12.5 12.5 4.5 4.5" /></svg>
		</Button>
		<Button variant="woven-primary" disabled>Waiting</Button>
	</div>
	<!-- Plain variants for dense operate surfaces. -->
	<div class="flex flex-wrap items-center gap-3">
		<Button>Primary action</Button>
		<Button variant="outline">Outline</Button>
		<Button variant="secondary">Secondary</Button>
		<Button variant="destructive">Error action</Button>
		<Button variant="ghost" disabled>Disabled</Button>
	</div>
</div>
