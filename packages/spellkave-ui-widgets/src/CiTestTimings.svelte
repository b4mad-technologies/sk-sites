<script lang="ts">
	/** Display the complete shared local-file or live report used by sk spire. */
	import type { CiTestTimingsReportView } from "./ci-types";

	let {
		report,
	}: {
		report: CiTestTimingsReportView;
	} = $props();
</script>

<section class="rounded-lg border border-border bg-card p-4" data-report="test-timings">
	<h2 class="font-display text-2xl">{report.title}</h2>
	{#if report.script_phases.unavailable}
		<p class="mt-2 text-sm text-muted-foreground">{report.script_phases.unavailable}</p>
	{:else}
		<h3 class="mt-3 font-display text-lg">{report.step}</h3>
		<p class="text-xs text-muted-foreground">{report.script_phases.clock}</p>
		{#if report.script_phases.capped}<p>Phase records capped; coverage is partial.</p>{/if}
		<div class="overflow-auto">
			<table class="mt-2 w-full text-left text-sm">
				<thead><tr><th>Phase</th><th>Name</th><th>Started (UTC)</th><th>Duration</th><th>Outcome</th></tr></thead>
				<tbody>
					{#each report.script_phases.records as phase, index (index)}
						<tr><td>{phase.phase}</td><td>{phase.name}</td><td>{phase.started_at}</td><td>{phase.duration}</td><td>{phase.outcome}</td></tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
	<pre class="mt-3 overflow-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify(report, null, 2)}</pre>
</section>
