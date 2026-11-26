<script lang="ts">
	import {
		DescriptionField,
		type DocsRowEntryView,
		EntryCompact,
		EntryHeading,
		FieldList,
	} from "@spellkave/ui-widgets/catalogue";

	const row: DocsRowEntryView = {
		ref: "srd/hp",
		title: "Hit Points",
		kind_label: "Resource",
		description: "The pool that tracks remaining vitality.",
		fields: [
			{ label: "Kind", value: "int" },
			{ label: "Resource ID", value: "srd/hp", code: true },
			{ label: "Owning bundle", value: "srd" },
		],
	};
</script>

<div class="flex w-full max-w-[65ch] flex-col gap-6">
	<EntryHeading {row} />
	<DescriptionField description={row.description ?? ""} field="resource_definitions.description" />
	<FieldList fields={row.fields} />
	<EntryCompact {row} />
</div>
