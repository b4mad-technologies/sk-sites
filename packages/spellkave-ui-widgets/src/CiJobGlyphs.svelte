<script lang="ts">
	/**
	 * A job in three pictures: how often it runs (a ring), how often it is red
	 * (a green bar with a red part), and how long it takes (a bar on one scale
	 * shared by every job, so the long ones stand out). The numbers sit small
	 * beside the pictures; the pictures carry the reading.
	 */
	import { formatDuration, formatRate, formatShare } from "./ci-format";
	import type { CiJobGlyphsProps } from "./ci-types";
	import InfoHint from "./InfoHint.svelte";

	let {
		triggerShare,
		redRate,
		meanSeconds,
		p95Seconds = null,
		scaleSeconds,
		size = "sm",
		alertAt = 0.2,
		parts = ["trigger", "red", "duration"],
		runs,
		minRuns = 5,
		summary,
	}: CiJobGlyphsProps = $props();

	const R = 7;
	const CIRCUMFERENCE = 2 * Math.PI * R;
	const clamp = (x: number) => Math.max(0, Math.min(1, x));
	const width = (share: number, floor = 0.03) => `${Math.max(floor, clamp(share)) * 100}%`;
	const dash = (share: number) => `${clamp(share) * CIRCUMFERENCE} ${CIRCUMFERENCE}`;
	const meanCaption = $derived(p95Seconds === null ? "mean" : `mean, p95 ${formatDuration(p95Seconds)}`);
	// A rate from a handful of runs reads as certain when it is not.
	const fewRuns = $derived(runs !== undefined && runs < minRuns);
	const alert = $derived(!fewRuns && redRate !== null && redRate >= alertAt);
	const show = (part: "trigger" | "red" | "duration") => parts.includes(part);
	const large = $derived(size === "lg");
</script>

{#snippet ring()}
	<svg viewBox="0 0 18 18" class={large ? "size-12" : "size-4"} aria-hidden="true">
		<circle cx="9" cy="9" r={R} fill="none" stroke-width="3" class={triggerShare === null ? "stroke-muted" : "stroke-primary/20"} stroke-dasharray={triggerShare === null ? "2 2" : undefined} />
		{#if triggerShare !== null}
			<circle cx="9" cy="9" r={R} fill="none" stroke-width="3" class="stroke-primary" stroke-dasharray={dash(triggerShare)} transform="rotate(-90 9 9)" />
		{/if}
	</svg>
{/snippet}

{#snippet redBar()}
	<span class={["block overflow-hidden rounded-full", large ? "h-3 w-full" : "h-1.5 w-12", redRate === null ? "border border-dashed border-border" : "bg-accent/50"]} aria-hidden="true">
		{#if redRate !== null && redRate > 0}
			<span class="block h-full rounded-full bg-destructive" style:width={width(redRate)}></span>
		{/if}
	</span>
{/snippet}

{#snippet durationBar()}
	<span class={["relative block rounded-full bg-muted", large ? "h-3 w-full" : "h-1.5 w-16"]} aria-hidden="true">
		{#if meanSeconds !== null && scaleSeconds > 0}
			<span class="block h-full rounded-full bg-primary/70" style:width={width(meanSeconds / scaleSeconds)}></span>
			{#if large && p95Seconds !== null}
				<span class="absolute -top-1 -bottom-1 w-0.5 bg-foreground/70" style:left={width(p95Seconds / scaleSeconds, 0)} title="p95"></span>
			{/if}
		{/if}
	</span>
{/snippet}

{#if large}
	<div class={["grid gap-3", show("trigger") ? "sm:grid-cols-3" : "sm:grid-cols-2"]} data-slot="ci-job-glyphs" data-size="lg">
		{#if show("trigger")}
			<div class="flex items-center gap-3 rounded-[var(--radius)] border border-border bg-card px-4 py-3">
				{@render ring()}
				<span class="flex flex-col">
					<span class="font-mono text-2xl leading-none tabular-nums">{formatShare(triggerShare)}</span>
					<span class="mt-1 flex items-center gap-1 text-xs text-muted-foreground">of PR pushes run it <InfoHint label="For a PR-routed job: its finished runs from every trigger divided by the runs of the PR selector, which runs on every PR push; an upper bound, since telemetry does not record which event started a job run. For other jobs: its finished runs divided by the runs of the busiest job of its workflow." /></span>
				</span>
			</div>
		{/if}
		<div class="flex flex-col justify-center gap-2 rounded-[var(--radius)] border border-border bg-card px-4 py-3">
			<span class="flex items-baseline justify-between gap-2">
				<span class={["font-mono text-2xl leading-none tabular-nums", alert ? "text-destructive" : ""]}>{formatRate(redRate)}</span>
				<span class="flex items-center gap-1 text-xs text-muted-foreground">of finished runs red <InfoHint label="Failures out of finished runs (success or failure); cancelled and skipped runs are not counted." /></span>
			</span>
			{@render redBar()}
		</div>
		<div class="flex flex-col justify-center gap-2 rounded-[var(--radius)] border border-border bg-card px-4 py-3">
			<span class="flex items-baseline justify-between gap-2">
				<span class="font-mono text-2xl leading-none tabular-nums">{formatDuration(meanSeconds)}</span>
				<span class="flex items-center gap-1 text-xs text-muted-foreground">{meanCaption} <InfoHint label="The bar uses one scale for every job (the slowest job's mean fills it); the tick marks p95." /></span>
			</span>
			{@render durationBar()}
		</div>
	</div>
{:else if summary !== undefined}
	<!-- One line of text after the bars: the job box and the CLI print the same line. -->
	<span class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground tabular-nums" data-slot="ci-job-glyphs" data-size="sm">
		{#if show("red")}<span title="Red in this share of finished runs">{@render redBar()}</span>{/if}
		{#if show("duration")}<span title="Mean duration, on one scale for all jobs">{@render durationBar()}</span>{/if}
		<span class={alert ? "text-destructive" : ""}>{summary}</span>
	</span>
{:else}
	<span class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground tabular-nums" data-slot="ci-job-glyphs" data-size="sm">
		{#if show("trigger")}
			<span class="flex items-center gap-1" title="Share of PR pushes (or of its workflow's runs) that run it">{@render ring()}{formatShare(triggerShare)}</span>
		{/if}
		{#if show("red")}
			{#if fewRuns}
				<span class="flex items-center gap-1 italic" title="Fewer than {minRuns} runs: a red rate would mean little">too few runs ({runs})</span>
			{:else}
				<span class={["flex items-center gap-1", alert ? "text-destructive" : ""]} title="Red in this share of finished runs">{@render redBar()}{formatRate(redRate)}</span>
			{/if}
		{/if}
		{#if show("duration")}
			<span class="flex items-center gap-1" title="Mean duration, on one scale for all jobs">{@render durationBar()}{formatDuration(meanSeconds)}</span>
		{/if}
	</span>
{/if}
