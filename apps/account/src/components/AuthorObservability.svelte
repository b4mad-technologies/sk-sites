<script lang="ts">
	import {
		Badge,
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle,
		Select,
	} from "@spellkave/ui";
	import {
		type AccountApi,
		type AccountWorldSummary,
		type AuthorCycleHealthResponse,
		type AuthorObsWindow,
		type AuthorRunEventsResponse,
		type AuthorToolCallsResponse,
		formatAccountApiError,
	} from "../lib/account-api";

	let {
		worlds,
		api,
	}: {
		worlds: AccountWorldSummary[];
		api: AccountApi;
	} = $props();

	const owned = $derived(worlds.filter((world) => world.role === "owner"));
	const items = $derived(owned.map((world) => ({ value: world.slug, label: world.display_name })));

	let slug = $state("");
	let timeWindow = $state<AuthorObsWindow>("6h");
	let cycles = $state<AuthorCycleHealthResponse | null>(null);
	let tools = $state<AuthorToolCallsResponse | null>(null);
	let events = $state<AuthorRunEventsResponse | null>(null);
	let cyclesError = $state<string | null>(null);
	let toolsError = $state<string | null>(null);
	let eventsError = $state<string | null>(null);
	let cyclesLoading = $state(false);
	let toolsLoading = $state(false);
	let eventsLoading = $state(false);

	$effect(() => {
		if (owned.length === 0) {
			slug = "";
			return;
		}
		if (!owned.some((world) => world.slug === slug)) {
			slug = owned[0]?.slug ?? "";
		}
	});

	$effect(() => {
		const selected = slug;
		const selectedWindow = timeWindow;
		const client = api;
		if (selected === "") {
			cycles = null;
			tools = null;
			events = null;
			cyclesError = null;
			toolsError = null;
			eventsError = null;
			cyclesLoading = false;
			toolsLoading = false;
			eventsLoading = false;
			return;
		}
		let cancelled = false;
		cycles = null;
		tools = null;
		events = null;
		cyclesError = null;
		toolsError = null;
		eventsError = null;
		cyclesLoading = true;
		toolsLoading = true;
		eventsLoading = true;
		void client.getAuthorCycles(selected, selectedWindow).then(
			(next) => {
				if (cancelled) return;
				cycles = next;
				cyclesError = null;
				cyclesLoading = false;
			},
			(cause) => {
				if (cancelled) return;
				cycles = null;
				cyclesError = formatAccountApiError(cause);
				cyclesLoading = false;
			},
		);
		void client.getAuthorToolCalls(selected, selectedWindow).then(
			(next) => {
				if (cancelled) return;
				tools = next;
				toolsError = null;
				toolsLoading = false;
			},
			(cause) => {
				if (cancelled) return;
				tools = null;
				toolsError = formatAccountApiError(cause);
				toolsLoading = false;
			},
		);
		void client.getAuthorEvents(selected, selectedWindow).then(
			(next) => {
				if (cancelled) return;
				events = next;
				eventsError = null;
				eventsLoading = false;
			},
			(cause) => {
				if (cancelled) return;
				events = null;
				eventsError = formatAccountApiError(cause);
				eventsLoading = false;
			},
		);
		return () => {
			cancelled = true;
		};
	});

	function formatMs(value: number | null): string {
		if (value === null) return "—";
		return `${Math.round(value)} ms`;
	}

	function formatTime(value: string | null): string {
		if (value === null || value === "") return "—";
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return value;
		return date.toISOString().replace("T", " ").replace(".000Z", " UTC");
	}

	function causeOf(event: { data: Record<string, string | number | boolean> }): string {
		const id = event.data.cause_id;
		return typeof id === "string" && id !== "" ? id : "—";
	}
</script>

{#if owned.length > 0}
	<section class="flex flex-col gap-4" data-testid="author-observability">
		<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
			<div class="flex flex-col gap-1">
				<h2
					class="[font-family:var(--font-display)] text-[1.25rem] font-medium leading-[1.25] tracking-[-0.025em]"
				>
					World observability
				</h2>
				<p class="max-w-[65ch] text-sm text-muted-foreground">
					NPC cycles, tool outcomes, and recent safe run events for worlds you own. This page never
					talks to the telemetry sink.
				</p>
			</div>
			<div class="flex flex-wrap gap-2">
				<Select {items} bind:value={slug} name="author-obs-world" placeholder="World" />
				<Select
					items={[
						{ value: "1h", label: "Last 1 hour" },
						{ value: "6h", label: "Last 6 hours" },
						{ value: "24h", label: "Last 24 hours" },
					]}
					bind:value={timeWindow}
					name="author-obs-window"
					placeholder="Window"
				/>
			</div>
		</div>

		<div class="grid gap-4">
			<Card data-testid="author-obs-cycles">
				<CardHeader>
					<CardTitle>NPC cycle health</CardTitle>
					<CardDescription>Per-seat cycle count, errors, and last seen.</CardDescription>
				</CardHeader>
				<CardContent>
					{#if cyclesError !== null}
						<p
							class="rounded-[var(--radius)] border border-destructive bg-destructive/10 px-3 py-2 text-sm"
							role="alert"
							data-testid="author-obs-cycles-error"
						>
							{cyclesError}
						</p>
					{:else if cyclesLoading && cycles === null}
						<p class="text-sm text-muted-foreground">Loading observability…</p>
					{:else if cycles === null || cycles.seats.length === 0}
						<p class="text-sm text-muted-foreground">No NPC cycles in this window.</p>
					{:else}
							<div class="overflow-x-auto">
								<table class="w-full text-left text-sm">
									<thead>
										<tr class="border-b border-border text-muted-foreground">
											<th class="py-2 pr-3 font-medium">Seat</th>
											<th class="py-2 pr-3 font-medium">Cycles</th>
											<th class="py-2 pr-3 font-medium">Errors</th>
											<th class="py-2 pr-3 font-medium">Avg duration</th>
											<th class="py-2 font-medium">Last seen</th>
										</tr>
									</thead>
									<tbody>
										{#each cycles.seats as seat (seat.seat)}
											<tr class="border-b border-border/60">
												<td class="py-2 pr-3 font-medium">{seat.seat}</td>
												<td class="py-2 pr-3">{seat.cycle_count}</td>
												<td class="py-2 pr-3">{seat.error_count}</td>
												<td class="py-2 pr-3">{formatMs(seat.avg_duration_ms)}</td>
												<td class="py-2">{formatTime(seat.last_seen)}</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{/if}
					</CardContent>
				</Card>

				<Card data-testid="author-obs-tools">
					<CardHeader>
						<CardTitle>Tool-call outcomes</CardTitle>
						<CardDescription>Bounded tool names, ok versus error.</CardDescription>
					</CardHeader>
					<CardContent>
						{#if toolsError !== null}
							<p
								class="rounded-[var(--radius)] border border-destructive bg-destructive/10 px-3 py-2 text-sm"
								role="alert"
								data-testid="author-obs-tools-error"
							>
								{toolsError}
							</p>
						{:else if toolsLoading && tools === null}
							<p class="text-sm text-muted-foreground">Loading observability…</p>
						{:else if tools === null || tools.tools.length === 0}
							<p class="text-sm text-muted-foreground">No tool calls in this window.</p>
						{:else}
							<ul class="flex flex-col gap-2">
								{#each tools.tools as row (row.tool_name)}
									<li class="flex flex-wrap items-center gap-2">
										<span class="font-medium">{row.tool_name}</span>
										<Badge variant="secondary">ok {row.ok}</Badge>
										<Badge variant={row.error > 0 ? "destructive" : "outline"}>
											error {row.error}
										</Badge>
									</li>
								{/each}
							</ul>
						{/if}
					</CardContent>
				</Card>

				<Card data-testid="author-obs-events">
					<CardHeader>
						<CardTitle>Recent run events</CardTitle>
						<CardDescription>Safe fields only; cause_id when the world recorded one.</CardDescription>
					</CardHeader>
					<CardContent>
						{#if eventsError !== null}
							<p
								class="rounded-[var(--radius)] border border-destructive bg-destructive/10 px-3 py-2 text-sm"
								role="alert"
								data-testid="author-obs-events-error"
							>
								{eventsError}
							</p>
						{:else if eventsLoading && events === null}
							<p class="text-sm text-muted-foreground">Loading observability…</p>
						{:else if events === null || events.events.length === 0}
							<p class="text-sm text-muted-foreground">No run events in this window.</p>
						{:else}
							<div class="overflow-x-auto">
								<table class="w-full text-left text-sm">
									<thead>
										<tr class="border-b border-border text-muted-foreground">
											<th class="py-2 pr-3 font-medium">When</th>
											<th class="py-2 pr-3 font-medium">Type</th>
											<th class="py-2 pr-3 font-medium">Seat</th>
											<th class="py-2 font-medium">Cause</th>
										</tr>
									</thead>
									<tbody>
										{#each events.events as event, index (`${event.run_id}-${index}`)}
											<tr class="border-b border-border/60">
												<td class="py-2 pr-3">{formatTime(event.ts)}</td>
												<td class="py-2 pr-3">{event.event_type}</td>
												<td class="py-2 pr-3">{event.actor_id}</td>
												<td class="py-2">{causeOf(event)}</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{/if}
					</CardContent>
				</Card>
			</div>
	</section>
{/if}
