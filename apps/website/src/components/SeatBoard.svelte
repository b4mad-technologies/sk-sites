<script lang="ts">
	import type { AuthSession } from "@spellkave/authkit";
	import { Button } from "@spellkave/ui";
	import {
		type AccountApi,
		type AccountGetResponse,
		type AccountWorldSummary,
		formatAccountApiError,
	} from "../lib/account-api";
	import type { PublicWorld } from "../lib/public-site";
	import {
		displaySeatName,
		heroesFromWorld,
		type PlaySeat,
		playSeatsFromBoard,
		seatIsClaimable,
		type WorldHero,
	} from "../lib/seats";
	import WorldControls from "./WorldControls.svelte";

	/** Poll cadence for seat board + account role (no live SpacetimeDB subscription). */
	export const SEAT_POLL_MS = 8_000;

	let {
		worlds,
		session,
		createApi,
		pollMs = SEAT_POLL_MS,
	}: {
		worlds: PublicWorld[];
		session: AuthSession | null;
		/** Factory so tests inject a fake client; production passes AccountApi ctor. */
		createApi?: (token: string) => AccountApi;
		pollMs?: number;
	} = $props();

	let selectedSlug = $state<string | null>(null);
	let seats = $state<PlaySeat[]>([]);
	let heroes = $state<WorldHero[]>([]);
	let account = $state<AccountGetResponse | null>(null);
	let members = $state<string[]>([]);
	let joinPolicy = $state<"invite" | "open">("invite");
	let status = $state<string | null>(null);
	let busy = $state(false);
	/** Per-world seat cache so "My heroes" can span catalog worlds without N open sockets. */
	let seatsBySlug = $state<Map<string, PlaySeat[]>>(new Map());

	const selected = $derived(
		worlds.find((world) => world.slug === selectedSlug) ?? worlds[0] ?? null,
	);
	const selectedRole = $derived.by((): AccountWorldSummary["role"] | null => {
		const slug = selected?.slug;
		if (slug === undefined || account === null) return null;
		return account.worlds.find((world) => world.slug === slug)?.role ?? null;
	});
	const isOwner = $derived(selectedRole === "owner");

	$effect(() => {
		if (selectedSlug === null && worlds[0]) selectedSlug = worlds[0].slug;
	});

	$effect(() => {
		const token = session?.access_token;
		const factory = createApi;
		// Depend on catalog identity only — selected slug is painted from the cache
		// so switching worlds does not tear down the poller / recreate the client.
		const catalogKey = worlds.map((world) => world.slug).join("\n");
		if (token === undefined || factory === undefined || catalogKey === "") {
			account = null;
			seats = [];
			heroes = [];
			seatsBySlug = new Map();
			members = [];
			return;
		}
		const api = factory(token);
		const slugs = catalogKey.split("\n").filter((value) => value !== "");
		const worldNames = new Map(worlds.map((world) => [world.slug, world.name]));
		let cancelled = false;

		const refresh = async (): Promise<void> => {
			try {
				const nextAccount = await api.getAccount();
				if (cancelled) return;
				account = nextAccount;
			} catch (cause) {
				if (!cancelled) status = formatAccountApiError(cause);
			}

			const nextMap = new Map<string, PlaySeat[]>();
			const nextHeroes: WorldHero[] = [];
			const focusSlug = selectedSlug;
			for (const worldSlug of slugs) {
				if (cancelled) return;
				const worldName = worldNames.get(worldSlug) ?? worldSlug;
				try {
					const board = playSeatsFromBoard(await api.listSeats(worldSlug));
					if (cancelled) return;
					nextMap.set(worldSlug, board);
					nextHeroes.push(...heroesFromWorld(worldSlug, worldName, board));
				} catch (cause) {
					// Non-member invite worlds 403 — keep other worlds usable.
					if (worldSlug === focusSlug && !cancelled) {
						status = formatAccountApiError(cause);
					}
				}
			}
			if (cancelled) return;
			seatsBySlug = nextMap;
			heroes = nextHeroes;
		};

		status = null;
		void refresh();
		const timer = setInterval(() => void refresh(), pollMs);
		return () => {
			cancelled = true;
			clearInterval(timer);
		};
	});

	$effect(() => {
		const slug = selected?.slug ?? null;
		if (slug === null) {
			seats = [];
			return;
		}
		seats = seatsBySlug.get(slug) ?? seats;
	});

	async function withApi<T>(run: (api: AccountApi, slug: string) => Promise<T>): Promise<T | null> {
		const token = session?.access_token;
		const slug = selected?.slug;
		if (token === undefined || createApi === undefined || slug === undefined) return null;
		busy = true;
		status = null;
		try {
			return await run(createApi(token), slug);
		} catch (cause) {
			status = formatAccountApiError(cause);
			return null;
		} finally {
			busy = false;
		}
	}

	async function claim(actorId: string): Promise<void> {
		const result = await withApi(async (api, slug) => {
			await api.claimSeat(slug, actorId);
			return playSeatsFromBoard(await api.listSeats(slug));
		});
		if (result === null || selected === null) return;
		const next = new Map(seatsBySlug);
		next.set(selected.slug, result);
		seatsBySlug = next;
		seats = result;
		heroes = worlds.flatMap((world) =>
			heroesFromWorld(world.slug, world.name, next.get(world.slug) ?? []),
		);
	}

	async function releaseSeat(): Promise<void> {
		const result = await withApi(async (api, slug) => {
			await api.releaseSeat(slug);
			return playSeatsFromBoard(await api.listSeats(slug));
		});
		if (result === null || selected === null) return;
		const next = new Map(seatsBySlug);
		next.set(selected.slug, result);
		seatsBySlug = next;
		seats = result;
		heroes = worlds.flatMap((world) =>
			heroesFromWorld(world.slug, world.name, next.get(world.slug) ?? []),
		);
	}

	async function inviteMember(sub: string): Promise<void> {
		const result = await withApi(async (api, slug) => api.addMember(slug, sub));
		if (result !== null) members = result.members;
	}

	async function removeMember(sub: string): Promise<void> {
		const result = await withApi(async (api, slug) => api.removeMember(slug, sub));
		if (result !== null) members = result.members;
	}

	async function setJoinPolicy(next: "invite" | "open"): Promise<void> {
		const result = await withApi(async (api, slug) =>
			api.patchWorld(slug, { join_policy: next }),
		);
		if (result !== null) joinPolicy = result.join_policy;
	}

	async function resetWorld(): Promise<void> {
		const token = session?.access_token;
		const slug = selected?.slug;
		if (token === undefined || createApi === undefined || slug === undefined) return;
		busy = true;
		status = null;
		try {
			const api = createApi(token);
			const { job_id } = await api.requestReset(slug);
			for (let i = 0; i < 60; i += 1) {
				const job = await api.getResetStatus(slug, job_id);
				if (job.state === "done") {
					status = "World reset finished. Claim a seat again.";
					const board = playSeatsFromBoard(await api.listSeats(slug));
					const next = new Map(seatsBySlug);
					next.set(slug, board);
					seatsBySlug = next;
					seats = board;
					return;
				}
				if (job.state === "failed") {
					status = "World reset failed.";
					return;
				}
				await new Promise((resolve) => setTimeout(resolve, 500));
			}
			status = "World reset is still running. Refresh later.";
		} catch (cause) {
			status = formatAccountApiError(cause);
		} finally {
			busy = false;
		}
	}
</script>

<section id="seats" class="flex flex-col gap-6">
	<div class="flex flex-col gap-2">
		<h2 class="text-xl font-semibold tracking-tight">Servers and seats</h2>
		<p class="max-w-2xl text-sm text-muted-foreground">
			Public worlds from the catalog. Claim a free hero through the Account API; the same login is
			what MCP clients use. Seat updates refresh on a short poll after each action.
		</p>
		{#if session === null}
			<p class="text-sm text-muted-foreground">Log in to list seats and claim a hero.</p>
		{:else if createApi === undefined}
			<p class="text-sm text-muted-foreground">Account API client is not wired in this build.</p>
		{/if}
		{#if status}
			<p class="text-sm text-destructive">{status}</p>
		{/if}
	</div>

	{#if worlds.length === 0}
		<p class="text-sm text-muted-foreground">No public worlds in the catalog.</p>
	{:else}
		<nav class="flex flex-wrap gap-2" aria-label="Playable worlds">
			{#each worlds as world (world.slug)}
				<Button
					variant={selected?.slug === world.slug ? "default" : "outline"}
					aria-pressed={selected?.slug === world.slug}
					onclick={() => {
						selectedSlug = world.slug;
					}}
				>
					{world.name}
					{#if world.adventure}
						<span class="ml-1 text-xs opacity-70">{world.adventure}</span>
					{/if}
				</Button>
			{/each}
		</nav>

		{#if selected}
			<div class="rounded-xl border border-border bg-card p-5 text-sm">
				<p class="font-medium">{selected.name}</p>
				<p class="mt-1 text-muted-foreground">
					{#if selected.db}
						Database <code class="font-mono">{selected.db}</code>
					{:else}
						Catalog world <code class="font-mono">{selected.slug}</code>
					{/if}
					{#if selectedRole}
						<span class="ml-2 text-xs">· role {selectedRole}</span>
					{/if}
				</p>
				{#if session !== null && createApi !== undefined}
					<ul class="mt-4 flex flex-col gap-2" aria-label="Seats">
						{#each seats as seat (seat.actor_id)}
							<li
								class="flex items-center justify-between gap-3 rounded-md border border-border/70 px-3 py-2"
							>
								<span>
									<strong>{displaySeatName(seat)}</strong>
									<span class="ml-2 text-xs text-muted-foreground">
										{seat.mine ? "yours" : seat.claimed ? "taken" : "free"}
									</span>
								</span>
								{#if seat.mine}
									<Button
										size="sm"
										variant="outline"
										disabled={busy}
										onclick={() => void releaseSeat()}
									>
										Release
									</Button>
								{:else if seatIsClaimable(seat)}
									<Button size="sm" disabled={busy} onclick={() => void claim(seat.actor_id)}>
										Claim
									</Button>
								{:else if seat.claimed}
									<Button size="sm" variant="outline" disabled>Taken</Button>
								{:else}
									<Button size="sm" variant="outline" disabled>Not playable</Button>
								{/if}
							</li>
						{/each}
						{#if seats.length === 0}
							<li class="text-muted-foreground">No seats visible yet.</li>
						{/if}
					</ul>

					{#if isOwner}
						<WorldControls
							{busy}
							{members}
							{joinPolicy}
							onInvite={(sub) => void inviteMember(sub)}
							onRemove={(sub) => void removeMember(sub)}
							onJoinPolicy={(next) => void setJoinPolicy(next)}
							onReset={() => void resetWorld()}
						/>
					{/if}
				{/if}
			</div>
		{/if}
	{/if}

	<div class="flex flex-col gap-2">
		<h3 class="text-lg font-semibold tracking-tight">My heroes</h3>
		<p class="text-sm text-muted-foreground">
			Read-only across catalog worlds you can access via the Account API seat board.
		</p>
		{#if heroes.length === 0}
			<p class="text-sm text-muted-foreground">No claimed heroes on published worlds.</p>
		{:else}
			<ul class="text-sm">
				{#each heroes as hero (`${hero.worldSlug}:${hero.actor_id}`)}
					<li>{hero.name} · {hero.worldName}</li>
				{/each}
			</ul>
		{/if}
	</div>
</section>
