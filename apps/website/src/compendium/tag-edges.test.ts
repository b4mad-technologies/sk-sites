import { resolve } from "node:path";
import { catalogueIdentities } from "@spellkave/srd-cc/docs/row-kind-coverage";
import {
	inspectManifest,
	loadFlattened,
	ROW_KIND_COMPOSITE_KEY,
	ROW_KIND_NATURAL_KEY,
} from "@spellkave/world-author";
import { describe, expect, it } from "vitest";
import { tagEdgeParents, tagsByEntry } from "./tag-edges";

const IDENTITIES = catalogueIdentities(ROW_KIND_NATURAL_KEY);
const PARENTS = tagEdgeParents(ROW_KIND_COMPOSITE_KEY, IDENTITIES);

describe("tagEdgeParents", () => {
	it("pairs every uniform tag junction whose subject has a page", () => {
		// Derived, not listed. If the kernel gains a thirteenth junction of this
		// shape and its subject is page-surfaced, it appears here without anyone
		// editing a table — which is the whole reason this is a derivation.
		expect(Object.keys(PARENTS).toSorted()).toEqual([
			"action_definition",
			"capability_definition",
			"condition_definition",
			"entity",
			"entity_definition",
			"modifier_template",
			"niche_definition",
			"object_state_definition",
			"outcome_template",
			"resource_definition",
			"roll_table",
		]);
		expect(PARENTS.capability_definition).toEqual({
			table: "capability_definition_tag",
			parentColumn: "capability_id",
			parentTable: "capability_definitions",
		});
	});

	it("leaves out a junction whose subject has no page of its own", () => {
		// `roll_table_entries` is owner-surfaced: its rows render on the parent
		// roll table's page and have no page of their own. A tag chip needs a page
		// to sit on, so the junction is absent — and the delivery measurement then
		// reports its rows as reaching nobody, which is true.
		expect(ROW_KIND_COMPOSITE_KEY.roll_table_entry_tag).toBeDefined();
		expect(PARENTS.roll_table_entry).toBeUndefined();
	});

	it("leaves out a junction whose parent is the tag itself", () => {
		// `tag_capability_grant` is keyed (tag, capability_id): the tag hands out
		// the capability rather than carrying it. Folding it in here would render
		// a capability as if it were one of the tag's own tags.
		expect(ROW_KIND_COMPOSITE_KEY.tag_capability_grant).toEqual(["tag", "capability_id"]);
		expect(Object.values(PARENTS).some((parent) => parent.table === "tag_capability_grant")).toBe(
			false,
		);
	});

	it("throws when the kernel and the classification disagree on the parent column", () => {
		// The guard that matters. A silent mismatch is a tag rendering on nobody's
		// page while every count still looks healthy, which is the exact failure
		// this project has already hit twice.
		expect(() =>
			tagEdgeParents(
				{ capability_definition_tag: ["capability_ref", "tag"] },
				{ capability_definition: { table: "capability_definitions", idField: "capability_id" } },
			),
		).toThrow(/keyed on 'capability_ref' but 'capability_definition' pages are keyed on/);
	});
});

describe("tagsByEntry", () => {
	it("reads the authored corpus and keys on (entry kind, ref)", { timeout: 30_000 }, () => {
		const manifest = inspectManifest(
			loadFlattened(
				resolve(import.meta.dirname, "../../../../packages/spellkave-srd-cc/fixtures"),
				"manifest.toml",
			),
		).manifest as Record<string, unknown>;
		const tags = tagsByEntry(manifest, PARENTS);
		// An id names a subject in more than one kind, so the key cannot be the
		// ref alone: `srd/skill/acrobatics` is a capability here, and the same
		// string is an entity definition elsewhere with its own tags.
		expect(tags.get("capability_definition:srd/skill/acrobatics")).toEqual([
			"srd.skill",
			"srd.ability.dex",
		]);
		expect(tags.get("srd/skill/acrobatics")).toBeUndefined();
	});

	it("collapses a subject/tag pair declared more than once", () => {
		const tags = tagsByEntry(
			{
				action_definition_tag: [
					{ action_id: "a", tag: "t" },
					{ action_id: "a", tag: "t" },
					{ action_id: "a", tag: "u" },
				],
			},
			{
				action_definition: {
					table: "action_definition_tag",
					parentColumn: "action_id",
					parentTable: "action_definitions",
				},
			},
		);
		expect(tags.get("action_definition:a")).toEqual(["t", "u"]);
	});
});
