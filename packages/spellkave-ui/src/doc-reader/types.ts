export type DocTone = "good" | "info" | "neutral" | "muted" | "alert";

/** One document on a reading path: what to open, and why it is the next step. */
export interface ReadingStep {
	title: string;
	href: string;
	why: string;
}

/** A reader's role and the documents to read in order. */
export interface ReadingRole {
	id: string;
	title: string;
	/** One line: who this role is. */
	who?: string;
	steps: ReadingStep[];
}

export interface DocIndexLink {
	label: string;
	href: string;
	/** A relation word shown before the link, e.g. "superseded by". */
	relation?: string;
}

export interface DocIndexEntry {
	key: string;
	/** A short id shown in mono type, e.g. `ADR-0021`. */
	label?: string;
	title: string;
	href: string;
	summary?: string;
	status?: { label: string; tone: DocTone };
	links?: DocIndexLink[];
}

export interface DocIndexGroup {
	title: string;
	note?: string;
	entries: DocIndexEntry[];
}

/** SPA navigate: the caller calls `event.preventDefault()` when it owns routing. */
export type DocNavigate = (href: string, event: MouseEvent) => void;
