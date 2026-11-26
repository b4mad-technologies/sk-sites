<script lang="ts">
	import { FieldDetail } from "@spellkave/ui-widgets";
</script>

<div class="grid w-full gap-4 sm:grid-cols-[repeat(auto-fit,minmax(17rem,1fr))]">
	<FieldDetail
		label="Armor Class"
		value="16"
		description="Armor Class measures how difficult you are to hit."
		metadata={[{ label: "Source", value: "Worn armor and shield" }]}
	/>
	<FieldDetail label="Proficiency" value="+2" readState="loading" />
	<FieldDetail label="Heroic Inspiration" value="1" readState="failed" />
</div>
