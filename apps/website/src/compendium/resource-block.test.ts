import { describe, expect, it } from "vitest";
import type { DocsResourceBlock } from "./docs-types";
import { resourceBlock } from "./resource-block";
import { resourceBlockFor, resourceGroupsFor } from "./srd-sections";

const relation = (ref: string) => ({ ref });

const block: DocsResourceBlock = {
	heading: "Statistics",
	rest_title: "Other authored values",
	groups: [
		{ title: "Defense", resources: ["srd/ac", "srd/hp"] },
		{ title: "Speed", resources: ["srd/speed-walk", "srd/speed-fly"] },
		{ title: "Ability Scores", resources: ["srd/str", "srd/cha"] },
	],
};

describe("resourceBlock", () => {
	it("has no block for an entry the projection gave none", () => {
		expect(resourceBlock(undefined, [relation("srd/ac")])).toBeUndefined();
	});

	it("orders the values as the authored groups name them", () => {
		const view = resourceBlock(block, [
			relation("srd/cha"),
			relation("srd/str"),
			relation("srd/hp"),
			relation("srd/ac"),
			relation("srd/speed-walk"),
		]);
		if (view === undefined) throw new Error("a block with matching relations renders");
		expect(view.heading).toBe("Statistics");
		expect(view.groups.map((group) => group.title)).toEqual(["Defense", "Speed", "Ability Scores"]);
		expect(view.groups[0]?.entries.map((entry) => entry.ref)).toEqual(["srd/ac", "srd/hp"]);
		expect(view.groups[2]?.entries.map((entry) => entry.ref)).toEqual(["srd/str", "srd/cha"]);
	});

	// The point of the trailing group: authoring a resource onto a creature must
	// reach the reader without anyone remembering to edit sections.toml first.
	it("keeps a value no group names, in the trailing group", () => {
		const view = resourceBlock(block, [relation("srd/ac"), relation("srd/newly-authored")]);
		const last = view?.groups.at(-1);
		expect(last?.title).toBe("Other authored values");
		expect(last?.entries.map((entry) => entry.ref)).toEqual(["srd/newly-authored"]);
	});

	it("names a group only when a value lands in it", () => {
		const view = resourceBlock(block, [relation("srd/ac")]);
		expect(view?.groups.map((group) => group.title)).toEqual(["Defense"]);
	});

	// Authored data, checked where it is authored: a ref in two groups would make
	// the first group win silently.
	it("names each resource at most once across the authored monster groups", () => {
		expect(resourceBlockFor("monster")?.heading).toBe("Statistics");
		const seen = new Set<string>();
		for (const group of resourceGroupsFor("monster"))
			for (const ref of group.resources) {
				expect(seen.has(ref)).toBe(false);
				seen.add(ref);
			}
		expect(seen.size).toBeGreaterThan(0);
	});
});
