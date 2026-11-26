<script lang="ts">
	/** Render the shared local-file report without reinterpreting receipt clocks or status. */
	import type { CiLocalAttemptClock, CiLocalAttemptsReportView } from "./ci-types";

	let { report }: { report: CiLocalAttemptsReportView } = $props();
	const ms = (value: number | null) =>
		value === null ? "unavailable" : `${Math.round(value)} ms`;
	const summary = (value: CiLocalAttemptClock) =>
		`${value.measured} measured, ${value.unavailable} unavailable/not run; ${ms(value.mean_ms)} mean, ${ms(value.total_ms)} sum`;
</script>

<section class="space-y-3 rounded-lg border border-border bg-card p-4" data-report="local-attempts">
	<h2 class="font-display text-2xl">{report.title}</h2>
	<p class="text-sm">{report.scope}</p>
	{#if report.unavailable}<p role="status">{report.unavailable}</p>{/if}
	<p class="text-sm">Remote only: {report.counts.remote}; local only: {report.counts.local}; fallback: {report.counts.fallback}.</p>
	<ul class="flex flex-wrap gap-3 text-sm" aria-label="Guard categories">
		{#each report.guards as guard (guard.reason)}<li>{guard.reason}: {guard.attempts}</li>{/each}
	</ul>
	<dl class="text-sm"><dt>Total wall</dt><dd>{summary(report.wall)}</dd><dt>Remote</dt><dd>{summary(report.remote)}</dd><dt>Local</dt><dd>{summary(report.local)}</dd><dt>Lock wait</dt><dd>{summary(report.lock)}</dd></dl>
	<p class="text-xs text-muted-foreground">{report.clock}</p>
	<p class="text-sm">Scanned {report.coverage.scanned}; accepted {report.coverage.accepted}; rejected {report.coverage.rejected}; retained {report.coverage.retained}; omitted {report.coverage.omitted}. Incomplete final line: {String(report.coverage.truncated)}. Scan capped: {String(report.coverage.capped)}.</p>
	<p class="text-xs text-muted-foreground">{report.coverage_note}</p>
	<p class="text-xs text-muted-foreground">{report.evidence_note}</p>
	<div class="overflow-x-auto">
		<table class="w-full text-left text-sm" aria-label="Local Rust attempt receipts">
			<thead><tr><th>Started (UTC) / mode</th><th>Route</th><th>Remote / local / final exit</th><th>Wall / remote / local / lock</th><th>Guard</th><th>Evidence</th><th>Identity</th></tr></thead>
			<tbody>
				{#each report.attempts as attempt, index (index)}
					<tr class="border-b border-border/40 align-top">
						<td>{attempt.started_at}<p>{attempt.mode}</p></td><td>{attempt.route}</td>
						<td>{attempt.remote_status ?? "unavailable"} / {attempt.local_status ?? "unavailable"} / {attempt.exit_status ?? "unavailable"}</td>
						<td>{ms(attempt.wall_ms)} / {ms(attempt.remote_ms)} / {ms(attempt.local_ms)} / {ms(attempt.lock_wait_ms)}</td>
						<td>{attempt.guard_reason}</td><td>{attempt.evidence}<p class="break-all">{attempt.evidence_path ?? "unavailable"}</p></td>
						<td class="max-w-sm break-all text-xs">Source: {attempt.source_sha ?? "unavailable"}<br />Base: {attempt.base_sha ?? "unavailable"}<br />Image: {attempt.image ?? "unavailable"}<br />Library HEAD: {attempt.library_head ?? "unavailable"}<br />Library tree: {attempt.library_tree ?? "unavailable"}<br />Expected tree: {attempt.expected_library_tree ?? "unavailable"}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<details><summary class="cursor-pointer text-sm">Complete shared report</summary><pre class="overflow-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify(report, null, 2)}</pre></details>
</section>
