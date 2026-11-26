/** Shared number formatting for the CI widgets. */

export function formatDuration(seconds: number | null, atCap = false): string {
	if (seconds === null) return "no data";
	const prefix = atCap ? "≥ " : "";
	if (seconds < 90) return `${prefix}${Math.round(seconds)} s`;
	if (seconds < 5400) return `${prefix}${(seconds / 60).toFixed(seconds < 600 ? 1 : 0)} min`;
	return `${prefix}${(seconds / 3600).toFixed(1)} h`;
}

/** Below this many runs a p95 is a guess from coarse buckets, not a measurement. */
export const MIN_RUNS_FOR_P95 = 5;

/** p95 as text, or "too few runs" when `runs` (if known) is below {@link MIN_RUNS_FOR_P95}. */
export function formatP95(
	seconds: number | null,
	atCap: boolean | undefined,
	runs: number | null,
): string {
	if (runs !== null && runs > 0 && runs < MIN_RUNS_FOR_P95) return "too few runs";
	return formatDuration(seconds, atCap);
}

export function formatRate(rate: number | null): string {
	if (rate === null) return "no data";
	if (rate > 0 && rate < 0.001) return "< 0.1 %";
	return `${(rate * 100).toFixed(rate < 0.1 ? 1 : 0)} %`;
}

/**
 * A job name as a reader should see it: `${{ matrix.ws }}` becomes `‹ws›`
 * (one job per matrix entry), any other expression `…`. A name that is only
 * an expression falls back to the job key, e.g. "publish ‹name›".
 */
export function readableJobName(name: string, jobId?: string): string {
	const shown = name
		.replace(/\$\{\{\s*matrix\.([\w-]+)(?:\.[\w-]+)*\s*\}\}/g, "‹$1›")
		.replace(/\$\{\{[^}]*\}\}/g, "…")
		.replace(/…(\s*…)+/g, "…")
		.trim();
	if (!/^(‹[\w-]+›|…)$/.test(shown)) return shown;
	const key = jobId?.slice(jobId.lastIndexOf("/") + 1);
	return key ? `${key} ${shown}` : shown;
}

/** A share of runs: "–" without data, "< 1 %" for a rare job (it does run, just seldom). */
export function formatShare(share: number | null): string {
	if (share === null) return "–";
	return share > 0 && share < 0.01 ? "< 1 %" : `${Math.round(share * 100)} %`;
}

/**
 * A red rate where the run count is known: below `minRuns` it would read as
 * certain when it is not, so it says how few runs there were instead.
 */
export function formatRedRate(
	redRate: number | null,
	runs: number | null | undefined,
	minRuns = MIN_RUNS_FOR_P95,
): string {
	return runs !== undefined && runs !== null && runs < minRuns
		? `too few runs (${runs})`
		: formatRate(redRate);
}

/** One step's red rate in a job's step list: "too few" below `minRuns` runs, "–" without data. */
export function formatStepRate(
	stats: { readonly runs: number; readonly redRate: number | null },
	minRuns = MIN_RUNS_FOR_P95,
): string {
	if (stats.runs < minRuns) return "too few";
	return stats.redRate === null ? "–" : formatRate(stats.redRate);
}

/**
 * A job in one line, as a job box and a board row show it: red rate, mean
 * duration and p95, e.g. "8.9 % · 2.6 min (p95 8.2 min)". Parts without data
 * are left out; "no runs" when there are none.
 */
export function formatJobLine(
	redRate: number | null,
	meanSeconds: number | null,
	p95Seconds: number | null = null,
	p95AtCap = false,
): string {
	const parts: string[] = [];
	if (redRate !== null) parts.push(formatRate(redRate));
	if (meanSeconds !== null)
		parts.push(
			`${formatDuration(meanSeconds)}${p95Seconds !== null ? ` (p95 ${formatDuration(p95Seconds, p95AtCap)})` : ""}`,
		);
	return parts.length ? parts.join(" · ") : "no runs";
}

/** A mean duration in a list: "–" without data. */
export function formatMean(seconds: number | null): string {
	return seconds === null ? "–" : formatDuration(seconds);
}

/** The worst red rate in a list, for sorting groups worst-first. `-1` when none has data. */
export function worstRate(jobs: readonly { redRate: number | null }[]): number {
	return jobs.reduce((worst, job) => Math.max(worst, job.redRate ?? -1), -1);
}
