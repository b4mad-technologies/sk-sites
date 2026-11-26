/** Small routing/search shapes owned by the manifest-projected docs application. */

export interface CompendiumStat {
	key: string;
	label: string;
	value: string;
}
export interface CompendiumSource {
	label: string;
	cache_path: string;
	primary_key: string;
	fixture_path: string;
}
export interface CompendiumArt {
	path: string;
	hash: string;
	license: string;
	native_px: number | null;
}
export interface CompendiumAttachment {
	namespace: string;
	target_kind: string;
	target_ref: string;
	payload: Record<string, unknown>;
}

export interface CompendiumIndexEntry {
	id: string;
	name: string;
	kind: string;
	chapter: string;
	slug: string;
	tags: string[];
	search_text: string;
	art_thumb: string | null;
	has_art: boolean;
	href?: string;
}

export type CompendiumRoute =
	| { corpus: "docs"; page: "index" }
	| { corpus: "docs"; page: "path"; pathname: string };

export type ResolvedCompendiumRoute =
	| { page: "missing" }
	| { page: "index" }
	| { page: "collection"; pathname: string }
	| { page: "technical-bundle"; bundleId: string }
	| { page: "technical-table"; bundleId: string; table: string }
	| { page: "overview"; pageId: string }
	| { page: "section"; pageId: string; sectionId: string }
	| { page: "entry"; pageId: string; sectionId: string; slug: string }
	/**
	 * A catalogue slug that is a strict PREFIX of at least one known entry
	 * slug in the section but is not itself a known entry (e.g.
	 * `/docs/srd/tags/spell/range` when `srd.spell.range` is not itself a
	 * tag) — routing-only distinction from `entry` so the resolver never
	 * invents an entry page for a bare namespace segment. Rendering reuses
	 * the same namespace-listing view an `entry` that is ALSO a namespace
	 * renders inline (sk-jay0.3.5.66) — see `DocsPageOverview.svelte`.
	 */
	| { page: "namespace"; pageId: string; sectionId: string; slug: string }
	| { page: "resource"; pageId: string; sectionId: string; resourceRef: string }
	| {
			page: "subject";
			pageId: string;
			sectionId: string;
			subjectKind: "entity_definition" | "entity";
			subjectRef: string;
	  };
