<script lang="ts">
	/** Exact evidence from the shared selected-definition report; no browser clock arithmetic. */
	import type { CiReadinessAuditView } from "./ci-types";

	let { view, onselect }: { view: CiReadinessAuditView; onselect?: (job: string) => void } = $props();
	const clock = (value: string | number | null) => value === null ? "unavailable" : String(value);
</script>

<section class="flex flex-col gap-3" aria-label="Per-head readiness audit">
	<h3 class="font-display text-xl">Per-head readiness across observed attempts</h3>
	<label class="flex flex-col gap-1 text-sm">
		Readiness definition
		<select class="rounded border border-border bg-background p-2 font-mono" value={view.selected_definition ?? ""} onchange={(event) => onselect?.(event.currentTarget.value)}>
			<option value="">Choose a definition…</option>
			{#each view.definitions as definition (definition)}<option value={definition}>{definition}</option>{/each}
		</select>
	</label>
	<p class="text-sm text-muted-foreground">{view.coverage}</p>
	<p class="text-sm text-muted-foreground">{view.model_note}</p>
	{#if view.rows.length}
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm" aria-label="Observed per-head readiness clocks">
				<thead><tr class="border-b border-border"><th class="p-2">PR / head / attempt</th><th class="p-2">Own clocks (UTC)</th><th class="p-2">Declared needs (UTC)</th><th class="p-2">Observed seconds</th><th class="p-2">Evidence</th></tr></thead>
				<tbody>
					{#each view.rows as row (row.pr + ":" + row.head + ":" + row.run_id + ":" + row.attempt + ":" + row.job_id)}
						<tr class="border-b border-border/40 align-top">
							<td class="p-2">
								<p>PR {row.pr} · <code>{clock(row.head)}</code></p>
								<p><a class="underline" href={row.run_url}>Run {row.run_id}</a> · <a class="underline" href={row.attempt_url}>Attempt {row.attempt}</a></p>
								<p>{row.model_period}</p><p>Run created: {clock(row.run_created_at)}</p>
							</td>
							<td class="p-2 font-mono text-xs">
								<p>{clock(row.job)} · {#if row.job_url}<a class="underline" href={row.job_url}>Job {row.job_id}</a>{:else}Job unavailable{/if} · {row.conclusion}</p>
								<p>Created: {clock(row.created_at)}</p><p>Started: {clock(row.started_at)}</p><p>Completed: {clock(row.completed_at)}</p>
							</td>
							<td class="p-2 font-mono text-xs">
								<p>Needs ready: {clock(row.needs_ready_at)}</p><p>Ready including creation: {clock(row.ready_at)}</p>
								{#each row.latest_prerequisites as candidate (candidate.job_id)}
									<p><a class="underline" href={candidate.job_url}>{candidate.job} · Job {candidate.job_id}</a> · {candidate.definition} · {candidate.completed_at}</p>
								{/each}
							</td>
							<td class="p-2 font-mono text-xs"><p>After needs: {clock(row.after_needs_seconds)}</p><p>Own runner/scheduling wait: {clock(row.own_runner_wait_seconds)}</p><p>Execution: {clock(row.execution_seconds)}</p></td>
							<td class="p-2 text-xs text-muted-foreground"><p>{row.identity_note}</p>{#each row.unavailable_reasons as reason (reason)}<p>{reason}</p>{/each}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>
