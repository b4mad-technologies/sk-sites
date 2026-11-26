<script lang="ts">
	import { type DocsRowEntryView, EntryCompact } from "@spellkave/ui-widgets/catalogue";

	const row: DocsRowEntryView = {
		ref: "core/walk",
		title: "Walk",
		kind_label: "Capability",
		description: "Move to an adjacent place.",
		fields: [
			{ label: "Actor kind", value: "entity" },
			{ label: "Default visibility", value: "Public" },
		],
	};
</script>

<div class="max-w-md">
	<EntryCompact {row} />
</div>
