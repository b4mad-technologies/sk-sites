<script lang="ts">
	import { Button, Checkbox } from "@spellkave/ui";

	let checkboxRef = $state<HTMLButtonElement | null>(null);
	let newsletter = $state(false);
	let consent = $state(false);

	function focusCheckbox() {
		checkboxRef?.focus();
	}
</script>

<div class="grid w-full max-w-md gap-4">
	<Checkbox
		bind:ref={checkboxRef}
		bind:checked={newsletter}
		label="Receive UI Lab notes"
		description="A normal checkbox with a clear label and supporting help text."
	/>
	<div class="flex flex-wrap gap-3">
		<Button size="sm" variant="outline" onclick={focusCheckbox}>Focus checkbox</Button>
		<Button size="sm" variant="secondary" onclick={() => (newsletter = !newsletter)}>
			Toggle programmatically
		</Button>
	</div>
	<Checkbox
		checked={true}
		label="Read-only published state"
		description="Disabled stays visible and in place; it never becomes a mystery."
		disabled
	/>
	<Checkbox
		bind:checked={consent}
		label="Confirm the lab checklist"
		description="Error text is the recovery path, not just a red border."
		error={consent ? undefined : "You need to confirm the checklist before leaving this page."}
	/>
	<Button size="sm" variant="outline" onclick={() => (consent = !consent)}>Toggle error state</Button>
</div>
