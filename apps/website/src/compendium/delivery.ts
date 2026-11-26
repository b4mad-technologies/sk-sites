// Which manifest rows actually reach a reader, measured over what was emitted.
//
// WHY THIS IS MEASURED AND NOT DERIVED
//
// `row-kind-coverage.toml` says where each kind BELONGS. That promise needs an
// actual rendered witness. Narrowing the technical dump by classification
// alone would make an unimplemented promise disappear from both places.
//
// So delivery is proven, never assumed. A row counts as delivered when a
// WITNESS can point at the artifact showing it. A kind with no witness is
// undelivered by definition — the default is the honest one, and it is what
// makes the basin unable to lie. The same failure mode already bit us once:
// `boundary_definitions` was classified, published, componented and counted,
// and rendered nothing (sk-jay0.3.5.68.4).
//
// HOW A ROW IS IDENTIFIED
//
// Ordinary rows use the key the KERNEL gives them, not byte equality: a tag row
// is shown as an entry's `tags` array rather than reproduced verbatim, so
// comparing whole rows would call every delivered tag undelivered.
// `ROW_KIND_NATURAL_KEY` names single identity columns and
// `ROW_KIND_COMPOSITE_KEY` the ordered pair for the uniform satellite kinds.
// A kind in neither falls back to the row's canonical form. An approved public
// allowlist instead uses an opaque full-source digest, checked together with
// its visible projection at build time. Private subjects never become public
// identity keys or fallback technical rows.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { rowKindCoverageFor } from "@spellkave/srd-cc/docs/row-kind-coverage";
import type {
	DocsArticle,
	DocsCatalogueEntry,
	DocsFacet,
	DocsIndexV1,
	DocsPage,
} from "./docs-types";
import { tagEdgeParents } from "./tag-edges";

export interface DeliveryKindReport {
	readonly kind: string;
	readonly authored: number;
	readonly delivered: number;
	readonly undelivered: number;
	/** How this kind's delivery was proven, or `null` when nothing proves it. */
	readonly witness: string | null;
}

export interface DeliveryReport {
	readonly kinds: readonly DeliveryKindReport[];
	readonly authored: number;
	readonly delivered: number;
	readonly undelivered: number;
}

export interface DeliveryKeys {
	/** `ROW_KIND_NATURAL_KEY` from `@spellkave/world-author`. */
	readonly natural: Readonly<Record<string, string>>;
	/** `ROW_KIND_COMPOSITE_KEY` from `@spellkave/world-author`. */
	readonly composite: Readonly<Record<string, readonly string[]>>;
}

type Row = Record<string, unknown>;

function canonical(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
	if (value !== null && typeof value === "object")
		return `{${Object.entries(value as Row)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
			.join(",")}}`;
	return JSON.stringify(value);
}

/** The identity of one row occurrence, scoped to its table. */
export function occurrenceKey(kind: string, row: Row, keys: DeliveryKeys): string {
	if (rowKindCoverageFor(kind)?.public_fields !== undefined)
		return `${kind}\u0000${sourceDigest(kind, row)}`;
	const natural = keys.natural[kind];
	if (natural !== undefined && typeof row[natural] === "string")
		return `${kind}\u0000${row[natural] as string}`;
	const composite = keys.composite[kind];
	if (composite !== undefined) {
		const parts = composite.map((field) => row[field]);
		if (parts.every((part) => typeof part === "string"))
			return `${kind}\u0000${(parts as string[]).join("\u0001")}`;
	}
	return `${kind}\u0000${canonical(row)}`;
}

/** Build-time source identity for redacted delivery, with no raw private data in artifacts. */
export function sourceDigest(kind: string, row: Row): string {
	return createHash("sha256")
		.update(`${kind}\u0000${canonical(row)}`)
		.digest("hex");
}

export function publicRow(kind: string, row: Row): Row {
	const fields = rowKindCoverageFor(kind)?.public_fields;
	return fields === undefined
		? row
		: Object.fromEntries(
				fields.filter((field) => field in row).map((field) => [field, row[field]]),
			);
}

export function* authoredSourceRows(
	tables: ReadonlyMap<string, ReadonlyMap<string, readonly Row[]>>,
): Generator<readonly [string, Row]> {
	for (const source of tables.values())
		for (const [kind, rows] of source) for (const row of rows) yield [kind, row];
}

/** A facet row with the projection's own additions removed, as the manifest wrote it. */
function authoredRow(row: Row, derived: readonly string[] | undefined): Row {
	if (derived === undefined || derived.length === 0) return row;
	const authored: Row = {};
	for (const [key, value] of Object.entries(row)) if (!derived.includes(key)) authored[key] = value;
	return authored;
}

/** The same identity, built from parts rather than from a row. */
export function compositeKey(kind: string, ...parts: readonly string[]): string {
	return `${kind}\u0000${parts.join("\u0001")}`;
}

function readArtifact<T>(root: string, href: string): T {
	const prefix = "/compendium/docs/";
	if (!href.startsWith(prefix)) throw new Error(`delivery: unsafe artifact href '${href}'`);
	return JSON.parse(readFileSync(join(root, href.slice(prefix.length)), "utf8")) as T;
}

/**
 * The tag table a catalogue entry's own tags belong to.
 *
 * This used to be a hand-written list of the kinds someone had wired up, and it
 * understated the truth twice: `resource_definition` edges sat in the basin
 * while a reader could already follow them in both directions. It is derived
 * now, from the kernel's junction keys and the page classification
 * (`tagEdgeParents`), because the claim it makes is uniform: a page-surfaced
 * subject carries its tags as chips (`TagList`, rendered by `CatalogueEntryPage`
 * for every kind and by `SubjectView`/`ResourceView` for the two with carriers)
 * and the tag's own page lists it back as a member.
 *
 * A junction whose parent is NOT page-surfaced is absent by construction, which
 * is what keeps `roll_table_entry_tag` honestly counted as unreached: there is
 * no roll-table-entry page to put the chip on.
 */
function tagTablesByEntryKind(
	keys: DeliveryKeys,
	identities: Readonly<Record<string, { table: string; idField: string }>>,
): Readonly<Record<string, string>> {
	const tables: Record<string, string> = {};
	for (const [entryKind, parent] of Object.entries(tagEdgeParents(keys.composite, identities)))
		tables[entryKind] = parent.table;
	return tables;
}

export interface Witnessed {
	/** Occurrence keys a reader can provably see. */
	readonly keys: ReadonlySet<string>;
	/** Per table, the first reason found for why its rows are visible. */
	readonly reasons: ReadonlyMap<string, string>;
	readonly violations: readonly string[];
}

/**
 * Collect what a set of catalogue entries, articles and pages PROVES is
 * shown.
 *
 * Witnesses come from an entry's record, tags, owner facets, full article
 * subject embeds, and a root page's bundle block. Whole rows use schema keys;
 * known projection additions are excluded from authored identity. An approved
 * `public_fields` facet instead exposes only its allowlisted columns and an
 * opaque source digest. Build-time validation checks the digest and exact
 * visible projection against the full source. Missing, altered, duplicate or
 * privately expanded rows produce violations, as exercised by
 * `role-binding-privacy.test.ts`. A digest alone is not a source proof.
 * Other lossy presentation (facts, relations and references) establishes no
 * additional source occurrence. Full authored subjects stay build-time only.
 *
 * `pages` defaults to empty: most callers pass only `entries`/`articles`
 * because that is all they hold in scope, and a caller that never reaches
 * `DocsPage` simply proves nothing about a bundle block, same as before this
 * parameter existed.
 *
 * Every caller passes both `entries` and `articles`: the projection calls this
 * over what it is about to serialize, to decide what the overflow basin must
 * still carry; `measureDelivery` and the coverage validator call it over what
 * was read back OFF DISK, to report the same thing independently. One rule
 * serves all of them, so a row can never be filtered out of the basin by a
 * claim the measurement would not also make.
 */
export function collectWitnesses(
	entries: Iterable<DocsCatalogueEntry>,
	articles: Iterable<DocsArticle>,
	keys: DeliveryKeys,
	identities: Readonly<Record<string, { table: string; idField: string }>>,
	pages: Iterable<DocsPage> = [],
	authored?: Iterable<readonly [string, Row]>,
	/** A delivery census can measure one manifest against a multi-bundle site. */
	subset = false,
): Witnessed {
	const witnessed = new Set<string>();
	const reasons = new Map<string, string>();
	const violations: string[] = [];
	const expected = new Map<string, Row>();
	if (authored !== undefined)
		for (const [kind, row] of authored)
			if (rowKindCoverageFor(kind)?.public_fields !== undefined)
				expected.set(`${kind}\u0000${sourceDigest(kind, row)}`, publicRow(kind, row));
	const redactedSeen = new Set<string>();
	const facetKeys = (facet: DocsFacet): string[] => {
		const kind = facet.table;
		if (kind === undefined) return [];
		const fields = rowKindCoverageFor(kind)?.public_fields;
		if (fields === undefined)
			return facet.rows.map((row) => occurrenceKey(kind, authoredRow(row, facet.derived), keys));
		const digests = facet.source_digests;
		if (digests?.length !== facet.rows.length) {
			violations.push(`${kind}: redacted rows lack aligned source digests`);
			return [];
		}
		return facet.rows.flatMap((row, at) => {
			const digest = digests[at] ?? "";
			const key = `${kind}\u0000${digest}`;
			if (subset && authored !== undefined && !expected.has(key)) return [];
			if (
				!/^[0-9a-f]{64}$/.test(digest) ||
				Object.keys(row).some((field) => !fields.includes(field)) ||
				(authored !== undefined && canonical(expected.get(key)) !== canonical(row))
			) {
				violations.push(`${kind}: public row does not match its authored source digest`);
				return [];
			}
			if (redactedSeen.has(key)) {
				violations.push(`${kind}: duplicate redacted source occurrence`);
				return [];
			}
			redactedSeen.add(key);
			return [key];
		});
	};
	const note = (kind: string, reason: string): void => {
		if (!reasons.has(kind)) reasons.set(kind, reason);
	};
	const tagTableByEntryKind = tagTablesByEntryKind(keys, identities);

	for (const entry of entries) {
		const identity = identities[entry.kind];
		if (identity !== undefined && entry.record) {
			// The entry IS this row, rendered by its own component.
			witnessed.add(compositeKey(identity.table, entry.ref));
			note(identity.table, "rendered as its own catalogue page");
		}
		const tagTable = tagTableByEntryKind[entry.kind];
		if (tagTable !== undefined)
			for (const tag of entry.tags ?? []) {
				witnessed.add(compositeKey(tagTable, entry.ref, tag));
				// "Shown", not "linked". A tag whose own vocabulary entry was never
				// authored renders as a bare chip and has no page to list the
				// subject back — 18 capability edges are in that state today
				// (sk-jay0.3.5.73). The row still reaches the reader, which is what
				// this measures; the missing half is a content gap, not a rendering
				// one, and counting the row as unreached would hide the page that
				// does show it.
				note(tagTable, "shown as a tag on the entry, and on the tag's own page where it has one");
			}
		// `tag_capability_grant`, keyed (tag, capability_id) by the kernel. Credited
		// from the tag's end because that is where the whole edge is enumerated;
		// the capability's page carries the same edge back as "Granted by", built
		// in the same pass, so one witness covers both directions honestly.
		for (const granted of entry.granted_capabilities ?? []) {
			witnessed.add(compositeKey("tag_capability_grant", entry.ref, granted.ref));
			note("tag_capability_grant", "listed on the tag's page and on the capability it grants");
		}
		// Owner-surfaced rows: shown on the page of the subject they belong to,
		// dumped verbatim. The facet NAMES its manifest table, so nothing is
		// inferred from the reader-facing label — a facet that mixes tables, or
		// holds anything the manifest did not write, declares no table and credits
		// nothing.
		//
		// This used to name `map_layers` by hand for `place_graph` alone, and that
		// claim was quietly ineffective: the projection adds a resolved
		// `asset_href` to every map layer, the kernel registers no identity column
		// for the table, so the augmented row never matched the authored one. A
		// facet now declares what the projection added, and it is taken back off
		// before the row is identified.
		// The reverse half of a tag edge, read off the tag's own page. Most members
		// are catalogue entries and are already credited from their own side; the
		// ones that matter here are the hosted definitions, which have no page and
		// therefore no side of their own — a natural weapon reaches a reader only
		// through the creature hosting it and through this list.
		for (const member of entry.members ?? []) {
			const tagTable = member.kind === undefined ? undefined : tagTableByEntryKind[member.kind];
			if (tagTable === undefined) continue;
			witnessed.add(compositeKey(tagTable, member.ref, entry.ref));
			note(tagTable, "listed on the tag's own page, linked to the page carrying it");
		}
		// Provenance attachments, rendered by `AttachmentBlock` on the subject's,
		// resource's, or (for a carrier-less kind — sk-jay0.3.5.76) the entry's own
		// page. Exactly one of the three ever carries a given entry's attachments,
		// and for all three the entry's own kind IS the attachment's `target_kind`,
		// so the identity is read off the page rather than assembled from a table
		// of kinds.
		for (const attachment of entry.subject?.attachments ??
			entry.resource?.attachments ??
			entry.attachments ??
			[]) {
			witnessed.add(
				compositeKey("metadata_attachments", entry.kind, entry.ref, attachment.namespace),
			);
			note("metadata_attachments", "shown as the entry's own provenance and attachments");
		}
		// Two places carry facets, and missing the second one is worth a line:
		// `entry.facets` is what the entry itself dumps (a place graph's layers and
		// nodes), while an entity definition's own rows hang off `entry.subject`.
		// Reading only the first credits the map layers and leaves 4126 initial
		// state rows counted as reaching nobody while they render on screen.
		for (const facet of [...(entry.facets ?? []), ...(entry.subject?.facets ?? [])]) {
			if (facet.table === undefined) continue;
			for (const key of facetKeys(facet)) {
				witnessed.add(key);
				note(facet.table, `shown on the ${entry.kind} page it belongs to`);
			}
		}
	}
	// An article can embed a subject at `view="compact"` or `view="full"`
	// (`::subject{...view=...}`, `docs-markdown.ts`) — `article.blocks` records
	// which, per embed, and `DocsArticleBody.svelte` reads that same field to
	// pick the component: `SubjectView` renders the whole attachments block only
	// for `"full"`; `"compact"` renders a `ReferenceCard` thumbnail and nothing
	// else. Crediting a compact embed would be the over-generous witness this
	// module exists to avoid — it would file the row out of the basin while no
	// reader ever sees more than a thumbnail (sk-jay0.3.5.76).
	// Only the attachments are credited, not the rest of the subject: a full
	// embed exists to show art Elven Mini attaches to an SRD entity, not to
	// duplicate that entity's own page.
	for (const article of articles) {
		for (const block of article.blocks ?? []) {
			if (block.kind !== "subject" || block.view !== "full") continue;
			const subject = article.subjects?.find(
				(candidate) => candidate.kind === block.subjectKind && candidate.ref === block.ref,
			);
			if (subject === undefined) continue;
			for (const attachment of subject.attachments) {
				witnessed.add(
					compositeKey("metadata_attachments", subject.kind, subject.ref, attachment.namespace),
				);
				note(
					"metadata_attachments",
					"shown as the attachments of a subject an article embeds at full view",
				);
			}
		}
	}
	// A root page's own `[[bundles]]` row, rendered in its "About this bundle"
	// block, plus whatever that block's own facets dump — the same shape
	// `entry.facets` uses above, just carried on the `DocsPage` rather than on
	// a `DocsCatalogueEntry` (no catalogue kind exists for `bundles`).
	for (const page of pages) {
		if (page.bundle === undefined) continue;
		// The bundle row itself rides as its "Bundle record" facet, so it is
		// credited below like every other facet row, not by id alone.
		for (const facet of page.bundle.facets) {
			if (facet.table === undefined) continue;
			for (const key of facetKeys(facet)) {
				witnessed.add(key);
				note(facet.table, `shown in the ${page.bundle.ref} bundle's 'About this bundle' block`);
			}
		}
	}
	return { keys: witnessed, reasons, violations };
}

/**
 * Every catalogue entry the emitted index reaches, read back off disk.
 *
 * A section's compact listing ships as its own artifact and the index keeps
 * only the href. `collectCensusSource` reads it the same way; walking
 * `section.catalogue` alone silently sees nothing at all, which is how the
 * first run of this measurement reported every kind undelivered including the
 * ones plainly on screen.
 */
export function* emittedCatalogueEntries(
	index: DocsIndexV1,
	outputRoot: string,
): Generator<DocsCatalogueEntry> {
	for (const page of index.pages)
		for (const section of page.sections) {
			const catalogue =
				section.catalogue ??
				(section.catalogue_href
					? readArtifact<NonNullable<typeof section.catalogue>>(outputRoot, section.catalogue_href)
					: []);
			for (const summary of catalogue)
				yield readArtifact<DocsCatalogueEntry>(outputRoot, summary.artifact_href);
		}
}

/**
 * Every article the emitted index reaches, read back off disk — the other
 * page kind `collectWitnesses` can credit a row from (a subject embedded at
 * `view="full"`).
 */
export function* emittedArticles(index: DocsIndexV1, outputRoot: string): Generator<DocsArticle> {
	for (const page of index.pages)
		for (const section of page.sections)
			for (const summary of section.pages ?? [])
				yield readArtifact<DocsArticle>(outputRoot, summary.artifact_href);
}

/**
 * Every page the emitted index reaches — the third `collectWitnesses` source,
 * for a root page's own "About this bundle" block. Unlike a catalogue entry
 * or an article, a `DocsPage` carries its `bundle` field inline in
 * `index.json` rather than behind a lazy artifact href, so there is nothing
 * to read off disk here; this generator exists only so every witness source
 * is reached through the same "off disk" naming as its siblings.
 */
export function* emittedPages(index: DocsIndexV1): Generator<DocsPage> {
	yield* index.pages;
}

/**
 * Compare what the manifest authors against what the emitted pages prove.
 *
 * `identities` is `catalogueIdentities(ROW_KIND_NATURAL_KEY)` from
 * `@spellkave/srd-cc/docs/row-kind-coverage`, passed in so this module needs
 * no wasm-backed registry of its own. Authored public-field policy is read
 * directly, and redacted witnesses are checked against the full source rows.
 */
export function measureDelivery(
	manifest: Row,
	index: DocsIndexV1,
	outputRoot: string,
	keys: DeliveryKeys,
	identities: Readonly<Record<string, { table: string; idField: string }>>,
): DeliveryReport {
	const {
		keys: witnessed,
		reasons,
		violations,
	} = collectWitnesses(
		emittedCatalogueEntries(index, outputRoot),
		emittedArticles(index, outputRoot),
		keys,
		identities,
		emittedPages(index),
		Object.entries(manifest).flatMap(([kind, value]) =>
			Array.isArray(value) ? value.map((row) => [kind, row as Row] as const) : [],
		),
		true,
	);
	if (violations.length > 0) throw new Error(violations.join("\n"));

	const kinds: DeliveryKindReport[] = [];
	let authoredTotal = 0;
	let deliveredTotal = 0;

	for (const [table, value] of Object.entries(manifest)) {
		if (table === "include" || !Array.isArray(value) || value.length === 0) continue;
		const occurrences = (value as Row[]).filter((row) => row !== null && typeof row === "object");
		let delivered = 0;
		for (const row of occurrences)
			if (witnessed.has(occurrenceKey(table, row, keys))) delivered += 1;
		authoredTotal += occurrences.length;
		deliveredTotal += delivered;
		kinds.push({
			kind: table,
			authored: occurrences.length,
			delivered,
			undelivered: occurrences.length - delivered,
			witness: delivered > 0 ? (reasons.get(table) ?? "witnessed") : null,
		});
	}

	kinds.sort(
		(left, right) => right.undelivered - left.undelivered || left.kind.localeCompare(right.kind),
	);
	return {
		kinds,
		authored: authoredTotal,
		delivered: deliveredTotal,
		undelivered: authoredTotal - deliveredTotal,
	};
}
