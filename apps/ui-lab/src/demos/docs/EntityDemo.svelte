<script lang="ts">
	import {
		DescriptionField,
		type DocsRowEntryView,
		EntryCompact,
		EntryHeading,
		FieldList,
	} from "@spellkave/ui-widgets/catalogue";

	const row: DocsRowEntryView = {
		ref: "srd/monster/goblin",
		title: "Goblin",
		kind_label: "Entity",
		description: "A small, black-hearted humanoid that lairs in caves and ruins.",
		fields: [
			{ label: "Family", value: "monster" },
			{ label: "Entity ID", value: "srd/monster/goblin", code: true },
			{ label: "Owning bundle", value: "srd" },
		],
	};
</script>

<div class="flex w-full max-w-[65ch] flex-col gap-6">
	<EntryHeading {row} />
	<DescriptionField description={row.description ?? ""} field="entity_definitions.description" />
	<FieldList fields={row.fields} />
	<EntryCompact {row} />
</div>
