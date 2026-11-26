<script lang="ts">
	import { Inspect } from "@spellkave/ui-widgets";
</script>

<div class="max-w-sm">
	<Inspect
		title="Aldwin"
		description="Aldwin sits by the hearth, ledger open on his knee."
		facts={[
			{ label: "Place", value: "Inn · Common room" },
			{ label: "Faction", value: "Phandalin" },
		]}
		carried={[{ id: "ledger", name: "Ledger" }]}
		here={[
			{ id: "mira", name: "Mira" },
			{ id: "maelis", name: "Sister Maelis" },
		]}
	/>
</div>
