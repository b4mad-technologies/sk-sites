import { describe, expect, it } from "vitest";
import type { DocsCatalogueEntrySummary } from "./docs-types";
import type { FamilyNoun } from "./srd-catalogue-groups";
import {
	groupCatalogueByNamespace,
	groupSrdCatalogueEntries,
	humanizeNamespaceSegment,
} from "./srd-catalogue-groups";

const HEADINGS: Record<string, string> = {
	tag: "Vocabulary",
	"class-feature": "Class features",
	subclass: "Subclasses",
	resource: "Resources",
};

const NOUNS: Record<string, FamilyNoun> = {
	tag: { singular: "vocabulary entry", plural: "vocabulary entries" },
	"class-feature": { singular: "class feature", plural: "class features" },
	subclass: { singular: "subclass", plural: "subclasses" },
	resource: { singular: "resource", plural: "resources" },
};

function entry(family: string, ref: string): DocsCatalogueEntrySummary {
	return {
		kind: family === "tag" ? "tag_value_definition" : "entity_definition",
		ref,
		family,
		slug: ref,
		display_name: ref,
		description: "",
		href: `/docs/srd/classes/${ref}`,
		artifact_href: `/compendium/docs/catalogue/srd/classes/${ref}.json`,
		facts: [],
	};
}

describe("groupSrdCatalogueEntries", () => {
	it("classes: lists only the 12 classes as primary; class features, subclasses, and tags stay secondary under their own headings and count nouns", () => {
		const classes = Array.from({ length: 12 }, (_, i) => entry("class", `class-${i}`));
		const subclasses = Array.from({ length: 12 }, (_, i) => entry("subclass", `subclass-${i}`));
		const classFeatures = Array.from({ length: 3 }, (_, i) =>
			entry("class-feature", `feature-${i}`),
		);
		const resources = [entry("resource", "resource-0")];
		const tags = Array.from({ length: 2 }, (_, i) => entry("tag", `tag-${i}`));
		const catalogue = [...classes, ...subclasses, ...classFeatures, ...resources, ...tags];

		const grouping = groupSrdCatalogueEntries(["class"], HEADINGS, NOUNS, catalogue);

		expect(grouping.primary).toHaveLength(12);
		expect(grouping.primary.every((item) => item.family === "class")).toBe(true);

		const byFamily = new Map(grouping.secondary.map((group) => [group.family, group]));
		expect(byFamily.get("class-feature")?.entries).toHaveLength(3);
		expect(byFamily.get("class-feature")).toMatchObject({
			heading: "Class features",
			noun: { singular: "class feature", plural: "class features" },
		});
		expect(byFamily.get("subclass")).toMatchObject({
			heading: "Subclasses",
			noun: { singular: "subclass", plural: "subclasses" },
		});
		expect(byFamily.get("resource")).toMatchObject({
			heading: "Resources",
			noun: { singular: "resource", plural: "resources" },
		});
		expect(byFamily.get("tag")).toMatchObject({
			heading: "Vocabulary",
			noun: { singular: "vocabulary entry", plural: "vocabulary entries" },
		});

		// No class/subclass/feature/resource/tag entry leaks between groups.
		expect(grouping.secondary.flatMap((group) => group.entries)).toHaveLength(18);
	});

	it("equipment: weapon/armor/tool/item are all primary together; only tag stays secondary", () => {
		const catalogue = [
			entry("weapon", "w0"),
			entry("armor", "a0"),
			entry("tool", "t0"),
			entry("item", "i0"),
			entry("tag", "tag-0"),
		];

		const grouping = groupSrdCatalogueEntries(
			["weapon", "armor", "tool", "item"],
			HEADINGS,
			NOUNS,
			catalogue,
		);

		expect(grouping.primary.map((item) => item.family).sort()).toEqual([
			"armor",
			"item",
			"tool",
			"weapon",
		]);
		expect(grouping.secondary).toHaveLength(1);
		expect(grouping.secondary[0]?.family).toBe("tag");
	});

	it("an empty primary-families list (character-creation) keeps the whole catalogue secondary", () => {
		const catalogue = [entry("tag", "tag-0"), entry("tag", "tag-1")];

		const grouping = groupSrdCatalogueEntries([], HEADINGS, NOUNS, catalogue);

		expect(grouping.primary).toHaveLength(0);
		expect(grouping.secondary).toHaveLength(1);
		expect(grouping.secondary[0]).toMatchObject({
			family: "tag",
			heading: "Vocabulary",
			noun: { singular: "vocabulary entry", plural: "vocabulary entries" },
		});
		expect(grouping.secondary[0]?.entries).toHaveLength(2);
	});

	it("falls back to a humanized heading and a pluralized noun for a family with no authored family_headings row", () => {
		const grouping = groupSrdCatalogueEntries(["class"], HEADINGS, NOUNS, [
			entry("mystery-widget", "m0"),
			entry("mystery-widget", "m1"),
		]);
		expect(grouping.secondary[0]).toMatchObject({
			family: "mystery-widget",
			heading: "Mystery widget",
			noun: { singular: "mystery widget", plural: "mystery widgets" },
		});
	});
});

function tag(slug: string): DocsCatalogueEntrySummary {
	return {
		kind: "tag_value_definition",
		ref: `srd.${slug.replaceAll("/", ".")}`,
		family: "tag",
		slug,
		display_name: slug,
		description: "",
		href: `/docs/srd/tags/${slug}`,
		artifact_href: `/compendium/docs/catalogue/srd/tags/${slug}.json`,
		facts: [],
	};
}

describe("groupCatalogueByNamespace (sk-jay0.3.5.66)", () => {
	const catalogue = [
		tag("monster"),
		tag("cr"),
		tag("cr/2"),
		tag("cr/1-2"),
		tag("alignment"),
		tag("alignment/chaotic-evil"),
		tag("spell/range/self"),
		tag("spell/range/touch"),
	];

	it("groups the section root into namespaces (>1 nested member) and plain leaves (no nesting)", () => {
		const { leaves, namespaces } = groupCatalogueByNamespace(catalogue, "");
		expect(leaves.map((item) => item.slug)).toEqual(["monster"]);
		expect(namespaces.map((group) => group.segment).sort()).toEqual(["alignment", "cr", "spell"]);
	});

	it("counts every descendant, not just direct children", () => {
		const { namespaces } = groupCatalogueByNamespace(catalogue, "");
		const spell = namespaces.find((group) => group.segment === "spell");
		// spell/range/self and spell/range/touch both nest under "spell".
		expect(spell?.count).toBe(2);
		expect(spell?.slug).toBe("spell");
	});

	it("still reports a namespace group for a segment that is ALSO its own tag (e.g. cr)", () => {
		const { namespaces, leaves } = groupCatalogueByNamespace(catalogue, "");
		expect(namespaces.some((group) => group.segment === "cr")).toBe(true);
		// cr itself never appears as a plain leaf once it has children — the
		// router, not this grouping, decides whether visiting "cr" resolves
		// as an entry or a further namespace listing.
		expect(leaves.some((item) => item.slug === "cr")).toBe(false);
	});

	it("lists what is directly under a deeper prefix, mixing leaves and namespaces", () => {
		const { leaves, namespaces } = groupCatalogueByNamespace(catalogue, "spell");
		expect(namespaces.map((group) => group.slug)).toEqual(["spell/range"]);
		expect(namespaces[0]?.count).toBe(2);
		expect(leaves).toEqual([]);
	});

	it("lists direct leaf children under a prefix with no further nesting", () => {
		const { leaves, namespaces } = groupCatalogueByNamespace(catalogue, "spell/range");
		expect(leaves.map((item) => item.slug).sort()).toEqual([
			"spell/range/self",
			"spell/range/touch",
		]);
		expect(namespaces).toEqual([]);
	});

	it("returns nothing under a prefix with no matching entries", () => {
		expect(groupCatalogueByNamespace(catalogue, "does-not-exist")).toEqual({
			leaves: [],
			namespaces: [],
		});
	});
});

describe("humanizeNamespaceSegment", () => {
	it("capitalizes only the leading word, matching the family-heading casing rule", () => {
		expect(humanizeNamespaceSegment("creature-type")).toBe("Creature type");
		expect(humanizeNamespaceSegment("cr")).toBe("Cr");
	});
});
