<script lang="ts">
	import { DateTimePicker } from "@spellkave/ui";

	let sampleWhen = $state("2026-08-26T07:46:00Z");
</script>

<div class="w-full max-w-md">
	<DateTimePicker
		bind:iso={sampleWhen}
		label="Window start (UTC)"
		description="Segment field plus calendar. The bound value is always a Zulu instant."
	/>
	<p class="mt-3 text-sm text-[color:var(--muted-foreground)]">Bound value: {sampleWhen}</p>
</div>
