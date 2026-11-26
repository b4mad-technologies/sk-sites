/** One resolvable page a quoted DSL identifier may point at. */
export interface DocsDslTarget {
	/** The target page's title, e.g. "Strength". */
	title: string;
	/** Readable subject kind, e.g. "Resources" — from `readableKind`. */
	kind: string;
	href: string;
}

/** Lexer token from crates/spellkave-dsl, projected at docs-build time. */
export interface DocsDslToken {
	kind: string;
	start: number;
	end: number;
	/** Set when exactly one catalogue subject carries this id. */
	href?: string;
	/** Every subject carrying this id, when more than one does (sk-jay0.3.5: 76 ids are two kinds at once). */
	targets?: DocsDslTarget[];
}

export interface DocsDslField {
	tokens: DocsDslToken[];
}

export interface DocsRowField {
	label: string;
	value: string;
	href?: string;
	code?: boolean;
	dsl?: DocsDslField;
}

export interface DocsRowEntryReference {
	ref: string;
	title: string;
	href?: string;
	summary?: string;
}

export interface DocsReferenceGroup {
	label: string;
	entries: DocsRowEntryReference[];
}

export interface DocsRowEntryView {
	ref: string;
	title: string;
	href?: string;
	kind_label: string;
	description?: string;
	fields: DocsRowField[];
	references?: DocsReferenceGroup[];
	referenced_by?: DocsReferenceGroup[];
}
