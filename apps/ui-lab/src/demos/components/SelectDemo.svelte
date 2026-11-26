<script lang="ts">
	import { Select } from "@spellkave/ui";

	let selectValue = $state("look");

	const selectItems = [
		{ value: "look", label: "Look around" },
		{ value: "speak", label: "Speak" },
		{ value: "rest", label: "Rest", disabled: true },
	];
</script>

<div class="flex flex-wrap gap-3">
	<Select items={selectItems} bind:value={selectValue} placeholder="Choose an act" />
	<Select items={selectItems} value="look" disabled placeholder="Disabled" />
</div>
