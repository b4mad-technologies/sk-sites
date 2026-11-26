<script lang="ts">
	import { loomFocus } from "../lib/loom";
	import { cn } from "../lib/utils";
	import { activitySummary, elapsed } from "./activity";
	import type { ActivityRowProps } from "./types";

	let {
		steps,
		working,
		startedAt,
		endedAt,
		selected = false,
		onopen,
		class: className,
	}: ActivityRowProps = $props();

	let now = $state(Date.now());
	$effect(() => {
		if (!working) return;
		now = Date.now();
		const timer = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(timer);
	});
	const failed = $derived(steps.filter((s) => s.status === "error").length);
	const current = $derived(steps.findLast((s) => s.status === "running" || s.status === "pending"));
	const text = $derived(
		working
			? `${current ? current.label : "Working"}${startedAt ? ` · ${elapsed(now - startedAt)}` : ""}`
			: activitySummary(steps.length, startedAt && endedAt ? endedAt - startedAt : undefined),
	);
	const base =
		"flex w-full min-w-0 items-center gap-2 rounded-[var(--radius)] border border-[color:var(--border)] px-3 py-1.5 text-left text-sm";
	const names = $derived([...new Set(steps.map((s) => s.label))].join(", "));
</script>

{#snippet inner()}
	<span
		aria-hidden="true"
		class={cn(
			"inline-block size-2.5 shrink-0 rounded-full",
			working ? "animate-pulse bg-[color:var(--primary)]" : failed ? "bg-[color:var(--destructive)]" : "bg-[color:var(--muted-foreground)]",
		)}
	></span>
	<span class="shrink-0 font-medium" aria-live={working ? "polite" : undefined}>{text}</span>
	{#if !working && names}<span class="min-w-0 truncate text-[color:var(--muted-foreground)]">{names}</span>{/if}
	{#if failed}<span class="shrink-0 text-[color:var(--destructive)]">{failed} failed</span>{/if}
{/snippet}

{#if onopen}
	<button
		type="button"
		onclick={onopen}
		data-slot="activity-row"
		data-working={working || undefined}
		aria-pressed={selected}
		class={cn(base, loomFocus, "cursor-pointer hover:bg-[color:var(--muted)]/15", selected && "border-[color:var(--primary)]", className)}
	>
		{@render inner()}
	</button>
{:else}
	<div data-slot="activity-row" data-working={working || undefined} class={cn(base, className)}>
		{@render inner()}
	</div>
{/if}
