// The uniform tag junctions, derived rather than listed.
//
// Twelve manifest tables have exactly one shape — `{<parent>_id, tag,
// bundle_id, source}` — and each binds one subject to one tag. Writing them out
// by hand would be a thirteenth place to keep in sync with the kernel, and the
// twelfth already drifted once. So the pairing is DERIVED, from two sources
// that already have to be right:
//
//   - the kernel's `ROW_KIND_COMPOSITE_KEY` names the ordered identity pair of
//     each junction, e.g. `capability_definition_tag -> (capability_id, tag)`.
//     The element that is not `tag` is the parent column, by construction.
//   - `catalogueIdentities` names, per entry kind, the table and id column of
//     the subject that has its own page.
//
// Stripping `_tag` off the junction name yields the entry kind, and the two
// sources are then required to AGREE on the column. They do for eleven of the
// twelve; `roll_table_entry_tag` resolves to nothing because `roll_table_entries`
// is owner-surfaced and has no page of its own, which is the honest answer
// rather than a special case — a tag cannot be shown on a page that does not
// exist.
//
// No new authored vocabulary: nothing here is a table of editorial decisions,
// only a join between two registries that already exist.

/** One junction table and the column naming the subject that carries the tag. */
export interface TagEdgeParent {
	/** The manifest table holding the junction rows. */
	readonly table: string;
	/** The junction column naming the parent subject. */
	readonly parentColumn: string;
	/** The manifest table of the parent subject. */
	readonly parentTable: string;
}

const TAG_COLUMN = "tag";
const TAG_SUFFIX = "_tag";

/**
 * Every uniform tag junction whose parent subject has a page, by entry kind.
 *
 * Throws when the kernel and the classification disagree on the parent column,
 * because a silent mismatch here is a tag that renders on nobody's page while
 * every count still looks healthy.
 */
export function tagEdgeParents(
	composite: Readonly<Record<string, readonly string[]>>,
	identities: Readonly<Record<string, { table: string; idField: string }>>,
): Readonly<Record<string, TagEdgeParent>> {
	const parents: Record<string, TagEdgeParent> = {};
	for (const [table, key] of Object.entries(composite)) {
		if (!table.endsWith(TAG_SUFFIX)) continue;
		const columns = key.filter((column) => column !== TAG_COLUMN);
		// A junction whose key is not exactly (parent, tag) is not one of the
		// uniform twelve — `tag_capability_grant` is keyed (tag, capability_id)
		// and its parent IS the tag, so it is deliberately not carried here.
		if (columns.length !== 1 || key.length !== 2) continue;
		const parentColumn = columns[0] as string;
		const entryKind = table.slice(0, -TAG_SUFFIX.length);
		const identity = identities[entryKind];
		// No page for the parent means no place to show the tag. Leaving the
		// junction out is what makes the delivery measurement report it as
		// unreached instead of quietly crediting it.
		if (identity === undefined) continue;
		if (identity.idField !== parentColumn)
			throw new Error(
				`tag junction '${table}' is keyed on '${parentColumn}' but '${entryKind}' pages are keyed on '${identity.idField}'; the kernel registry and row-kind-coverage.toml disagree`,
			);
		parents[entryKind] = { table, parentColumn, parentTable: identity.table };
	}
	return parents;
}

/**
 * The tags each subject carries, keyed `<entry kind>:<ref>`.
 *
 * One pass over the manifest rather than one filter per entry: the SRD authors
 * 13k of these rows and the per-entry scan was quadratic enough to notice.
 */
export function tagsByEntry(
	manifest: Readonly<Record<string, unknown>>,
	parents: Readonly<Record<string, TagEdgeParent>>,
): ReadonlyMap<string, readonly string[]> {
	const byEntry = new Map<string, string[]>();
	for (const [entryKind, parent] of Object.entries(parents)) {
		const rows = manifest[parent.table];
		if (!Array.isArray(rows)) continue;
		for (const row of rows as Record<string, unknown>[]) {
			const ref = row[parent.parentColumn];
			const tag = row[TAG_COLUMN];
			if (typeof ref !== "string" || typeof tag !== "string") continue;
			const key = `${entryKind}:${ref}`;
			const tags = byEntry.get(key);
			// An identical (subject, tag) pair may be declared more than once; the
			// reader sees one chip either way, and the occurrence key collapses
			// them the same way.
			if (tags) {
				if (!tags.includes(tag)) tags.push(tag);
			} else byEntry.set(key, [tag]);
		}
	}
	return byEntry;
}
