<script lang="ts">
	import {
		CapabilityView,
		capabilityRowView,
		EntryCompact,
		NicheView,
		nicheRowView,
		SlotView,
		slotRowView,
	} from "@spellkave/ui-widgets/catalogue";

	const walk = capabilityRowView(
		{
			capability_id: "core/walk",
			display_name: "Walk",
			actor_kind: "entity",
			default_visibility: "Public",
			bundle_id: "core",
			description: "Move to an adjacent place.",
		},
		undefined,
		() => undefined,
	);
	const niche = nicheRowView(
		{
			niche_id: "core/passable_portal",
			display_name: "Passable portal",
			bundle_id: "core",
			description: "An open way between places.",
		},
		undefined,
		() => undefined,
	);
	const slot = slotRowView(
		{
			slot_id: "srd/main-hand",
			display_name: "Main hand",
			bundle_id: "srd",
			description: "The primary held item.",
		},
		undefined,
		() => undefined,
	);
</script>

<div class="grid w-full gap-6 sm:grid-cols-2">
	<EntryCompact row={walk} />
	<CapabilityView row={walk} view="compact" />
	<NicheView row={niche} view="compact" />
	<SlotView row={slot} view="compact" />
</div>
