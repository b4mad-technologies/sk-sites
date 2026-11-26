import { describe, expect, it } from "vitest";
import type { DocsIndexV1 } from "./docs-types";
import { isCompendiumPath, parseCompendiumPath, resolveCompendiumRoute } from "./parse-path";

const index: DocsIndexV1 = {
	version: 1,
	pages: [
		{
			page_id: "srd",
			title: "SRD",
			nav_group: "reference",
			intro: "",
			href: "/docs/srd",
			sections: [
				{
					id: "monsters",
					title: "Monsters",
					intro: "",
					href: "/docs/srd/monsters",
					catalogue: [
						{
							kind: "entity_definition",
							ref: "srd/creature/goblin",
							family: "monster",
							slug: "goblin",
							display_name: "Goblin",
							description: "",
							href: "/docs/srd/monsters/goblin",
							artifact_href: "/compendium/docs/goblin.json",
							facts: [],
						},
					],
				},
				{
					id: "tags",
					title: "Tag Vocabulary",
					intro: "",
					href: "/docs/srd/tags",
					// Lazily loaded (catalogue_href only, no inline catalogue) — the
					// resolver must decide entry / namespace / missing from
					// `catalogue_slugs` alone, never by fetching the full catalogue
					// (sk-jay0.3.5.66).
					catalogue_href: "/compendium/docs/catalogues/srd/tags.json",
					catalogue_slugs: [
						"monster",
						"subclass/path-of-the-berserker",
						// `alignment` is BOTH its own tag AND a namespace with a
						// nested child — a tag id being both is not a collision.
						"alignment",
						"alignment/chaotic-evil",
						// `spell/range` is a PURE prefix — no tag lives at that
						// exact slug, only children beneath it.
						"spell/range/self",
						"spell/range/touch",
					],
				},
			],
		},
		{
			page_id: "elven-mini",
			title: "Elven Mini",
			nav_group: "adventure",
			intro: "",
			href: "/docs/adventures/elven-mini",
			sections: [
				{
					id: "cast",
					title: "Cast",
					intro: "",
					href: "/docs/adventures/elven-mini/cast",
					catalogue_href: "/compendium/docs/catalogue.json",
					catalogue_slugs: ["mira"],
				},
			],
		},
	],
	technical_sources: [
		{
			source_id: "srd",
			bundle_ids: ["srd"],
			row_count: 1,
			href: "/docs/technical/srd",
			tables: [
				{ table: "entities", count: 1, href: "/compendium/docs/technical/srd/entities.json" },
			],
		},
	],
};

describe("generic docs paths", () => {
	it("only claims /docs", () => {
		expect(parseCompendiumPath("/docs/srd/monsters")).toEqual({
			corpus: "docs",
			page: "path",
			pathname: "/docs/srd/monsters",
		});
		expect(parseCompendiumPath("/srd/monsters")).toBeNull();
		expect(parseCompendiumPath("/adventures/elven-mini")).toBeNull();
		expect(isCompendiumPath("/docs/adventures/elven-mini")).toBe(true);
	});

	it("redirects the retired authoring-patterns SRD route to its own docs root (sk-jay0.3.5.80)", () => {
		expect(parseCompendiumPath("/docs/srd/authoring-patterns")).toEqual({
			corpus: "docs",
			page: "path",
			pathname: "/docs/authoring/patterns",
		});
		expect(parseCompendiumPath("/docs/srd/authoring-patterns/quest-composition")).toEqual({
			corpus: "docs",
			page: "path",
			pathname: "/docs/authoring/patterns/quest-composition",
		});
		// Trailing slash and query/hash are normalized the same as any other path.
		expect(parseCompendiumPath("/docs/srd/authoring-patterns/quest-composition/?x=1#y")).toEqual({
			corpus: "docs",
			page: "path",
			pathname: "/docs/authoring/patterns/quest-composition",
		});
	});

	it("resolves nested mounts from the projected page hrefs", () => {
		expect(resolveCompendiumRoute("/docs/srd", index)).toEqual({ page: "overview", pageId: "srd" });
		expect(resolveCompendiumRoute("/docs/srd/monsters", index)).toEqual({
			page: "section",
			pageId: "srd",
			sectionId: "monsters",
		});
		expect(resolveCompendiumRoute("/docs/srd/monsters/goblin", index)).toEqual({
			page: "entry",
			pageId: "srd",
			sectionId: "monsters",
			slug: "goblin",
		});
		expect(resolveCompendiumRoute("/docs/adventures/elven-mini", index)).toEqual({
			page: "overview",
			pageId: "elven-mini",
		});
		expect(resolveCompendiumRoute("/docs/adventures/elven-mini/cast/mira", index)).toEqual({
			page: "entry",
			pageId: "elven-mini",
			sectionId: "cast",
			slug: "mira",
		});
	});

	it("keeps technical pages in the same docs family", () => {
		expect(resolveCompendiumRoute("/docs/technical/srd/entities", index)).toEqual({
			page: "technical-table",
			bundleId: "srd",
			table: "entities",
		});
		expect(resolveCompendiumRoute("/docs/technical/nope", index)).toEqual({ page: "missing" });
	});
});

describe("multi-segment tag namespace routes (sk-jay0.3.5.66)", () => {
	it("resolves a single-segment tag slug to an entry", () => {
		expect(resolveCompendiumRoute("/docs/srd/tags/monster", index)).toEqual({
			page: "entry",
			pageId: "srd",
			sectionId: "tags",
			slug: "monster",
		});
	});

	it("resolves a multi-segment tag slug to an entry", () => {
		expect(resolveCompendiumRoute("/docs/srd/tags/subclass/path-of-the-berserker", index)).toEqual({
			page: "entry",
			pageId: "srd",
			sectionId: "tags",
			slug: "subclass/path-of-the-berserker",
		});
	});

	it("resolves a strict-prefix slug with no tag of its own to a namespace listing", () => {
		expect(resolveCompendiumRoute("/docs/srd/tags/subclass", index)).toEqual({
			page: "namespace",
			pageId: "srd",
			sectionId: "tags",
			slug: "subclass",
		});
		// `spell/range` itself is never a tag, only a prefix of deeper ones.
		expect(resolveCompendiumRoute("/docs/srd/tags/spell/range", index)).toEqual({
			page: "namespace",
			pageId: "srd",
			sectionId: "tags",
			slug: "spell/range",
		});
	});

	it("never invents an entry for a slug that matches nothing — the regression the old catalogue_href fallback hid", () => {
		expect(resolveCompendiumRoute("/docs/srd/tags/does-not-exist", index)).toEqual({
			page: "missing",
		});
		expect(resolveCompendiumRoute("/docs/srd/tags/spell/range/does-not-exist", index)).toEqual({
			page: "missing",
		});
	});

	it("resolves a tag id that is BOTH a tag and a namespace to its own entry, not a namespace listing", () => {
		// `alignment` is a real tag AND a prefix of `alignment/chaotic-evil` —
		// an exact match always wins over the prefix check.
		expect(resolveCompendiumRoute("/docs/srd/tags/alignment", index)).toEqual({
			page: "entry",
			pageId: "srd",
			sectionId: "tags",
			slug: "alignment",
		});
	});
});
