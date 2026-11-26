<script lang="ts">
	import { Switch } from "@spellkave/ui";

	let lanternOn = $state(true);
</script>

<div class="grid w-full max-w-lg gap-4 sm:grid-cols-2">
	<Switch bind:checked={lanternOn} label="Lantern" description="Checked is gold. Unchecked is muted navy." />
	<Switch checked={false} label="Disabled lantern" description="Disabled stays readable." disabled />
</div>
