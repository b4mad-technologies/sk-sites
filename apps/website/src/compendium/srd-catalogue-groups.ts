import type { DocsCatalogueEntrySummary } from "./docs-types";

/**
 * Pure, browser-safe catalogue grouping (sk-jay0.3.5.64). Deliberately does
 * NOT read `sections.toml` itself — `srd-sections.ts` does that via
 * `node:fs` and is build-time-only (see its own header); shipping that
 * import into a Svelte component would pull `node:fs` into the client
 * bundle and crash the page (found the hard way: DocsPageOverview.svelte
 * rendered a blank screen with a `node:fs` `pageerror` once this module
 * imported `srd-sections.ts` directly). Instead, `project-metadata-docs.ts`
 * (Node-side) projects the three `sections.toml` tables this needs —
 * `section_primary_families` as each section's own `primary_families`
 * array, `family_headings`/`family_nouns` once at the top of the published
 * `index.json` — and this module only ever receives that already-projected
 * plain data.
 */

export interface FamilyNoun {
	singular: string;
	plural: string;
}

/**
 * Generic over the row shape so the same grouping machinery serves both a
 * full catalogue listing (`DocsCatalogueEntrySummary`, the default) and the
 * minimal `DocsTagMemberSummary` rows a tag page groups its members by
 * (sk-jay0.3.5.67) — both carry `family`, which is all this needs.
 */
export interface CatalogueFamilyGroup<T extends { family: string } = DocsCatalogueEntrySummary> {
	family: string;
	heading: string;
	noun: FamilyNoun;
	entries: T[];
}

export interface CatalogueGrouping<T extends { family: string } = DocsCatalogueEntrySummary> {
	primary: T[];
	secondary: readonly CatalogueFamilyGroup<T>[];
}

/** "mystery-widget" -> "Mystery widget": only the leading word capitalized, matching normal English sentence case for a heading. */
function humanizeFamilyHeading(family: string): string {
	const [first, ...rest] = family.split("-");
	if (first === undefined) return family;
	return [`${first[0]?.toUpperCase() ?? ""}${first.slice(1)}`, ...rest].join(" ");
}

/** "mystery-widget" -> "mystery widget": all-lowercase, for mid-sentence count-phrase use. */
function humanizeFamilyNoun(family: string): string {
	return family.replaceAll("-", " ");
}

/** Best-effort English pluralization for a family `sections.toml`'s `family_headings` never authored a noun for — should not happen for any real SRD family today. */
function pluralize(word: string): string {
	if (/[^aeiou]y$/iu.test(word)) return `${word.slice(0, -1)}ies`;
	if (/(s|x|z|ch|sh)$/iu.test(word)) return `${word}es`;
	return `${word}s`;
}

function headingForFamily(
	family: string,
	familyHeadings: Readonly<Record<string, string>>,
): string {
	return familyHeadings[family] ?? humanizeFamilyHeading(family);
}

function nounForFamily(
	family: string,
	familyNouns: Readonly<Record<string, FamilyNoun>>,
): FamilyNoun {
	const authored = familyNouns[family];
	if (authored) return authored;
	const singular = humanizeFamilyNoun(family);
	return { singular, plural: pluralize(singular) };
}

/**
 * Splits a section's catalogue listing into its own primary subject
 * (`primaryFamilies`, from `DocsSection.primary_families`) and everything
 * else, grouped by family under an authored heading and count-phrase noun
 * (`familyHeadings`/`familyNouns`, from `DocsIndexV1.family_headings`/
 * `family_nouns`) — sk-jay0.3.5.64. Grouping never reorders entries beyond
 * this split; each group keeps the incoming catalogue order. An empty
 * `primaryFamilies` (character-creation today) returns an empty primary
 * list, so the whole catalogue stays in the secondary groups.
 */
export interface CatalogueNamespaceGroup {
	/** The next path segment below the prefix, e.g. "range" under prefix "spell". */
	segment: string;
	/** The full slug for this group, e.g. "spell/range" — the link target. */
	slug: string;
	/** Every catalogue entry at this slug or nested under it. */
	count: number;
}

export interface CatalogueNamespaceListing {
	/** Direct children of `prefix` that carry no descendants of their own — link straight to their own entry page. */
	leaves: DocsCatalogueEntrySummary[];
	/** Direct children of `prefix` that DO have further nested entries beneath them — link to their own namespace/entry page, whichever it turns out to be. */
	namespaces: CatalogueNamespaceGroup[];
}

/**
 * Groups a flat, slug-hierarchical catalogue (currently only the SRD `tags`
 * section, sk-jay0.3.5.66 — see `tagPathSlug` in srd-cc's `docs/catalogue.ts`)
 * into what belongs directly under one path prefix: entries with EXACTLY one
 * more path segment than `prefix` are direct children, split into `leaves`
 * (nothing nests under them) and `namespaces` (something does — that child
 * may ALSO be a real entry in its own right, e.g. `srd.cr` beside
 * `srd.cr.2`; the router decides whether visiting it resolves as an entry or
 * a further namespace listing, this function only decides whether the CARD
 * links to a plain entry or a namespace with a count). `prefix === ""` lists
 * a section's own top-level namespaces (e.g. `/docs/srd/tags`).
 */
export function groupCatalogueByNamespace(
	catalogue: readonly DocsCatalogueEntrySummary[],
	prefix: string,
): CatalogueNamespaceListing {
	const prefixSegments = prefix === "" ? [] : prefix.split("/");
	const depth = prefixSegments.length;
	const children = new Map<string, { entry?: DocsCatalogueEntrySummary; count: number }>();
	for (const entry of catalogue) {
		const segments = entry.slug.split("/");
		if (segments.length <= depth) continue;
		if (prefixSegments.some((segment, index) => segments[index] !== segment)) continue;
		const childSegment = segments[depth];
		if (childSegment === undefined) continue;
		const bucket = children.get(childSegment) ?? { count: 0 };
		bucket.count += 1;
		if (segments.length === depth + 1) bucket.entry = entry;
		children.set(childSegment, bucket);
	}
	const leaves: DocsCatalogueEntrySummary[] = [];
	const namespaces: CatalogueNamespaceGroup[] = [];
	for (const [segment, bucket] of children) {
		if (bucket.count === 1 && bucket.entry !== undefined) {
			leaves.push(bucket.entry);
			continue;
		}
		namespaces.push({ segment, slug: [...prefixSegments, segment].join("/"), count: bucket.count });
	}
	leaves.sort((left, right) => left.display_name.localeCompare(right.display_name));
	namespaces.sort((left, right) => left.segment.localeCompare(right.segment));
	return { leaves, namespaces };
}

/**
 * "creature-type" -> "Creature type": a namespace segment humanized as a
 * heading. Same casing rule as (and reuses) the family-heading fallback
 * above — a namespace segment has no authored heading table of its own, so
 * this is the ONLY rule for it, not merely a fallback.
 */
export function humanizeNamespaceSegment(segment: string): string {
	return humanizeFamilyHeading(segment);
}

export function groupSrdCatalogueEntries<T extends { family: string } = DocsCatalogueEntrySummary>(
	primaryFamilies: readonly string[],
	familyHeadings: Readonly<Record<string, string>>,
	familyNouns: Readonly<Record<string, FamilyNoun>>,
	catalogue: readonly T[],
): CatalogueGrouping<T> {
	const primarySet = new Set(primaryFamilies);
	const primary: T[] = [];
	const secondaryByFamily = new Map<string, T[]>();
	for (const entry of catalogue) {
		if (primarySet.has(entry.family)) {
			primary.push(entry);
			continue;
		}
		const group = secondaryByFamily.get(entry.family) ?? [];
		group.push(entry);
		secondaryByFamily.set(entry.family, group);
	}
	const secondary: CatalogueFamilyGroup<T>[] = [...secondaryByFamily.entries()].map(
		([family, entries]) => ({
			family,
			heading: headingForFamily(family, familyHeadings),
			noun: nounForFamily(family, familyNouns),
			entries,
		}),
	);
	return { primary, secondary };
}
