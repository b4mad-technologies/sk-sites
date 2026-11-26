<script lang="ts">
	import { Dialog } from "@spellkave/ui";

	let dialogOpen = $state(false);
</script>

<div class="flex flex-wrap gap-3">
	<Dialog
		bind:open={dialogOpen}
		title="Leave the loft?"
		description="The stair is still open. This overlay is a choice, not a new app."
		triggerLabel="Open dialog"
	>
		The world waits while this panel is open.
	</Dialog>
	<Dialog title="Disabled dialog" triggerLabel="Disabled" disabled />
</div>
