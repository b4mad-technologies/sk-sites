<script lang="ts">
	/** The same retained failure rows and navigation printed by sk spire pr. */
	import type { CiPrHeadView } from "./ci-types";

	let { report }: { report: CiPrHeadView } = $props();
</script>

<section class="space-y-4 rounded-lg border border-border bg-card p-4" data-report="pr-head">
	<h2 class="font-display text-2xl">PR {report.pr} · observed heads</h2>
	<p class="text-sm">{report.source} · {report.coverage}</p>
	<p class="text-sm">{report.association_basis}</p>
	{#if report.window}<p class="text-sm">{report.window.from} → {report.window.to}</p>{/if}
	<p class="text-sm">{report.failure_coverage}</p>
	<p class="text-sm">Invalid records: {report.invalid_records ?? "unavailable"} · conflicting identities excluded: {report.conflicting_identities ?? "unavailable"} · duplicate deliveries: {report.duplicate_deliveries ?? "unavailable"}</p>
	{#if report.unavailable}<p role="status">{report.unavailable}</p>{/if}
	{#each report.heads as head (head.head_sha)}
		<section class="space-y-3">
			<h3 class="break-all font-mono text-sm">{head.head_sha}</h3>
			<p class="text-sm">{head.observed_attempts} observed CI selection attempts · time to green: {head.time_to_green_seconds === null ? "unavailable" : `${head.time_to_green_seconds} s`}</p>
			{#if head.unavailable}<p class="text-sm">{head.unavailable}</p>{/if}
			<p class="text-sm">{head.observed_failure_rows} observed failure rows · {head.omitted_failure_rows} omitted by display limit</p>
			{#if head.failures.length}
				<div class="overflow-x-auto">
					<table class="w-full text-left text-sm" aria-label="Observed failed workflows and jobs">
						<thead><tr><th>Workflow / job</th><th>Conclusion / identity coverage</th><th>Navigation</th></tr></thead>
						<tbody>
							{#each head.failures as row (`${row.run_id}:${row.attempt}:${row.job_id}`)}
								<tr class="border-t border-border align-top">
									<td class="p-2"><p>{row.workflow}{row.workflow_truncated ? " (truncated)" : ""}</p><p>{row.job ?? "unavailable"}{row.job_name_truncated ? " (truncated)" : ""}</p>{#if row.workflow_path}<p class="text-muted-foreground">{row.workflow_path}</p>{/if}</td>
									<td class="p-2"><p>{row.conclusion}</p><p>{row.identity_note}</p></td>
									<td class="space-y-1 p-2"><a class="block underline" href={row.run_url}>Run {row.run_id}</a><a class="block underline" href={row.attempt_url}>Attempt {row.attempt}</a>{#if row.job_url}<a class="block underline" href={row.job_url}>Job {row.job_id}</a>{/if}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</section>
	{/each}
</section>
