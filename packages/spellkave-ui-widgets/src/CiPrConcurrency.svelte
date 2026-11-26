<script lang="ts">
	/** Display-only observed execution overlap, with source coverage and reservation limits. */
	import type { CiPrConcurrencyView } from "./ci-types";

	let {
		view,
	}: {
		view: CiPrConcurrencyView;
	} = $props();
</script>

<section class="flex flex-col gap-3" data-report="pr-concurrency">
	<h3 class="font-display text-xl">{view.title}</h3>
	<p class="text-sm">{view.scope}</p>
	<p class="text-sm text-muted-foreground">{view.coverage}</p>
	<div class="grid gap-3 sm:grid-cols-3">
		<p class="rounded-lg border border-border p-3">
			<strong class="block text-2xl">{view.critical_peak ?? "unavailable"}</strong>
			peak simultaneous critical jobs across all retained runs
		</p>
		<p class="rounded-lg border border-border p-3">
			<strong class="block text-2xl">{view.critical_job_time}</strong>
			critical job-time · {view.critical_wall_time} with critical work running
		</p>
		<p class="rounded-lg border border-border p-3">
			<strong class="block text-2xl">{view.other_job_time_during_critical}</strong>
			other job-time during critical execution · {view.other_peak ?? "unavailable"} peak simultaneous other jobs
		</p>
	</div>
	<p class="text-sm text-muted-foreground">{view.measurement_note}</p>
	{#if view.heads.length}
		<details>
			<summary class="cursor-pointer text-sm">Per PR head: observed concurrency</summary>
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm" aria-label="Observed critical-job concurrency by PR head">
					<thead class="border-b border-border text-muted-foreground">
						<tr>
							<th class="py-2 pr-4">PR / head</th>
							<th class="pr-4">Critical jobs</th>
							<th class="pr-4">Critical peak</th>
							<th class="pr-4">Critical peak in first minute</th>
							<th class="pr-4">Other peak</th>
							<th>Other job-time during critical execution</th>
						</tr>
					</thead>
					<tbody>
						{#each view.heads as row (row.pr + row.head)}
							<tr class="border-b border-border/40 align-top">
								<td class="py-3 pr-4">
									#{row.pr}
									<p class="font-mono text-xs break-all">{row.head}</p>
									<p class="text-xs text-muted-foreground">{row.coverage}</p>
								</td>
								<td class="py-3 pr-4 font-mono">{row.critical_jobs}</td>
								<td class="py-3 pr-4 font-mono">{row.critical_peak ?? "unavailable"}</td>
								<td class="py-3 pr-4 font-mono">{row.first_minute_critical_peak ?? "unavailable"}</td>
								<td class="py-3 pr-4 font-mono">{row.other_peak ?? "unavailable"}</td>
								<td class="py-3 font-mono">{row.other_job_time_during_critical}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</details>
	{/if}
	<p class="text-sm">{view.reservation_note}</p>
	<details class="text-sm text-muted-foreground">
		<summary class="cursor-pointer">Concurrency clocks and model limits</summary>
		<p>{view.clock}</p>
		<p>{view.model_note}</p>
	</details>
</section>
