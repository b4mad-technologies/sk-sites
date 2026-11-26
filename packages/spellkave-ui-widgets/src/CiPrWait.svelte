<script lang="ts">
	/** Display-only PR waiting, last-work and readiness evidence from the shared report. */
	import CiPrConcurrency from "./CiPrConcurrency.svelte";
	import CiPrWaitDaily from "./CiPrWaitDaily.svelte";
	import CiReadiness from "./CiReadiness.svelte";
	import CiReadinessAudit from "./CiReadinessAudit.svelte";
	import type { CiPrWaitReportView } from "./ci-types";

	let {
		report,
		onselectDefinition,
	}: {
		report: CiPrWaitReportView;
		onselectDefinition?: (job: string) => void;
	} = $props();
</script>

<section class="flex flex-col gap-4" data-report="pr-wait">
	<h2 class="font-display text-2xl">{report.title}</h2>
	<p class="text-sm">{report.population}</p>
	<p class="font-mono text-xs text-muted-foreground">{report.window}</p>
	<div class="grid gap-3 sm:grid-cols-3">
		<p class="rounded-lg border border-border p-4">
			<strong class="block text-3xl">{report.observed_heads}</strong> observed PR heads · {report.observed_prs} PRs
		</p>
		<p class="rounded-lg border border-border p-4">
			<strong class="block text-3xl">{report.median_time_to_green}</strong> median observed time to green
		</p>
		<p class="rounded-lg border border-border p-4">
			<strong class="block text-3xl">{report.measured_heads}</strong> heads with a measured wait · {report.unavailable_heads} unavailable
		</p>
	</div>
	<p class="text-sm text-muted-foreground">
		{report.unassociated_runs} CI selection runs have no explicit PR association.
	</p>
	{#if report.unavailable}
		<p role="status">{report.unavailable}</p>
	{/if}
	<CiPrWaitDaily view={report.daily} />
	{#if report.readiness_audit}
		<CiReadinessAudit view={report.readiness_audit} onselect={onselectDefinition} />
	{:else}
		<p class="text-sm text-muted-foreground">Per-head readiness is unavailable from this API response.</p>
	{/if}
	<h3 class="font-display text-xl">Actual last finisher, including aggregate gates</h3>
	{#if report.jobs.length}
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm" aria-label="Observed PR last finishers">
				<thead class="border-b border-border text-muted-foreground">
					<tr>
						<th class="py-2 pr-4">Last-finishing job</th>
						<th class="pr-4">Heads</th>
						<th class="pr-4">Share of measured heads</th>
						<th class="pr-4">Median head wait</th>
						<th>Median execution share of wait</th>
					</tr>
				</thead>
				<tbody>
					{#each report.jobs as row (row.workflow + row.job)}
						<tr class="border-b border-border/40 align-top">
							<td class="py-3 pr-4">
								{row.job}
								<p class="text-xs text-muted-foreground">{row.workflow}</p>
							</td>
							<td class="py-3 pr-4 font-mono">{row.last_finishing_heads}</td>
							<td class="py-3 pr-4 font-mono">{row.head_share}</td>
							<td class="py-3 pr-4 font-mono">{row.median_time_to_green}</td>
							<td class="py-3">
								<span class="font-mono">{row.execution_share}</span>
								<p class="text-xs text-muted-foreground">{row.share_samples}</p>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<h3 class="font-display text-xl">Last work before aggregate gate</h3>
	<p class="text-sm text-muted-foreground">{report.work_coverage}</p>
	{#if report.work_jobs.length}
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm" aria-label="Last work before aggregate gate">
				<thead class="border-b border-border text-muted-foreground">
					<tr>
						<th class="py-2 pr-4">Last work</th>
						<th class="pr-4">Heads</th>
						<th class="pr-4">Median head wait</th>
						<th class="pr-4">Own execution</th>
						<th class="pr-4">Before start</th>
						<th class="pr-4">After finish</th>
						<th>Outside own execution</th>
					</tr>
				</thead>
				<tbody>
					{#each report.work_jobs as row (row.workflow + row.job)}
						<tr class="border-b border-border/40 align-top">
							<td class="py-3 pr-4">
								{row.job}
								<p class="text-xs text-muted-foreground">{row.workflow}</p>
							</td>
							<td class="py-3 pr-4 font-mono">
								{row.last_finishing_heads}
								<p class="text-xs">{row.head_share}</p>
							</td>
							<td class="py-3 pr-4 font-mono">{row.median_time_to_green}</td>
							<td class="py-3 pr-4">
								<span class="font-mono">{row.median_execution} · {row.execution_share}</span>
								<p class="text-xs text-muted-foreground">{row.share_samples}</p>
							</td>
							<td class="py-3 pr-4 font-mono">{row.median_start_delay}</td>
							<td class="py-3 pr-4 font-mono">{row.median_tail}</td>
							<td class="py-3">
								<span class="font-mono">{row.median_outside_execution}</span>
								<p class="text-xs text-muted-foreground">{row.clock_samples}</p>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
	<p class="text-sm text-muted-foreground">{report.work_note}</p>
	<CiPrConcurrency view={report.concurrency} />
	<h3 class="font-display text-xl">Before-start readiness clocks</h3>
	<p class="text-sm text-muted-foreground">{report.readiness_note}</p>
	{#each report.readiness as view, index (view.workflow + view.work)}
		<CiReadiness {view} open={index === 0} />
	{/each}
	<p class="text-sm text-muted-foreground">{report.clock}</p>
	<details class="text-sm text-muted-foreground">
		<summary class="cursor-pointer">Coverage and interpretation</summary>
		<p class="mt-2">{report.source}</p>
		<p>{report.coverage}</p>
		<p>{report.note}</p>
		{#each report.unavailable_reasons as reason (reason)}
			<p>{reason}</p>
		{/each}
	</details>
</section>
