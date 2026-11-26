/** "4s", "1m 05s": an elapsed time as an activity row shows it. */
export function elapsed(ms: number): string {
	const seconds = Math.max(0, Math.floor(ms / 1000));
	if (seconds < 60) return `${seconds}s`;
	return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`;
}

/** The summary of a run of steps: its count and, when known, how long it took. */
export function activitySummary(count: number, ms?: number): string {
	const steps = count === 1 ? "1 step" : `${count} steps`;
	return ms === undefined ? steps : `${steps} · ${elapsed(ms)}`;
}
