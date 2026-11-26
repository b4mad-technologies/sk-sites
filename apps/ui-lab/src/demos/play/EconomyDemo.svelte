<script lang="ts">
	import { Economy, type EconomyChannel } from "@spellkave/ui-widgets";

	// These are returned channel rows, not a fixed player-action checklist.
	const returnedChannels: EconomyChannel[] = [
		{ channelId: "srd/economy_channel/primary", spentMs: 1, windowStartMs: 100 },
		{ channelId: "srd/economy_channel/bonus", spentMs: 0, windowStartMs: 100 },
		{ channelId: "srd/economy_channel/reaction", spentMs: 0, windowStartMs: 100 },
	];
</script>

<div class="grid w-full gap-4 sm:grid-cols-[repeat(auto-fit,minmax(17rem,1fr))]">
	<Economy channels={returnedChannels} />
	<Economy channels={[]} />
</div>

<p class="sk-label mt-6 mb-2 text-[color:var(--muted-foreground)]">
	density: strip | card | stage, default card
</p>
<div class="grid w-full gap-4 sm:grid-cols-[repeat(auto-fit,minmax(17rem,1fr))]">
	<Economy channels={returnedChannels} density="strip" />
	<Economy channels={returnedChannels} density="card" />
	<Economy channels={returnedChannels} density="stage" />
</div>
