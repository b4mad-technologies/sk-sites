<script lang="ts">
	import { RadioGroup } from "@spellkave/ui";

	let radioValue = $state("speak");

	const radioItems = [
		{ value: "speak", label: "Speak" },
		{ value: "whisper", label: "Whisper" },
		{ value: "wait", label: "Wait", disabled: true },
	];
</script>

<div class="grid w-full max-w-md gap-4">
	<RadioGroup items={radioItems} bind:value={radioValue} />
	<RadioGroup items={radioItems} value="speak" disabled />
</div>
