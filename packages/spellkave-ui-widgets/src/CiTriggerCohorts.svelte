<script lang="ts">
	/** Display-only trigger cohorts; the host report supplies measurements and coverage. */
	import type { CiTriggerReportView } from "./ci-types";

	let {
		report,
		onSelectJob,
	}: {
		report: CiTriggerReportView;
		onSelectJob?: (id: string) => void;
	} = $props();
</script>

<section class="flex flex-col gap-3" data-report="trigger-cohorts">
	<h2 class="font-display text-2xl">{report.title}</h2>
	<p class="text-sm"><strong>{report.filter}</strong> · {report.range} · {report.scope}</p>
	<p class="font-mono text-xs text-muted-foreground">{report.window}</p>
	<p class="text-sm">{report.unknown_share}</p>
	<ul class="flex flex-wrap gap-x-5 gap-y-1 text-sm" aria-label="Trigger coverage">
		{#each report.buckets as bucket (bucket.trigger)}
			<li>{bucket.trigger}: <span class="font-mono tabular-nums">{bucket.count}</span></li>
		{/each}
	</ul>
	<p class="text-sm text-muted-foreground">{report.basis}</p>
	{#if report.empty}
		<p role="status">{report.empty}</p>
	{/if}
	{#if report.cohorts.length}
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm">
				<thead class="border-b border-border text-muted-foreground">
					<tr>
						<th class="py-2 pr-4">Job</th>
						<th class="pr-4">Trigger</th>
						<th class="pr-4">Profiled executions</th>
						<th class="pr-4">Mean wall time</th>
						<th>Measurements</th>
					</tr>
				</thead>
				<tbody>
					{#each report.cohorts as row (row.job + row.trigger)}
						<tr class="border-b border-border/40 align-top">
							<td class="py-3 pr-4">
								<button
									type="button"
									class="text-primary hover:underline"
									onclick={() => onSelectJob?.(row.job)}
								>{row.name}</button>
								<p class="text-xs text-muted-foreground">{row.workflow} · <code>{row.job}</code></p>
							</td>
							<td class="py-3 pr-4">{row.trigger}</td>
							<td class="py-3 pr-4 font-mono tabular-nums">{row.count}</td>
							<td class="py-3 pr-4 font-mono tabular-nums">{row.mean}</td>
							<td class="py-3 text-xs text-muted-foreground">{row.measured}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
	<p class="text-xs text-muted-foreground">{report.source}</p>
	<p class="text-xs text-muted-foreground">{report.coverage}</p>
	<p class="text-xs text-muted-foreground">{report.unknown_note}</p>
</section>
