import type { Snippet } from "svelte";

/** Who a chat entry is from. `host` is a system report; `failure` a run that ended without an answer. */
export type ChatTone = "person" | "agent" | "host" | "failure";

export interface ChatEntryProps {
	tone: ChatTone;
	/** Who or what, e.g. "You", "World setup", "Host". */
	label: string;
	/** Small text after the label, e.g. an entry ID or time. */
	meta?: string;
	/** A host report's outcome: an accent on success, the destructive color on failure. */
	outcome?: "ok" | "failed";
	children: Snippet;
	/** Actions below the body, e.g. Copy and Reply on an answer. */
	actions?: Snippet;
	class?: string;
}

export interface ThoughtRowProps {
	text: string;
	/** Still streaming: the line reads "Thinking…". */
	live?: boolean;
	open?: boolean;
	class?: string;
}

export type ActivityStepStatus = "pending" | "running" | "done" | "error";
export interface ActivityStep {
	id: string;
	label: string;
	status: ActivityStepStatus;
}

export interface ActivityRowProps {
	steps: readonly ActivityStep[];
	/** The agent is still at it: a ticking timer instead of a summary. */
	working: boolean;
	/** When the run began and, once done, ended, in ms since the epoch. */
	startedAt?: number;
	endedAt?: number;
	/** Marks the row whose steps a side panel shows. */
	selected?: boolean;
	/** Opens the steps, e.g. in a dock. Without it the row is not a button. */
	onopen?: () => void;
	class?: string;
}
