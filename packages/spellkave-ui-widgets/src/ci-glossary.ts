/**
 * Plain-language explanations for every number the CI widgets show. One
 * place, so a hover says the same thing everywhere (Spire, cognitive-debt
 * work: a number without its meaning is just more to remember).
 */

export const CI_GLOSSARY = {
	redRate:
		"Red rate: of the runs that finished (passed or failed), the share that failed. Skipped and cancelled runs are left out, so a job that rarely runs can show a high rate from few failures — check the run count next to it.",
	meanDuration:
		"Mean duration: the average time of the runs that finished (passed or failed). Skipped and cancelled runs take no real time and are left out.",
	p95: "p95: 95 of 100 runs finished faster than this. It shows the slow end without being thrown off by one stuck run. A value marked ≥ is the top of the measured range: the real time is at least this.",
	fewRuns:
		"Too few runs: p95 needs at least 5 finished runs. With fewer, it is a guess from coarse time buckets and can even come out above the mean.",
	runs: "Runs: how often GitHub started this job in the chosen time window, whatever the outcome.",
	stepFailed:
		"How often this step failed out of the times it ran in the window, and its average time when it did its work.",
	liveNode:
		"Needs a live node: this job starts a real SpacetimeDB server to test against, which makes it slower and heavier than an offline test.",
	noData:
		"No data: OpenObserve has no runs for this job in the window. That means unknown, not healthy.",
	success: "success: the run finished and every step passed.",
	failure: "failure: a step failed, so the job turned red.",
	cancelled:
		"cancelled: the run was stopped before it finished, usually because a newer push to the same PR replaced it.",
	skipped:
		"skipped: the run's condition was false, so it did no work — for example, the PR did not touch what this job checks.",
} as const;

export type CiGlossaryKey = keyof typeof CI_GLOSSARY;

/** The explanation for a conclusion label, or a generic line for one GitHub adds later. */
export function conclusionHint(conclusion: string): string {
	return (
		(CI_GLOSSARY as Record<string, string>)[conclusion] ??
		`${conclusion}: an outcome GitHub reported for this run.`
	);
}
