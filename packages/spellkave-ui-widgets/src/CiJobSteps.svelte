<script lang="ts">
	/**
	 * What a job runs, as one table: each step on a row with its red rate,
	 * mean time and run count in columns on the right, so the numbers line up
	 * and a red step stands out without reading every line. Setup steps and
	 * the raw commands are folded; one switch shows every command at once.
	 */
	import CiActionSteps from "./CiActionSteps.svelte";
	import CiCheckSummary from "./CiCheckSummary.svelte";
	import CiFailedRuns from "./CiFailedRuns.svelte";
	import CiProse from "./CiProse.svelte";
	import { formatDuration, formatMean, formatStepRate } from "./ci-format";
	import { CI_GLOSSARY } from "./ci-glossary";
	import type { CiJobStepsProps, CiStepTargetView } from "./ci-types";
	import InfoHint from "./InfoHint.svelte";

	let { steps, commandComparisons = [], onOpenTarget, alertAt = 0.2, resolve, onExpand, onMore, minRuns = 5 }: CiJobStepsProps = $props();

	// Opened steps, by their index in `steps` (the visible list folds setup away).
	let opened = $state<ReadonlySet<number>>(new Set());
	function toggle(index: number): void {
		const next = new Set(opened);
		if (next.has(index)) next.delete(index);
		else {
			next.add(index);
			onExpand?.(index);
		}
		opened = next;
	}

	let showSetup = $state(false);
	let showCommands = $state(false);
	const setupCount = $derived(steps.filter((s) => s.kind === "setup").length);
	const visible = $derived(showSetup ? steps : steps.filter((s) => s.kind !== "setup"));
	const withStats = $derived(steps.some((s) => s.stats && s.stats.runs > 0));
	// Time bars are relative to the slowest step, so the bottleneck is the full bar;
	// the tooltip gives each step's share of the whole job's step time.
	const slowest = $derived(Math.max(0, ...steps.map((s) => s.stats?.meanSeconds ?? 0)));
	const stepTotal = $derived(steps.reduce((sum, s) => sum + (s.stats?.meanSeconds ?? 0), 0));
	const shareTitle = (mean: number | null) =>
		mean !== null && stepTotal > 0 ? `${Math.round((mean / stepTotal) * 100)} % of this job's step time` : undefined;
	const barWidth = (mean: number) => `${Math.max(4, (mean / slowest) * 100)}%`;

	const cols = "grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_3.5rem] gap-x-3";
</script>

{#snippet chip(target: CiStepTargetView)}
	{#if target.open}
		<button
			type="button"
			class="rounded-sm border border-border/70 px-1.5 py-0.5 text-left hover:border-primary hover:text-foreground"
			title={target.detail}
			onclick={() => onOpenTarget?.(target.open as string)}
		>
			<!-- The type lives on the span: the shared button reset would override it on the button. -->
			<span class="font-mono text-xs">{target.label}</span>
		</button>
	{:else}
		<span class="inline-block rounded-sm border border-border/50 px-1.5 py-0.5 font-mono text-xs text-muted-foreground" title={target.detail}>{target.label}</span>
	{/if}
{/snippet}

<div class="flex flex-col gap-2" data-slot="ci-job-steps">
	{#each commandComparisons as comparison (comparison)}
		<div class="rounded border border-border p-3 text-sm">
			<p class="font-medium">{comparison.label}</p>
			<code class="whitespace-pre-wrap break-all text-xs">{comparison.command}</code>
			<p class="text-xs">{comparison.steps.join(" → ")}</p>
			<p>{comparison.cost}</p>
			<p class="text-xs text-muted-foreground">{comparison.note}</p>
		</div>
	{/each}
	<div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
		{#if setupCount > 0}
			<button type="button" class="underline-offset-2 hover:text-foreground hover:underline" onclick={() => (showSetup = !showSetup)}>
				{showSetup ? "Hide" : "Show"} {setupCount} setup steps
			</button>
		{/if}
		<button type="button" class="underline-offset-2 hover:text-foreground hover:underline" onclick={() => (showCommands = !showCommands)}>
			{showCommands ? "Hide" : "Show"} commands
		</button>
	</div>

	<div role="table" aria-label="Steps" class="flex flex-col">
		{#if withStats}
			<div role="row" class={[cols, "border-b border-border/60 pb-1 text-xs text-muted-foreground"]}>
				<span role="columnheader">Step</span>
				<span role="columnheader" class="flex items-center justify-end gap-1">red <InfoHint label={CI_GLOSSARY.stepFailed} /></span>
				<span role="columnheader" class="text-right">mean</span>
				<span role="columnheader" class="text-right">runs</span>
			</div>
		{/if}
		{#each visible as step, index (index)}
			{@const at = steps.indexOf(step)}
			{@const isOpen = opened.has(at)}
			{@const fewRuns = (step.stats?.runs ?? 0) < minRuns}
			{@const red = !fewRuns && step.stats?.redRate !== null && step.stats?.redRate !== undefined && step.stats.redRate >= alertAt}
			<!-- An expandable step opens its packages in place; their chips would repeat the title and only lead to the package page. -->
			{@const chips = step.expandable ? step.targets.filter((t) => !t.open?.startsWith("pkg:")) : step.targets}
			{@const failed = (step.stats?.failures ?? 0) > 0}
			<div role="row" class={[cols, "border-b border-border/30 py-2 last:border-b-0", red ? "bg-destructive/10" : ""]}>
				<div role="cell" class="flex min-w-0 flex-col gap-1">
					{#if step.expandable}
						<button
							type="button"
							class="flex items-center gap-1.5 text-left text-sm leading-5 hover:text-primary"
							aria-expanded={isOpen}
							onclick={() => toggle(at)}
						>
							<svg viewBox="0 0 20 20" class={["size-3.5 shrink-0 text-muted-foreground transition-transform", isOpen ? "rotate-90" : ""]} aria-hidden="true"><path d="M7 5l6 5-6 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
							<span>{#if red}<span class="sr-only">failing: </span>{/if}{step.title}</span>
						</button>
					{:else}
						<p class={["text-sm leading-5", (step.kind === "setup" || step.kind === "action") && !step.action ? "text-muted-foreground" : ""]}>
							{#if red}<span class="sr-only">failing: </span>{/if}{step.title}
							{#if step.action}<span class="ml-1 font-mono text-xs text-muted-foreground">{step.action.where}</span>{/if}
						</p>
					{/if}
					{#if step.note}
						<p class="max-w-[72ch] text-xs leading-relaxed whitespace-pre-line text-muted-foreground"><CiProse text={step.note} {resolve} /></p>
					{:else if step.teaser && !isOpen}
						<p class="max-w-[72ch] text-xs leading-relaxed text-muted-foreground">{step.teaser}</p>
					{/if}
					{#if step.condition}
						<p class="font-mono text-xs break-all text-muted-foreground">if {step.condition}</p>
					{/if}
					{#if step.action}
						<CiActionSteps action={step.action} />
					{/if}
					{#if step.failed_runs}
						<CiFailedRuns failed={step.failed_runs} />
					{/if}
					{#if chips.length > 0}
						<ul class="flex flex-wrap gap-1.5">
							{#each chips as target (target.key)}
								<li>{@render chip(target)}</li>
							{/each}
						</ul>
					{/if}
					{#each step.expansions ?? [] as expansion (expansion.title)}
						<div class="mt-1 flex flex-col gap-2 rounded-sm bg-muted/30 p-3">
							<p class="flex flex-wrap items-baseline gap-x-2 text-sm">
								<span class="font-mono">{expansion.title}</span>
								{#if expansion.where}<span class="font-mono text-xs text-muted-foreground">{expansion.where}</span>{/if}
								<span class="text-xs text-muted-foreground">runs {expansion.commands.length} commands</span>
							</p>
							{#if expansion.doc}
								<p class="max-w-[72ch] text-xs leading-relaxed whitespace-pre-line text-muted-foreground"><CiProse text={expansion.doc} {resolve} /></p>
							{/if}
							{#if expansion.dependencies && expansion.dependencies.length > 0}
								<p class="text-xs text-muted-foreground">first runs: <span class="font-mono">{expansion.dependencies.join(", ")}</span></p>
							{/if}
							<ol class="flex flex-col gap-2">
								{#each expansion.commands as item, n (n)}
									<li class="flex flex-col gap-0.5 border-l border-border/60 pl-2">
										{#if item.targets.length > 0}
											<ul class="flex flex-wrap gap-1.5">
												{#each item.targets as target (target.key)}
													<li>{@render chip(target)}</li>
												{/each}
											</ul>
										{:else}
											<code class="font-mono text-xs break-all">{item.command}</code>
										{/if}
										{#if item.summary}
											{@const [lead, ...rest] = item.summary.split(/(?<=[.:])\s+|\n\n/)}
											{#if rest.length > 0}
												<details class="max-w-[72ch] text-xs leading-relaxed">
													<summary class="cursor-pointer"><CiProse text={lead ?? ""} {resolve} /></summary>
													<p class="mt-1 whitespace-pre-line text-muted-foreground"><CiProse text={rest.join(" ")} {resolve} /></p>
												</details>
											{:else}
												<p class="max-w-[72ch] text-xs leading-relaxed"><CiProse text={lead ?? ""} {resolve} /></p>
											{/if}
										{:else if item.targets.some((t) => t.open?.startsWith("gh:"))}
											<p class="text-xs text-muted-foreground italic">No header comment says what this checks.</p>
										{/if}
										{#if item.comment}
											<details class="text-xs text-muted-foreground">
												<summary class="cursor-pointer">recipe note</summary>
												<p class="mt-1 leading-relaxed whitespace-pre-line"><CiProse text={item.comment} {resolve} /></p>
											</details>
										{/if}
									</li>
								{/each}
							</ol>
						</div>
					{/each}
					{#if isOpen}
						{#if step.details === undefined}
							<p class="text-xs text-muted-foreground">Reading the package…</p>
						{:else}
							{#each step.details as detail (detail.key)}
								<CiCheckSummary {detail} {resolve} onOpen={onOpenTarget} {...(onMore ? { onMore: () => onMore(detail.key) } : {})} />
							{/each}
						{/if}
					{/if}
					{#if showCommands && step.command}
						<pre class="max-h-48 overflow-auto rounded-sm bg-muted/40 p-2 font-mono text-xs whitespace-pre-wrap">{step.command}</pre>
					{/if}
				</div>
				{#if step.stats && step.stats.runs > 0}
					{@const mean = step.stats.meanSeconds}
					{#if fewRuns}
						<span role="cell" class="text-right text-xs text-muted-foreground italic" title="Fewer than {minRuns} runs: a red rate would mean little">too few</span>
					{:else}
						<span role="cell" class={["text-right font-mono text-sm tabular-nums", red ? "text-destructive" : failed ? "text-foreground" : "text-muted-foreground"]} title="{step.stats.failures} of {step.stats.runs} failed">{formatStepRate(step.stats, minRuns)}</span>
					{/if}
					<span role="cell" class="flex flex-col items-end gap-1" title={shareTitle(mean)}>
						<span class="font-mono text-sm text-muted-foreground tabular-nums">{formatMean(mean)}</span>
						{#if mean !== null && slowest > 0}
							<span class="h-1 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
								<span class={["block h-full rounded-full", mean === slowest ? "bg-primary" : "bg-primary/45"]} style:width={barWidth(mean)}></span>
							</span>
						{/if}
					</span>
					<span role="cell" class="text-right font-mono text-sm text-muted-foreground tabular-nums">{step.stats.runs}</span>
				{:else if withStats && step.kind !== "setup"}
					<span role="cell" class="col-span-3 text-right text-xs text-muted-foreground" title="OpenObserve has no runs of this step in the window">no runs</span>
				{:else}
					<span role="cell" class="col-span-3"></span>
				{/if}
			</div>
		{/each}
	</div>
</div>
