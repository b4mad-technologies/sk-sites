<script lang="ts">
	import { SeatBoard } from "@spellkave/ui/composition";

	let activeKey = $state<string | null>("srd-cc/7");
	const seats = [
		{ key: "srd-cc/7", hero: "Arwen", world: "SRD-CC" },
		{ key: "srd-cc/9", hero: "Borin", world: "SRD-CC" },
		{ key: "harbor/3", hero: "Cass", world: "Harbor of Ash", note: "world paused" },
	];
</script>

<div class="w-full max-w-xl">
	<SeatBoard {seats} {activeKey} onSelect={(key) => (activeKey = key)} />
</div>
