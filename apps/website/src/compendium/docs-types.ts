// These shapes moved to `@spellkave/ui-widgets/catalogue` so the shared reader
// components own them. This module keeps re-exporting them under their old
// names, and imports them locally as well: `export … from` alone re-exports
// without binding the names in this file, so the declarations below that use
// them (`DocsArticleCatalogueList.entries`, `DocsRowEntryView.references`, …)
// would not resolve.
import type {
	DocsDslField,
	DocsDslToken,
	DocsReferenceGroup,
	DocsRowEntryReference,
	DocsRowEntryView,
	DocsRowField,
} from "@spellkave/ui-widgets/catalogue";

export interface DocsSource {
	path: string;
	anchor: string;
	license: string;
}

export interface DocsAttachment {
	bundle_id: string;
	namespace: string;
	source?: string;
	payload: Record<string, unknown>;
	asset_href?: string;
	rendered_text?: string;
	/**
	 * The namespace's own `metadata_namespaces` registration audience — a
	 * `VisibilityClass` token (`local`, `hidden`, `internal`, `discoverable`),
	 * the strict owner token `owned`, or a capability id such as
	 * `frontier.apply_manifest` (ADR-0130 D-3) — present only when that
	 * registration is not `public`. Read off the registration rather than a
	 * hard-coded namespace list (sk-jay0.3.5.76) — the reader labels every
	 * attachment, including this one, from this value (`audience-label.ts`);
	 * it does not hide it (sk-jay0.3.5.77).
	 */
	audience?: string;
}

/**
 * One of a subject/resource's authored tags, resolved against the docs
 * catalogue where possible. `href`/`display_name`/`description` are present
 * only when the tag itself has a `tag_value_definition` catalogue page
 * (see `SECTION_BY_TAG_PREFIX` in srd-cc); otherwise the tag stays an
 * unlinked chip carrying only its raw id.
 */
export interface DocsTagLink {
	tag: string;
	href?: string;
	display_name?: string;
	description?: string;
}

/**
 * One block of authored rows rendered on their owner's page.
 *
 * `table` names the manifest table the rows came from, and is present only when
 * EVERY row in the facet came from that one table. Explicit `public_fields`
 * projections carry opaque `source_digests` checked against build-time source;
 * other facets retain the authored fields. The delivery measurement uses
 * schema identities for whole rows. For an approved allowlist it validates
 * both the opaque full-source digest and the exact public-field projection
 * against build-time source; a digest alone cannot excuse a changed row.
 * Labels are presentation and do not establish which table a row belongs to.
 * A facet mixing tables omits `table` and establishes no delivery witness.
 *
 * `derived` names keys the projection ADDED to each row (an asset href resolved
 * from a manifest path, say). Most of these tables register no identity column
 * with the kernel, so a row is recognised by its whole contents; a key the
 * manifest never carried would make every such row look like a different one.
 * Those known additions are excluded from source identity, not credited as
 * authored fields. Private subjects remain in build-time source only, never
 * rows or metadata. `role-binding-privacy.test.ts` proves tamper, duplicate,
 * missing-row and private-field rejection plus whole-build output privacy.
 */
export interface DocsFacet {
	label: string;
	rows: Record<string, unknown>[];
	table?: string;
	derived?: string[];
	/** Opaque full-source digests aligned with explicitly redacted rows; never authored identities. */
	source_digests?: string[];
}

/**
 * The authored presentation order for a family's own resource values, projected
 * from srd-cc's `sections.toml` (`resource_blocks` / `resource_groups`) so the
 * browser never reads that file — see `resource-block.ts`.
 */
export interface DocsResourceBlock {
	heading: string;
	rest_title: string;
	groups: { title: string; resources: string[] }[];
}

export interface DocsResource {
	ref: string;
	bundle_id: string;
	display_name: string;
	description: string;
	value_kind: string;
	min_value?: number;
	max_value?: number;
	initial_value?: number;
	recovery_rule?: string;
	href: string;
	tags: string[];
	tag_links?: DocsTagLink[];
	attachments: DocsAttachment[];
}

export type DocsSubjectKind = "entity_definition" | "entity";

export interface DocsSubject {
	kind: DocsSubjectKind;
	ref: string;
	bundle_id: string;
	display_name: string;
	description: string;
	href: string;
	definition_ref?: string;
	tags: string[];
	tag_links?: DocsTagLink[];
	attachments: DocsAttachment[];
	facets: DocsFacet[];
}

/** A tag's own docs page projection — see `SrdCatalogueEntry.kind === "tag_value_definition"`. */
export interface DocsTag {
	ref: string;
	bundle_id: string;
	display_name: string;
	description: string;
	href: string;
}

/**
 * `href` and `featured_reference` are mutually exclusive (sk-jay0.7.93): a
 * "featured" article is displayed as the named catalogue entry's own
 * attached prose (`resolveSectionTail` in parse-path.ts deliberately excludes
 * it from standalone resolution, `CatalogueEntryPage` renders it), so it owns
 * no route of its own and `href` is absent. A non-featured article always
 * carries `href`. `artifact_href` stays present either way — the coverage
 * validator and content census still read a featured article's own artifact
 * for its resource/subject routes and prose digest.
 */
export interface DocsArticleSummary {
	/** Optional portable docs identity; absent on older artifacts. */
	guidance?: import("@spellkave/tool-contracts").DocsMetadata;
	id: string;
	title: string;
	href?: string;
	artifact_href: string;
	resource_routes?: Array<{ ref: string; href: string }>;
	compact_resources?: DocsResource[];
	subject_routes?: Array<{ kind: DocsSubjectKind; ref: string; href: string }>;
	featured_reference?: {
		kind: DocsSubjectKind | "resource_definition";
		ref: string;
	};
}

export interface DocsArticle extends DocsArticleSummary {
	body: string;
	source: DocsSource;
	resources?: DocsResource[];
	subjects?: DocsSubject[];
	blocks?: import("./docs-markdown").DocsBodyBlock[];
	/**
	 * What this ruleset holds for what the chapter just described, projected
	 * from srd-cc's `sections.toml` `article_catalogue_lists`. They close the
	 * article; the licensed prose above them is untouched. Several, because a
	 * chapter can print several sets.
	 */
	catalogue_lists?: DocsArticleCatalogueList[];
}

/** A chapter's closing list of catalogue entries, resolved to routes. */
export interface DocsArticleCatalogueList {
	title: string;
	entries: DocsRowEntryReference[];
}

export interface DocsFact {
	label: string;
	value: string;
	/** Raw tag id this fact restates, when the entity carries one (sk-jay0.3.5.52). */
	tag?: string;
	/** Resolved once the tag itself has an unambiguous `tag_value_definition` catalogue page. */
	href?: string;
}

export interface DocsCatalogueEntrySummary {
	kind: string;
	ref: string;
	family: string;
	slug: string;
	display_name: string;
	description: string;
	href: string;
	artifact_href: string;
	facts: DocsFact[];
	tags?: string[];
	source?: DocsSource;
	art?: { href: string; path: string; hash: string; license: string };
}

/**
 * One catalogue entry that carries a tag, attached to THAT TAG'S OWN full
 * artifact as `DocsCatalogueEntry.members` (see project-metadata-docs.ts,
 * sk-jay0.3.5.67). Deliberately minimal: a namespace tag like `srd.monster`
 * can have hundreds of members and every one of them ships inside the tag
 * page's own artifact, so no facts/art/relations/record — just enough to
 * render a `ReferenceCard`.
 */
export interface DocsTagMemberSummary {
	/**
	 * The member's own catalogue kind, naming the junction table this membership
	 * came from. Present so a hosted definition — one with no page of its own,
	 * linked here to the page that hosts it — is still attributable to the row
	 * that authored the edge.
	 */
	kind?: string;
	ref: string;
	family: string;
	display_name: string;
	description: string;
	href: string;
}

export interface DocsCatalogueEntry extends DocsCatalogueEntrySummary {
	record: Record<string, unknown>;
	featured_article?: DocsArticle;
	/**
	 * Every catalogue entry across the WHOLE corpus (not just this tag's own
	 * section) whose `tags` carry this entry's own tag id — present only on
	 * `tag_value_definition` entries, and only when non-empty (sk-jay0.3.5.67).
	 * Sorted by `display_name`. Stripped from the compact per-section catalogue
	 * summary and search index — it lives only in the tag's own per-entry
	 * artifact, fetched on that one page.
	 */
	members?: DocsTagMemberSummary[];
	/**
	 * This entry's own `tags`, resolved to the tag's page where that tag has an
	 * unambiguous one. `DocsSubject`/`DocsResource` carry their own copy for the
	 * two kinds that have such a carrier; this entry-level field is what every
	 * OTHER page kind renders from, so a tag junction is a link from both ends
	 * rather than a chip on one end and a list on the other (sk-jay0.3.5.71.4).
	 * Ships only in the per-entry artifact.
	 */
	tag_links?: DocsTagLink[];
	/**
	 * `tag_capability_grant`, the junction whose parent IS the tag: a tag hands
	 * out a capability rather than being worn by one. It cannot ride the uniform
	 * tag pass, so it is carried explicitly and from both ends — the capabilities
	 * a tag grants, on the tag's page, and the tags that grant a capability, on
	 * the capability's page (sk-jay0.3.5.71.4).
	 */
	granted_capabilities?: DocsTagMemberSummary[];
	granting_tags?: DocsTagLink[];
	/**
	 * What this entry points at, grouped by the column that points, and what
	 * points back, grouped by the kind doing the pointing. Both ship only in the
	 * per-entry artifact, never in a compact section listing — a heavily
	 * referenced row has many of each.
	 */
	references?: DocsReferenceGroup[];
	referenced_by?: DocsReferenceGroup[];
	/** Token streams for DSL-bearing columns, keyed by field name. */
	dsl?: Record<string, DocsDslField>;
	facets?: DocsFacet[];
	resource?: DocsResource;
	subject?: DocsSubject;
	tag?: DocsTag;
	/**
	 * `metadata_attachments` rows targeting THIS entry directly, for a kind with
	 * no `DocsSubject`/`DocsResource` carrier to hang them off (a place graph's
	 * `place.note`, an affordance template's `ui.affordance_group` —
	 * sk-jay0.3.5.76). A carrier-bearing kind keeps shipping its attachments on
	 * `subject`/`resource` instead and leaves this unset, so a page never shows
	 * the same attachment twice.
	 */
	attachments?: DocsAttachment[];
	resource_block?: DocsResourceBlock;
	relations?: Array<{
		kind: string;
		ref: string;
		label?: string;
		href?: string;
		bundle_id?: string;
		source?: string;
		/** The creature's own value for this resource, from entity_definition_initial_state. */
		value_int?: number;
		/** The creature's own value for this resource, from entity_definition_initial_state. */
		value_bool?: boolean;
		/** Trimmed projection (no attachments/facets) for compact-card rendering; see project-metadata-docs.ts. */
		resource?: DocsResource;
		/** Trimmed projection (no attachments/facets) for compact-card rendering; see project-metadata-docs.ts. */
		subject?: DocsSubject;
	}>;
	provenance?: Array<{
		namespace: string;
		bundle_id: string;
		source?: string;
		payload_source?: string;
		license?: string;
	}>;
}

export interface DocsDocumentSummary extends DocsArticleSummary {
	// A document, unlike an article, is never "featured" by a catalogue entry
	// — it always owns its own route (sk-jay0.7.93 narrows the inherited
	// optional `href` back to required here).
	href: string;
	ref: string;
	slug: string;
	family: string;
	tags?: string[];
	relations?: Array<{ kind: string; ref: string; label?: string; href?: string }>;
}

export interface DocsDocument extends DocsArticle {
	href: string;
	ref: string;
	slug: string;
	family: string;
}

export interface DocsSection {
	id: string;
	title: string;
	intro: string;
	href: string;
	pages?: DocsArticleSummary[];
	catalogue?: DocsCatalogueEntrySummary[];
	catalogue_href?: string;
	catalogue_count?: number;
	/**
	 * Every catalogue entry's own `slug`, projected alongside a lazily
	 * loaded `catalogue_href` (sk-jay0.3.5.66) so the router can resolve a
	 * path WITHOUT fetching the full catalogue (facts, descriptions, art) —
	 * see `resolveSectionTail` in `parse-path.ts`. Present whenever
	 * `catalogue`/`catalogue_href` is (both are populated from the same
	 * list at projection time); a section with neither carries no slugs
	 * either.
	 */
	catalogue_slugs?: readonly string[];
	documents?: DocsDocumentSummary[];
	/**
	 * Catalogue `family` values that ARE this section's own subject
	 * (sk-jay0.3.5.64, authored in srd-cc's `sections.toml`
	 * `section_primary_families`, projected build-time by
	 * `project-metadata-docs.ts` — never derived client-side, since that
	 * would require shipping `node:fs` TOML reads into the browser bundle).
	 * Present (possibly empty, e.g. "character-creation") only for a section
	 * `sections.toml` places catalogue entries into at all; absent for a
	 * non-SRD bundle section, which keeps listing its whole catalogue
	 * ungrouped exactly as before this field existed.
	 */
	primary_families?: string[];
}

/**
 * Which sidebar navigation group a documentation page belongs to
 * (`CompendiumSidebar.svelte`). Authored on the page's `metadata.docs`
 * (see `compendium-metadata.ts` / `author/docs.ts`), not derived from
 * `page_id` or sort order — required so the sidebar's group placement is
 * always a decision, never an accident of string sort.
 */
export type DocsNavGroup = "adventure" | "reference";

/**
 * "About this bundle": the root manifest's own `[[bundles]]` row plus the
 * rows it owns — never the merged dependency closure the rest of that root's
 * page is built from, so a dependent bundle's page never shows a
 * dependency's own bundle info. Present only on the one `DocsPage` per
 * registered root (`project-metadata-docs.ts`'s `projectBundleInfo`).
 */
export interface DocsPageBundle {
	ref: string;
	display_name: string;
	author: string;
	version: string;
	depends_on: readonly string[];
	description: string;
	facets: DocsFacet[];
}

export interface DocsPage {
	page_id: string;
	title: string;
	intro: string;
	nav_group: DocsNavGroup;
	source_base?: string;
	attributions?: Array<{
		body: string;
		source: DocsSource;
		blocks: import("./docs-markdown").DocsBodyBlock[];
	}>;
	links?: Array<{ label: string; kind: string; ref: string; href: string; autolink?: boolean }>;
	href: string;
	sections: DocsSection[];
	bundle?: DocsPageBundle;
}

export interface DocsIndexV1 {
	version: 1;
	pages: DocsPage[];
	search_href?: string;
	technical_sources?: DocsTechnicalSourceSummary[];
	/** Secondary catalogue group heading text, keyed by `family` — see `DocsSection.primary_families` (sk-jay0.3.5.64). */
	family_headings?: Record<string, string>;
	/** Secondary catalogue group count-phrase noun, keyed by `family` — see `DocsSection.primary_families` (sk-jay0.3.5.64). */
	family_nouns?: Record<string, { singular: string; plural: string }>;
	/**
	 * The tag namespace that names an entity of this family, keyed by
	 * `family` — see `sections.toml`'s `[[identity_namespaces]]` doc
	 * comment (sk-jay0.3.5.65). A family absent from this map never has a
	 * "belongs to this entity" catalogue-page block.
	 */
	identity_namespaces?: Record<string, string>;
}

export interface DocsSearchEntry {
	id: string;
	ref: string;
	name: string;
	kind: string;
	corpus_label: string;
	chapter: string;
	slug: string;
	tags: string[];
	search_text: string;
	art_thumb: string | null;
	has_art: boolean;
	href: string;
}

export interface DocsTechnicalTableSummary {
	table: string;
	count: number;
	href: string;
}

export interface DocsTechnicalSourceSummary {
	source_id: string;
	bundle_ids: string[];
	row_count: number;
	href: string;
	tables: DocsTechnicalTableSummary[];
}

export interface DocsTechnicalTable {
	version: 1;
	source_id: string;
	bundle_ids: string[];
	table: string;
	rows: Record<string, unknown>[];
}

export type {
	DocsDslField,
	DocsDslToken,
	DocsReferenceGroup,
	DocsRowEntryReference,
	DocsRowEntryView,
	DocsRowField,
};
