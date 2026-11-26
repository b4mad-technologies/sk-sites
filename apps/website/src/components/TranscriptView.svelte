<script lang="ts">
	import { RunEventsList, type TranscriptStep } from "@spellkave/run-events-view";
	import {
		fetchGatewayTranscript,
		fetchTranscript,
		formatClock,
		type PublicWorld,
	} from "../lib/public-site";

	let {
		base,
		world,
		mcpOrigin = "https://mcp.spellkave.com",
		accessToken = null,
		/** Sample builds keep the offline R2/demo JSONL path. */
		sample = false,
		pollMs = 5000,
		maxRows = 300,
	}: {
		base: string;
		world: PublicWorld;
		mcpOrigin?: string;
		accessToken?: string | null;
		sample?: boolean;
		pollMs?: number;
		maxRows?: number;
	} = $props();

	let steps = $state<TranscriptStep[]>([]);
	let error = $state<string | null>(null);
	let lastFetched = $state<Date | null>(null);
	let loading = $state(true);

	async function refresh(target: PublicWorld, token: string | null) {
		try {
			const all =
				sample || token === null
					? sample
						? await fetchTranscript(base, target)
						: []
					: await fetchGatewayTranscript(mcpOrigin, target.slug, token);
			if (target.slug !== world.slug) return;
			steps = all.length > maxRows ? all.slice(all.length - maxRows) : all;
			error = null;
		} catch (cause) {
			if (target.slug !== world.slug) return;
			error = cause instanceof Error ? cause.message : String(cause);
		} finally {
			if (target.slug === world.slug) {
				loading = false;
				lastFetched = new Date();
			}
		}
	}

	$effect(() => {
		const target = world;
		const token = accessToken;
		steps = [];
		error = null;
		loading = true;
		if (!sample && token === null) {
			loading = false;
			return;
		}
		void refresh(target, token);
		const timer = setInterval(() => void refresh(target, token), pollMs);
		return () => clearInterval(timer);
	});

	const needsLogin = $derived(!sample && accessToken === null);
</script>

<section class="flex min-h-[28rem] flex-col rounded-xl border border-border bg-card shadow-sm">
	<header class="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
		<div class="flex items-center gap-2">
			<span class="relative flex size-2.5">
				<span
					class={[
						"absolute inline-flex size-full rounded-full opacity-75",
						needsLogin || error ? "bg-destructive" : "animate-ping bg-primary",
					]}
				></span>
				<span
					class={[
						"relative inline-flex size-2.5 rounded-full",
						needsLogin || error ? "bg-destructive" : "bg-primary",
					]}
				></span>
			</span>
			<h3 class="text-sm font-semibold tracking-tight">Live transcript · {world.name}</h3>
		</div>
		<p class="text-xs text-muted-foreground">
			{#if needsLogin}
				login required
			{:else if loading}
				loading…
			{:else if error}
				feed unavailable ({error})
			{:else}
				{steps.length} calls · refreshed {lastFetched ? formatClock(lastFetched.toISOString()) : "—"} · every
				{Math.round(pollMs / 1000)}s
			{/if}
		</p>
	</header>

	<div class="max-h-[40rem] flex-1 overflow-y-auto px-2 py-2" aria-live="polite">
		{#if needsLogin}
			<p class="px-2 py-8 text-center font-sans text-sm text-muted-foreground">
				<strong class="text-foreground">Sign in</strong> to see transcripts. Any logged-in WorkOS account
				can read public catalog feeds (not public on the open internet).
			</p>
		{:else if !loading && !error}
			<RunEventsList
				{steps}
				emptyMessage="Nothing recorded yet. Connect an agent and its first tool call appears here."
			/>
		{/if}
	</div>
</section>
