/**
 * Shared agent-run-events/v1 → display steps.
 * Used by the public website transcript feed and the Tailnet admin ops log.
 */

export interface RunEventStep {
	ts: string;
	type: string;
	tool: string;
	/** Short tool label without the `spellkave_` prefix. */
	label: string;
	params: unknown;
	text: string;
	observation: unknown;
	is_error: boolean;
	duration_ms: number | null;
	correlation_id: string | null;
	actor_id: string | null;
	/** Optional identity/subject handle for tooltips (not always present). */
	identity: string | null;
	world_slug: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function toolLabel(toolName: string): string {
	return toolName.replace(/^spellkave_/, "");
}

/** Compact fallback when a recording carries no `text`. */
export function compactObservation(observation: unknown, limit = 240): string {
	if (observation === null || observation === undefined) return "";
	const json = JSON.stringify(observation);
	if (json === undefined) return "";
	return json.length > limit ? `${json.slice(0, limit)}…` : json;
}

/**
 * Tolerant JSONL parse of agent-run-events/v1.
 * Default keeps `tool_call` (and error tool_calls). Pass `includeLifecycle` for
 * run_start/run_end bracket noise (admin "show raw").
 */
export function parseRunEventsJsonl(
	jsonl: string,
	options: { includeLifecycle?: boolean } = {},
): RunEventStep[] {
	const includeLifecycle = options.includeLifecycle === true;
	const steps: RunEventStep[] = [];
	for (const raw of jsonl.split("\n")) {
		const line = raw.trim();
		if (line === "") continue;
		let event: unknown;
		try {
			event = JSON.parse(line);
		} catch {
			continue;
		}
		if (!isRecord(event)) continue;
		// Doctor / operator envelopes are not run events.
		if (event.kind === "doctor_check" || event.v === "spellkave-operator/v1") continue;
		const type = typeof event.type === "string" ? event.type : "";
		if (type === "run_start" || type === "run_end") {
			if (!includeLifecycle) continue;
		} else if (type !== "tool_call") {
			// Keep unknown types only in raw mode if they carry useful text.
			if (!includeLifecycle) continue;
		}
		const data = isRecord(event.data) ? event.data : {};
		const tool =
			typeof data.tool_name === "string"
				? data.tool_name
				: typeof data.tool === "string"
					? data.tool
					: type === "tool_call"
						? "unknown_tool"
						: type || "event";
		const observation = "observation" in data ? data.observation : null;
		const textFromData = typeof data.text === "string" ? data.text : "";
		const summary = typeof data.summary === "string" ? data.summary : "";
		const text =
			textFromData !== ""
				? textFromData
				: summary !== ""
					? summary
					: compactObservation(observation);
		// Skip empty lifecycle rows even in raw mode if they add nothing.
		if (
			includeLifecycle &&
			(type === "run_start" || type === "run_end") &&
			text === "" &&
			tool === type
		) {
			// still show a one-word label
		}
		const identity =
			typeof data.subject_prefix === "string"
				? data.subject_prefix
				: typeof data.identity === "string"
					? data.identity
					: typeof data.player === "string"
						? data.player
						: null;
		steps.push({
			ts: typeof event.ts === "string" ? event.ts : "",
			type: type || "tool_call",
			tool,
			label: type === "tool_call" ? toolLabel(tool) : type,
			params: "params" in data ? data.params : {},
			text,
			observation,
			is_error: data.is_error === true || data.terminal === "error",
			duration_ms: typeof data.duration_ms === "number" ? data.duration_ms : null,
			correlation_id: typeof data.correlation_id === "string" ? data.correlation_id : null,
			actor_id:
				typeof event.actor_id === "string" || typeof event.actor_id === "number"
					? String(event.actor_id)
					: null,
			identity,
			world_slug:
				typeof data.world_slug === "string"
					? data.world_slug
					: typeof event.world_slug === "string"
						? event.world_slug
						: null,
		});
	}
	return steps;
}

/** Depth-first primitive leaves as `key: value`, for one-line headlines. */
function primitiveLeaves(value: unknown, prefix: string, out: string[], limit: number): void {
	if (out.length >= limit) return;
	if (Array.isArray(value)) {
		for (const [i, item] of value.entries()) primitiveLeaves(item, `${prefix}[${i}]`, out, limit);
		return;
	}
	if (isRecord(value)) {
		for (const [key, nested] of Object.entries(value)) {
			primitiveLeaves(nested, prefix === "" ? key : `${prefix}.${key}`, out, limit);
		}
		return;
	}
	if (value === null || value === undefined || value === "") return;
	const shown = typeof value === "string" ? value : String(value);
	out.push(`${prefix}: ${shown.length > 80 ? `${shown.slice(0, 80)}…` : shown}`);
}

/**
 * One-line headline for a step. JSON-shaped text is summarised from leaves;
 * prose keeps its first line.
 */
export function stepHeadline(step: Pick<RunEventStep, "text" | "observation">): string {
	const firstLine = step.text.split("\n").find((line) => line.trim() !== "") ?? "";
	if (!/^[[{]/.test(firstLine.trim())) return firstLine;
	let parsed: unknown;
	try {
		parsed = JSON.parse(step.text);
	} catch {
		parsed = step.observation;
	}
	const leaves: string[] = [];
	primitiveLeaves(parsed, "", leaves, 4);
	return leaves.length > 0 ? leaves.join(" · ") : firstLine;
}

export function formatClock(ts: string): string {
	const date = new Date(ts);
	if (Number.isNaN(date.getTime())) return ts;
	return date.toLocaleTimeString(undefined, {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});
}

export function compactParams(params: unknown): string {
	if (params === undefined || params === null) return "";
	if (isRecord(params) && Object.keys(params).length === 0) return "";
	const json = JSON.stringify(params);
	return json === undefined ? "" : json;
}

/** Alias kept for website call sites that still say TranscriptStep. */
export type TranscriptStep = RunEventStep;
export const parseTranscriptJsonl = (jsonl: string): RunEventStep[] =>
	parseRunEventsJsonl(jsonl, { includeLifecycle: false });
