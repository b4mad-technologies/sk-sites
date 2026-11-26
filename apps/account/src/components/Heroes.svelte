<script lang="ts">
	import { SeatBoard, type SeatBoardSeat } from "@spellkave/ui";
	import type { AccountApi, AccountWorldSummary } from "../lib/account-api";
	import { playHrefForSeat } from "../lib/play";

	/**
	 * Every hero this person holds, across the worlds the account lists
	 * (ADR-0161 D-6). "Play" opens Play as that hero; switching heroes needs no
	 * new sign-in. Built from each world's seat board (`mine` rows); a world
	 * whose board fails to load is skipped.
	 */
	let {
		worlds,
		api,
		playAppUrl,
		navigate = (url: string) => window.location.assign(url),
	}: {
		worlds: AccountWorldSummary[];
		api: AccountApi;
		playAppUrl: string;
		navigate?: (url: string) => void;
	} = $props();

	let seats = $state<SeatBoardSeat[]>([]);
	let loaded = $state(false);

	$effect(() => {
		const client = api;
		const list = worlds;
		let cancelled = false;
		void Promise.all(
			list.map(async (world) => {
				try {
					const rows = await client.getSeats(world.slug);
					return rows
						.filter((row) => row.mine)
						.map((row) => ({
							key: `${world.slug}/${String(row.actor_id)}`,
							hero: row.name?.trim() || `Hero #${String(row.actor_id)}`,
							world: world.display_name,
							...(world.paused ? { note: "world paused" } : {}),
						}));
				} catch {
					return [];
				}
			}),
		).then((perWorld) => {
			if (cancelled) return;
			seats = perWorld.flat();
			loaded = true;
		});
		return () => {
			cancelled = true;
		};
	});

	function play(key: string): void {
		const slash = key.lastIndexOf("/");
		navigate(playHrefForSeat(key.slice(0, slash), key.slice(slash + 1), playAppUrl));
	}
</script>

{#if loaded}
	<SeatBoard
		{seats}
		onSelect={play}
		selectLabel="Play"
		emptyText="You hold no hero yet. Pick one in Play."
	/>
{/if}
