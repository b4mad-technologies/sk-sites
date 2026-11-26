import { describe, expect, it } from "vitest";
import {
	buildReferenceGraph,
	type ReferenceGraphTarget,
	readableKind,
	referenceGraphKey,
} from "./reference-graph";

/**
 * The opportunity-attack chain from
 * `packages/spellkave-srd-cc/fixtures/base/playing-the-game/attacks.toml`,
 * trimmed to the columns that carry references. Real rows: the DSL text below
 * is the actual authored predicate, which is what makes the buried-reference
 * case honest rather than a straw man.
 */
function targets(): ReferenceGraphTarget[] {
	return [
		{
			ref: "srd/attack/opportunity-attack",
			kind: "action_definition",
			href: "/docs/a/action",
			display_name: "Opportunity Attack",
			record: {
				action_id: "srd/attack/opportunity-attack",
				on_success: "srd/attack/opportunity-attack/success",
				on_failure: "srd/attack/opportunity-attack/miss",
				required_capability: "srd/action/attack",
				resolution_predicate_source:
					"macro('srd/attack_roll_hits', d20, cond(actor.has_capability('srd/class-feature/fighter/champion/improved-critical'), 19, 20))",
			},
		},
		{
			ref: "srd/attack/opportunity-attack/success",
			kind: "consequence_template",
			href: "/docs/a/success",
			display_name: "Opportunity Attack — Success",
			description: "Subtract damage. A hit that drops a monster to 0 HP kills it.",
			record: { template_id: "srd/attack/opportunity-attack/success" },
		},
		{
			ref: "srd/attack/opportunity-attack/miss",
			kind: "consequence_template",
			href: "/docs/a/miss",
			display_name: "Opportunity Attack — Miss",
			record: { template_id: "srd/attack/opportunity-attack/miss" },
		},
		{
			ref: "srd/action/attack",
			kind: "capability_definition",
			href: "/docs/a/capability",
			display_name: "Attack",
			record: { capability_id: "srd/action/attack" },
		},
		{
			ref: "srd/class-feature/fighter/champion/improved-critical",
			kind: "entity_definition",
			href: "/docs/a/champion",
			display_name: "Improved Critical",
			record: { entity_def_id: "srd/class-feature/fighter/champion/improved-critical" },
		},
	];
}

describe("buildReferenceGraph", () => {
	it("finds references in ordinary columns and labels them by the column", () => {
		const graph = buildReferenceGraph(targets());
		const groups =
			graph.references.get(
				referenceGraphKey("action_definition", "srd/attack/opportunity-attack"),
			) ?? [];
		const labels = Object.fromEntries(
			groups.map((group) => [group.label, group.entries.map((entry) => entry.ref)]),
		);
		expect(labels["On success"]).toEqual(["srd/attack/opportunity-attack/success"]);
		expect(labels["On failure"]).toEqual(["srd/attack/opportunity-attack/miss"]);
		expect(labels["Required capability"]).toEqual(["srd/action/attack"]);
	});

	it("finds a reference buried inside DSL source text, with no parser", () => {
		const graph = buildReferenceGraph(targets());
		const groups =
			graph.references.get(
				referenceGraphKey("action_definition", "srd/attack/opportunity-attack"),
			) ?? [];
		const fromPredicate = groups.find((group) => group.label === "Read by resolution predicate");
		expect(fromPredicate?.entries.map((entry) => entry.ref)).toEqual([
			"srd/class-feature/fighter/champion/improved-critical",
		]);
	});

	it("points back from the target, grouped by the kind that points", () => {
		const graph = buildReferenceGraph(targets());
		// This is the whole point of the second direction: the champion feature
		// never mentions the attack, but the attack reads it.
		const back =
			graph.referencedBy.get(
				referenceGraphKey(
					"entity_definition",
					"srd/class-feature/fighter/champion/improved-critical",
				),
			) ?? [];
		expect(back.map((group) => group.label)).toEqual(["Actions"]);
		expect(back[0]?.entries.map((entry) => entry.ref)).toEqual(["srd/attack/opportunity-attack"]);
	});

	it("carries a first-sentence summary on a reference row that has one", () => {
		const graph = buildReferenceGraph(targets());
		const groups =
			graph.references.get(
				referenceGraphKey("action_definition", "srd/attack/opportunity-attack"),
			) ?? [];
		const success = groups
			.flatMap((group) => group.entries)
			.find((entry) => entry.ref === "srd/attack/opportunity-attack/success");
		expect(success?.summary).toBe("Subtract damage.");
	});

	it("never lets a row reference itself through its own identity column", () => {
		const graph = buildReferenceGraph(targets());
		for (const [key, groups] of graph.references) {
			const ref = key.slice(key.indexOf(":") + 1);
			for (const group of groups)
				expect(group.entries.map((entry) => entry.ref)).not.toContain(ref);
		}
	});

	it("resolves an id shared by two kinds to BOTH subjects, not to whichever came last", () => {
		// Measured over the SRD manifest: 76 ids name a subject in two kinds at
		// once — 34 class features are also capabilities, 25 actions share a name
		// with the capability that permits them. A reference carries no kind, so
		// showing both is the only truthful answer.
		const shared = targets().concat({
			ref: "srd/action/attack",
			kind: "action_definition",
			href: "/docs/a/attack-action",
			display_name: "Attack (action)",
			record: { action_id: "srd/action/attack" },
		});
		const graph = buildReferenceGraph(shared);
		const groups =
			graph.references.get(
				referenceGraphKey("action_definition", "srd/attack/opportunity-attack"),
			) ?? [];
		const capability = groups.find((group) => group.label === "Required capability");
		// Sorted by title, as every reference group is.
		expect(capability?.entries.map((entry) => entry.href)).toEqual([
			"/docs/a/capability",
			"/docs/a/attack-action",
		]);
	});

	it("ignores an identifier that names no authored row, and reports it", () => {
		const graph = buildReferenceGraph(targets());
		// `srd/attack_roll_hits` is a real macro but is not a catalogue target in
		// this fixture, so it must not become a dangling link — and must not be
		// swallowed silently either.
		const all = [...graph.references.values()].flatMap((groups) =>
			groups.flatMap((group) => group.entries.map((entry) => entry.ref)),
		);
		expect(all).not.toContain("srd/attack_roll_hits");
		expect([...graph.unresolved]).toContain("srd/attack_roll_hits");
	});

	it("treats a core/* identifier as a kernel fact rather than a missing row", () => {
		const [action, ...rest] = targets();
		if (!action) throw new Error("fixture requires the action row");
		const graph = buildReferenceGraph([
			{
				...action,
				record: {
					...action.record,
					predicate_source: "actor.stat('core/distance_to_actor_mm') <= 5",
				},
			},
			...rest,
		]);
		expect([...graph.unresolved]).not.toContain("core/distance_to_actor_mm");
	});
});

describe("readableKind", () => {
	it("drops the manifest's own bookkeeping suffix", () => {
		expect(readableKind("action_definition")).toBe("Actions");
		expect(readableKind("consequence_template")).toBe("Consequences");
		expect(readableKind("entity")).toBe("Entitys");
	});
});
