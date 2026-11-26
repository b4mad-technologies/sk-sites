// The two-directional reference graph over catalogue entries.
//
// A row page that only prints its own columns explains half a rule. The other
// half is what it points at and what points back: from an attack you reach its
// offer, its outcome, its consequences, the capability it needs and the
// conditions it applies — and from any of those you get back.
//
// HOW REFERENCES ARE FOUND, and why this needs no DSL parser.
//
// Two sources, both plain scans:
//
//  1. Ordinary columns. `on_success`, `capability_id`, `niche_id`,
//     `outcome_template_id`, `applies_to`, `implies`, `composes`, … A value
//     that is a known id IS a reference; nothing has to know which columns are
//     foreign keys.
//  2. Identifiers quoted inside DSL source text — `resolution_predicate_source`,
//     `predicate_source`, `delta_source`, `body_source` and their siblings.
//     Measured over the whole corpus: of 829 quoted identifiers in these
//     fields, 767 (92.5%) resolve to an authored row by this scan alone. The
//     62 that do not are `core/*` facts the kernel provides, which are not
//     bundle rows at all. So the scan is complete for everything a reader
//     could navigate to, and a parser would buy nothing today. If one becomes
//     available, it can replace `dslReferences` behind this same interface.
//
// This is what lets a class feature page say "read by 4 attack actions":
// `srd/attack/melee`'s resolution predicate names
// `srd/class-feature/fighter/champion/improved-critical` inside a `cond()`.

import { firstSentence } from "@spellkave/ui-widgets/catalogue/first-sentence";
import type { DocsReferenceGroup, DocsRowEntryReference } from "./docs-types";

/**
 * Both directions are keyed by kind AND ref, because an id alone does not
 * identify a subject — see `buildReferenceGraph` for the measurement.
 */
export function referenceGraphKey(kind: string, ref: string): string {
	return `${kind}:${ref}`;
}

/** The subset of a catalogue entry this graph needs. */
export interface ReferenceGraphTarget {
	ref: string;
	kind: string;
	href: string;
	display_name: string;
	description?: string;
	record?: Record<string, unknown>;
}

export interface ReferenceGraph {
	/** What this entry points at, grouped by the column that points. */
	readonly references: ReadonlyMap<string, DocsReferenceGroup[]>;
	/** What points at this entry, grouped by the kind doing the pointing. */
	readonly referencedBy: ReadonlyMap<string, DocsReferenceGroup[]>;
	/** Identifiers found in DSL text that match no authored row, for reporting. */
	readonly unresolved: ReadonlySet<string>;
}

/**
 * Columns whose value is DSL source text rather than a plain identifier.
 * Matched by suffix so a new expression column is covered the day it is
 * authored, instead of the day someone remembers to list it here.
 */
const DSL_FIELD = /(_source|_expression|_predicate|_eligibility|_trigger)$/;

/** A quoted identifier inside DSL source text. */
const QUOTED = /'([^']+)'/g;

export function isDslField(field: string): boolean {
	return DSL_FIELD.test(field);
}

/** Quoted identifiers with byte ranges (including the surrounding quotes). */
export function quotedDslOccurrences(
	source: string,
): Array<{ id: string; start: number; end: number }> {
	return [...source.matchAll(QUOTED)].map((match) => {
		const start = match.index ?? 0;
		return {
			id: match[1] ?? "",
			start,
			end: start + match[0].length,
		};
	});
}

/**
 * Columns that hold this row's OWN identity rather than a reference to another
 * row. Without this a row would list itself as its own first reference.
 */
const SELF_FIELD = /(^id$|_id$|^tag$|^slug$|^ref$)/;

/** Turn a column name into something a reader can read. */
function fieldLabel(field: string): string {
	return field
		.replace(/_source$/, "")
		.replaceAll("_", " ")
		.replace(/^./, (character) => character.toUpperCase());
}

function summaryOf(target: ReferenceGraphTarget): string | undefined {
	const summary = target.description ? firstSentence(target.description) : undefined;
	return summary === undefined || summary === "" ? undefined : summary;
}

function referenceRow(target: ReferenceGraphTarget): DocsRowEntryReference {
	const summary = summaryOf(target);
	return {
		ref: target.ref,
		title: target.display_name,
		href: target.href,
		...(summary === undefined ? {} : { summary }),
	};
}

/** Identifiers quoted inside one DSL source string. */
function dslReferences(source: string): string[] {
	return quotedDslOccurrences(source).map((match) => match.id);
}

/**
 * Every reference one row makes, as `[targetRef, label]` pairs.
 *
 * Arrays are walked (`implies`, `composes`, `grants_capability_while_active`
 * are id lists), and a value equal to the row's own ref is dropped so a row
 * never references itself.
 */
function outgoingReferences(
	record: Record<string, unknown>,
	selfRef: string,
	known: ReadonlySet<string>,
	unresolved: Set<string>,
): Array<{ ref: string; label: string }> {
	const found: Array<{ ref: string; label: string }> = [];
	const add = (ref: string, label: string): void => {
		if (ref === selfRef || !known.has(ref)) return;
		found.push({ ref, label });
	};
	for (const [field, value] of Object.entries(record)) {
		if (typeof value === "string" && value !== "") {
			if (DSL_FIELD.test(field)) {
				for (const candidate of dslReferences(value)) {
					if (known.has(candidate)) add(candidate, `Read by ${fieldLabel(field).toLowerCase()}`);
					// A `core/*` identifier is a kernel-provided fact, not a bundle
					// row; anything else unresolved is worth surfacing rather than
					// silently dropping.
					else if (candidate.includes("/") && !candidate.startsWith("core/"))
						unresolved.add(candidate);
				}
				continue;
			}
			if (!SELF_FIELD.test(field)) add(value, fieldLabel(field));
			continue;
		}
		if (Array.isArray(value))
			for (const item of value) if (typeof item === "string") add(item, fieldLabel(field));
	}
	return found;
}

function groupRows(
	entries: Array<{ label: string; row: DocsRowEntryReference }>,
): DocsReferenceGroup[] {
	const byLabel = new Map<string, Map<string, DocsRowEntryReference>>();
	for (const { label, row } of entries) {
		const group = byLabel.get(label) ?? new Map<string, DocsRowEntryReference>();
		// One row may be reached twice through the same label — a predicate can
		// name the same macro more than once. Keep it once, but key on the ROUTE
		// rather than the ref: two subjects of different kinds legitimately share
		// an id, and keying on the ref alone would silently drop one of them.
		group.set(row.href ?? row.ref, row);
		byLabel.set(label, group);
	}
	return [...byLabel]
		.map(([label, rows]) => ({
			label,
			entries: [...rows.values()].toSorted((left, right) => left.title.localeCompare(right.title)),
		}))
		.toSorted((left, right) => left.label.localeCompare(right.label));
}

/** Build both directions in one pass over the catalogue. */
export function buildReferenceGraph(targets: readonly ReferenceGraphTarget[]): ReferenceGraph {
	// An id is NOT unique across kinds. Measured over the SRD manifest: 76 ids
	// name a subject in two kinds at once — a class feature is both an
	// entity_definition and a capability_definition (34 of them), an action and
	// the capability permitting it share a name (25), a modifier target and the
	// resource it aims at share one (9). A reader's identity is (kind, ref).
	//
	// A reference found in a plain column carries no kind, and one buried in DSL
	// text carries even less. So an ambiguous id resolves to ALL its subjects and
	// the reader is shown each — which is the truth — rather than to whichever
	// one a Map happened to keep last.
	const byRef = new Map<string, ReferenceGraphTarget[]>();
	for (const target of targets) byRef.set(target.ref, [...(byRef.get(target.ref) ?? []), target]);
	const known = new Set(byRef.keys());
	const keyOf = (target: ReferenceGraphTarget): string =>
		referenceGraphKey(target.kind, target.ref);
	const unresolved = new Set<string>();

	const outgoing = new Map<string, Array<{ label: string; row: DocsRowEntryReference }>>();
	const incoming = new Map<string, Array<{ label: string; row: DocsRowEntryReference }>>();

	for (const source of targets) {
		if (source.record === undefined) continue;
		for (const { ref, label } of outgoingReferences(source.record, source.ref, known, unresolved)) {
			for (const target of byRef.get(ref) ?? []) {
				// A subject never references itself — but the SAME id under a
				// DIFFERENT kind is a different subject and is a real reference.
				if (target.ref === source.ref && target.kind === source.kind) continue;
				const out = outgoing.get(keyOf(source)) ?? [];
				out.push({ label, row: referenceRow(target) });
				outgoing.set(keyOf(source), out);
				// The incoming side groups by the KIND that points, not by the
				// column: a reader asking "what uses this?" wants "12 actions, 3
				// conditions", not twelve one-row groups named after columns.
				const back = incoming.get(keyOf(target)) ?? [];
				back.push({ label: readableKind(source.kind), row: referenceRow(source) });
				incoming.set(keyOf(target), back);
			}
		}
	}

	return {
		references: new Map([...outgoing].map(([ref, rows]) => [ref, groupRows(rows)])),
		referencedBy: new Map([...incoming].map(([ref, rows]) => [ref, groupRows(rows)])),
		unresolved,
	};
}

/**
 * `action_definition` -> `Actions`, for the "referenced by" group headings.
 *
 * The `_definition`/`_template` suffix names the manifest's own bookkeeping,
 * not the thing. A reader asking what uses a consequence wants to read
 * "Actions", not "Action definitions".
 */
export function readableKind(kind: string): string {
	const words = kind.replace(/_(definition|template)$/, "").replaceAll("_", " ");
	return `${words.replace(/^./, (character) => character.toUpperCase())}s`;
}
