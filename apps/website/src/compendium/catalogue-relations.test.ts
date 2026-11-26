import { describe, expect, it } from "vitest";
import { catalogueProvenanceCandidates, catalogueRelations } from "./catalogue-relations";

const manifest = {
	entities: [{ entity_key: "demo/goblin-1", entity_def_id: "demo/goblin", bundle_id: "demo" }],
	entity_definitions: [
		{ entity_def_id: "demo/goblin", display_name: "Goblin", bundle_id: "demo" },
		{ entity_def_id: "demo/scimitar", display_name: "Scimitar", bundle_id: "demo" },
	],
	resource_definitions: [
		{ resource_definition_id: "demo/str", display_name: "Strength", bundle_id: "demo" },
	],
	entity_definition_initial_state: [{ entity_def_id: "demo/goblin", state_id: "demo/str" }],
	entity_definition_initial_equipment: [
		{ entity_def_id: "demo/goblin", equipped_entity_def_id: "demo/scimitar" },
	],
	metadata_attachments: [
		{
			target_kind: "entity",
			target_ref: "demo/goblin-1",
			namespace: "demo.text",
			bundle_id: "demo",
			source: "manifest",
			payload_json: '{"source":"source.md:4","license":"CC0"}',
		},
	],
	session_definitions: [{ session_def_id: "demo/fight", combat_grid_blueprint_id: "demo/grid" }],
	combat_grid_blueprints: [{ blueprint_id: "demo/grid", bundle_id: "demo" }],
};

describe("catalogue exact joins", () => {
	it("projects typed relations without interpreting identifier prefixes", () => {
		expect(catalogueRelations(manifest, { kind: "entity", ref: "demo/goblin-1" })).toEqual([
			{ kind: "entity_definition", ref: "demo/goblin", label: "Goblin", bundle_id: "demo" },
		]);
		expect(catalogueRelations(manifest, { kind: "entity_definition", ref: "demo/goblin" })).toEqual(
			[
				{ kind: "entity_definition", ref: "demo/scimitar", label: "Scimitar", bundle_id: "demo" },
				{ kind: "resource_definition", ref: "demo/str", label: "Strength", bundle_id: "demo" },
			],
		);
		expect(catalogueRelations(manifest, { kind: "session_definition", ref: "demo/fight" })).toEqual(
			[{ kind: "combat_grid_blueprint", ref: "demo/grid", bundle_id: "demo" }],
		);
	});

	it("carries the seeded value_int/value_bool onto a resource_definition relation", () => {
		const withValue = {
			...manifest,
			entity_definition_initial_state: [
				{ entity_def_id: "demo/goblin", state_id: "demo/str", value_bool: true, value_int: 15 },
			],
		};
		expect(
			catalogueRelations(withValue, { kind: "entity_definition", ref: "demo/goblin" }),
		).toEqual([
			{ kind: "entity_definition", ref: "demo/scimitar", label: "Scimitar", bundle_id: "demo" },
			{
				kind: "resource_definition",
				ref: "demo/str",
				label: "Strength",
				bundle_id: "demo",
				value_int: 15,
				value_bool: true,
			},
		]);
	});

	it("joins a blueprint's Text state to its object state definition", () => {
		const withText = {
			...manifest,
			object_state_definitions: [
				{ state_id: "demo/appearance", display_name: "Appearance", bundle_id: "demo" },
			],
			entity_definition_initial_state: [
				{
					entity_def_id: "demo/goblin",
					state_id: "demo/appearance",
					value_bool: true,
					value_text: "",
				},
			],
		};
		expect(catalogueRelations(withText, { kind: "entity_definition", ref: "demo/goblin" })).toEqual(
			[
				{ kind: "entity_definition", ref: "demo/scimitar", label: "Scimitar", bundle_id: "demo" },
				{
					kind: "object_state_definition",
					ref: "demo/appearance",
					label: "Appearance",
					bundle_id: "demo",
					value_bool: true,
					value_text: "",
				},
			],
		);
		expect(() =>
			catalogueRelations(
				{ ...withText, object_state_definitions: [] },
				{ kind: "entity_definition", ref: "demo/goblin" },
			),
		).toThrow(/resolves to 0 rows/);
	});

	it("joins every real SRD monster to its six authored ability resources", () => {
		const root = resolve(import.meta.dirname, "../../../../packages/spellkave-srd-cc/fixtures");
		const loaded = inspectManifest(loadFlattened(root, "manifest.toml")).manifest as Record<
			string,
			unknown
		>;
		const monsterRefs = new Set(
			(loaded.entity_definition_tag as Array<Record<string, unknown>>)
				.filter((row) => row.tag === "srd.monster")
				.map((row) => String(row.entity_def_id)),
		);
		const abilities = new Set(["srd/str", "srd/dex", "srd/con", "srd/int", "srd/wis", "srd/cha"]);
		expect(monsterRefs.size).toBe(331);
		for (const ref of monsterRefs) {
			const abilityRefs = catalogueRelations(loaded, { kind: "entity_definition", ref })
				.filter((relation) => abilities.has(relation.ref))
				.map((relation) => relation.ref);
			expect(new Set(abilityRefs), ref).toEqual(abilities);
		}
	});

	it("returns exact target-matched contributor and payload provenance", () => {
		expect(
			catalogueProvenanceCandidates(manifest, { kind: "entity", ref: "demo/goblin-1" }),
		).toEqual([
			{
				namespace: "demo.text",
				bundle_id: "demo",
				source: "manifest",
				payload_source: "source.md:4",
				license: "CC0",
			},
		]);
	});

	it("rejects ambiguous joins and unsafe metadata values", () => {
		expect(() =>
			catalogueRelations(
				{
					...manifest,
					entity_definitions: [...manifest.entity_definitions, manifest.entity_definitions[0]],
				},
				{ kind: "entity", ref: "demo/goblin-1" },
			),
		).toThrow("resolves to 2 rows");
		expect(() =>
			catalogueProvenanceCandidates(
				{
					...manifest,
					metadata_attachments: [
						{ ...manifest.metadata_attachments[0], unsafe: Number.MAX_SAFE_INTEGER + 1 },
					],
				},
				{ kind: "entity", ref: "demo/goblin-1" },
			),
		).toThrow("unsafe integer");
		expect(() =>
			catalogueProvenanceCandidates(
				{
					...manifest,
					metadata_attachments: [
						{
							...manifest.metadata_attachments[0],
							payload_json: `{"unsafe":${Number.MAX_SAFE_INTEGER + 1}}`,
						},
					],
				},
				{ kind: "entity", ref: "demo/goblin-1" },
			),
		).toThrow("unsafe integer");
		expect(() =>
			catalogueProvenanceCandidates(
				{
					...manifest,
					metadata_attachments: [{ ...manifest.metadata_attachments[0], payload_json: "[]" }],
				},
				{ kind: "entity", ref: "demo/goblin-1" },
			),
		).toThrow("payload must be an object");
		expect(() =>
			catalogueProvenanceCandidates(
				{
					...manifest,
					metadata_attachments: [{ ...manifest.metadata_attachments[0], payload_json: "{" }],
				},
				{ kind: "entity", ref: "demo/goblin-1" },
			),
		).toThrow(SyntaxError);
	});
});

import { resolve } from "node:path";
import { inspectManifest, loadFlattened } from "@spellkave/world-author";
