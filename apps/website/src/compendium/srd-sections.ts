import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseToml } from "smol-toml";

/**
 * srd-cc's `packages/spellkave-srd-cc/src/docs/sections.toml` — read as a
 * plain data file (never a TS import: `apps/website`'s `tsconfig.json`
 * scopes `rootDir` to its own `src/`, so importing srd-cc's module graph
 * directly does not typecheck; other website code that reaches into srd-cc's
 * package does the same raw-path read, e.g. the parity test's fixture/cache
 * reads). srd-cc's own `docs/catalogue.ts` parses and validates the SAME
 * file at generation time; this is a read-only second reader of the same
 * authored source, not a second source of truth.
 *
 * ONE parse, ONE module: `project-metadata-docs.ts` (fact derivation) and
 * `srd-catalogue-listing.ts` (catalogue listing derivation, sk-jay0.3.5.59)
 * both read the sections/rules they need from here rather than each
 * re-parsing the file.
 */
const SRD_CC_SECTIONS_PATH = resolve(
	import.meta.dirname,
	"../../../../packages/spellkave-srd-cc/src/docs/sections.toml",
);

/** One srd-cc `sections.toml` `[[fact_namespaces]]` row — see that table's own doc comment for the `derive` rule vocabulary. */
export interface FactNamespaceRule {
	label: string;
	namespace: string;
	derive: "title" | "kebab" | "sentence" | "level" | "cr" | "attunement";
}

/** One srd-cc `sections.toml` `[[entity_routes]]` row — see that table's own doc comment. */
export interface EntityRoute {
	tag: string;
	prefix: string;
	family: string;
	section: string;
}

/** One srd-cc `sections.toml` `[[class_feature_slug_overrides]]` row. */
export interface ClassFeatureSlugOverride {
	short_slug: string;
	ref: string;
}

/** One srd-cc `sections.toml` `[[section_primary_families]]` row — see that table's own doc comment. */
export interface SectionPrimaryFamily {
	section: string;
	family: string;
}

/** One srd-cc `sections.toml` `[[family_headings]]` row — see that table's own doc comment. */
export interface FamilyHeading {
	family: string;
	heading: string;
	noun_singular: string;
	noun_plural: string;
}

/** A secondary catalogue group's count-phrase noun, e.g. `{ singular: "class feature", plural: "class features" }`. */
export interface FamilyNoun {
	singular: string;
	plural: string;
}

/** One srd-cc `sections.toml` `[[identity_namespaces]]` row — see that table's own doc comment (sk-jay0.3.5.65). */
export interface IdentityNamespace {
	family: string;
	namespace: string;
}

/**
 * One `sections.toml` `[[entity_owner_routes]]` row: a family of entity
 * definitions that renders on ANOTHER entity's page instead of getting one of
 * its own. See that table's own doc comment for why the link cannot be derived.
 */
export interface EntityOwnerRoute {
	prefix: string;
	namespace: string;
	field: string;
	owner_prefix: string;
	label: string;
}

/** One srd-cc `sections.toml` `[[resource_blocks]]` row — see that table's own doc comment. */
export interface ResourceBlock {
	family: string;
	heading: string;
	rest_title: string;
}

/** One srd-cc `sections.toml` `[[resource_groups]]` row — see that table's own doc comment. */
export interface ResourceGroupRule {
	family: string;
	title: string;
	resources: readonly string[];
}

/** One srd-cc `sections.toml` `[[article_link_sections]]` row — see that table's own doc comment. */
export interface ArticleLinkSection {
	section: string;
}

/** One srd-cc `sections.toml` `[[article_catalogue_lists]]` row — see that table's own doc comment. */
export interface ArticleCatalogueList {
	section: string;
	/** The one article this list belongs to. Mutually exclusive with `article_prefix`. */
	article?: string;
	/** Every article in the section whose id starts here — one row for a whole run of chapters. */
	article_prefix?: string;
	title: string;
	/** The exact entries, in the order the chapter prints them. Mutually exclusive with `ref_prefix`. */
	refs?: readonly string[];
	/** Every entry whose ref starts here — the set is derived, so new entries join it on their own. */
	ref_prefix?: string;
	/** Every entry carrying this tag — for a set the data names but no ref prefix gathers. */
	tag?: string;
	/**
	 * Every `###` heading in the chapter's own body, as a ref built from this
	 * pattern — `{slug}` is the heading, lowercased with runs of anything else
	 * turned into a single dash. For a chapter whose members the data groups
	 * nowhere, but whose own text names them one heading at a time.
	 */
	from_headings?: string;
	/** Narrows a prefix that spans families: `srd/armor/` names 13 armors and 13 modifiers. */
	family?: string;
}

interface SectionsFile {
	entity_routes: readonly EntityRoute[];
	article_link_sections: readonly ArticleLinkSection[];
	article_catalogue_lists: readonly ArticleCatalogueList[];
	entity_owner_routes: readonly EntityOwnerRoute[];
	tags_section: string;
	class_feature_slug_overrides: readonly ClassFeatureSlugOverride[];
	section_primary_families: readonly SectionPrimaryFamily[];
	family_headings: readonly FamilyHeading[];
	identity_namespaces: readonly IdentityNamespace[];
	fact_namespaces: readonly FactNamespaceRule[];
	fact_value_overrides: ReadonlyArray<{ tag: string; value: string }>;
	resource_blocks: readonly ResourceBlock[];
	resource_groups: readonly ResourceGroupRule[];
}

function loadSectionsFile(): SectionsFile {
	const parsed = parseToml(readFileSync(SRD_CC_SECTIONS_PATH, "utf8")) as Record<string, unknown>;
	return {
		entity_routes: Array.isArray(parsed.entity_routes)
			? (parsed.entity_routes as unknown as EntityRoute[])
			: [],
		article_link_sections: Array.isArray(parsed.article_link_sections)
			? (parsed.article_link_sections as unknown as ArticleLinkSection[])
			: [],
		article_catalogue_lists: Array.isArray(parsed.article_catalogue_lists)
			? (parsed.article_catalogue_lists as unknown as ArticleCatalogueList[])
			: [],
		entity_owner_routes: Array.isArray(parsed.entity_owner_routes)
			? (parsed.entity_owner_routes as unknown as EntityOwnerRoute[])
			: [],
		tags_section: typeof parsed.tags_section === "string" ? parsed.tags_section : "",
		class_feature_slug_overrides: Array.isArray(parsed.class_feature_slug_overrides)
			? (parsed.class_feature_slug_overrides as unknown as ClassFeatureSlugOverride[])
			: [],
		section_primary_families: Array.isArray(parsed.section_primary_families)
			? (parsed.section_primary_families as unknown as SectionPrimaryFamily[])
			: [],
		family_headings: Array.isArray(parsed.family_headings)
			? (parsed.family_headings as unknown as FamilyHeading[])
			: [],
		identity_namespaces: Array.isArray(parsed.identity_namespaces)
			? (parsed.identity_namespaces as unknown as IdentityNamespace[])
			: [],
		fact_namespaces: Array.isArray(parsed.fact_namespaces)
			? (parsed.fact_namespaces as unknown as FactNamespaceRule[])
			: [],
		fact_value_overrides: Array.isArray(parsed.fact_value_overrides)
			? (parsed.fact_value_overrides as unknown as ReadonlyArray<{ tag: string; value: string }>)
			: [],
		resource_blocks: Array.isArray(parsed.resource_blocks)
			? (parsed.resource_blocks as unknown as ResourceBlock[])
			: [],
		resource_groups: Array.isArray(parsed.resource_groups)
			? (parsed.resource_groups as unknown as ResourceGroupRule[])
			: [],
	};
}

const SECTIONS_FILE = loadSectionsFile();

export const ENTITY_ROUTES: readonly EntityRoute[] = SECTIONS_FILE.entity_routes;
export const ENTITY_OWNER_ROUTES: readonly EntityOwnerRoute[] = SECTIONS_FILE.entity_owner_routes;
/**
 * The authored catalogue lists an article closes with, in authored order.
 *
 * Several, not one: "Create Your Character" prints three sets the bundle holds
 * — twelve classes, nineteen languages, nine alignments — and a chapter that
 * printed two tables would otherwise silently show only the first.
 */
export function articleCatalogueListsFor(
	section: string,
	article: string,
): readonly ArticleCatalogueList[] {
	return SECTIONS_FILE.article_catalogue_lists.filter(
		(row) =>
			row.section === section &&
			(row.article === article ||
				(row.article_prefix !== undefined && article.startsWith(row.article_prefix))),
	);
}

/** Section ids whose article titles are automatic link targets inside other articles' prose. */
export const ARTICLE_LINK_SECTIONS: ReadonlySet<string> = new Set(
	SECTIONS_FILE.article_link_sections.map((row) => row.section),
);
export const TAGS_SECTION: string = SECTIONS_FILE.tags_section;
export const CLASS_FEATURE_SLUG_OVERRIDES: readonly ClassFeatureSlugOverride[] =
	SECTIONS_FILE.class_feature_slug_overrides;
export const SECTION_PRIMARY_FAMILIES: readonly SectionPrimaryFamily[] =
	SECTIONS_FILE.section_primary_families;
export const FAMILY_HEADINGS: ReadonlyMap<string, string> = new Map(
	SECTIONS_FILE.family_headings.map(({ family, heading }) => [family, heading]),
);
export const FAMILY_NOUNS: ReadonlyMap<string, FamilyNoun> = new Map(
	SECTIONS_FILE.family_headings.map(({ family, noun_singular, noun_plural }) => [
		family,
		{ singular: noun_singular, plural: noun_plural },
	]),
);
export const IDENTITY_NAMESPACES: ReadonlyMap<string, string> = new Map(
	SECTIONS_FILE.identity_namespaces.map(({ family, namespace }) => [family, namespace]),
);

export const FACT_NAMESPACES: readonly FactNamespaceRule[] = SECTIONS_FILE.fact_namespaces;
export const FACT_VALUE_OVERRIDES: ReadonlyMap<string, string> = new Map(
	SECTIONS_FILE.fact_value_overrides.map(({ tag, value }) => [tag, value]),
);

/**
 * The authored presentation order for a family's own resource values, or
 * `undefined` for a family that has none — every other family keeps the plain
 * related-definitions list.
 */
export function resourceBlockFor(family: string): ResourceBlock | undefined {
	return SECTIONS_FILE.resource_blocks.find((block) => block.family === family);
}

/** The groups of that block, in authored order. */
export function resourceGroupsFor(family: string): readonly ResourceGroupRule[] {
	return SECTIONS_FILE.resource_groups.filter((group) => group.family === family);
}
