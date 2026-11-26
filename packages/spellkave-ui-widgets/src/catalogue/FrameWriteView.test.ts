import { render, screen, within } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import FrameWriteView, { frameWriteRowView, projectFrameWriteOp } from "./FrameWriteView.svelte";

// Both records below are copied from
// packages/spellkave-srd-cc/fixtures/base/playing-the-game/attacks.toml.

// Unarmed Strike Damage's ordinal-0 write: a plain ModifyResource, no nesting.
const modifyResourceRecord: Record<string, unknown> = {
	ordinal: 0,
	template_id: "srd/attack/unarmed-strike/damage/success",
	frame_write: {
		ModifyResource: {
			actor: "TargetActor",
			delta_source:
				"0 - (let dmg = max(0, (cond(actor.has_capability('srd/class-feature/monk/martial-arts'), 1d6, 1)) + (cond(actor.has_capability('srd/class-feature/monk/martial-arts'), max((macro('srd/strength_modifier')), (macro('srd/dexterity_modifier'))), (macro('srd/strength_modifier')))) + (cond(actor.status('srd/condition/raging') == true, 2, 0))); cond(target.has_tag('damage_immune:bludgeoning'), 0, cond(target.has_tag('damage_resist:bludgeoning') || target.status('srd/condition/raging') == true, dmg / 2, cond(target.has_tag('damage_vulnerable:bludgeoning'), dmg * 2, dmg))))",
			resource: "srd/hp",
		},
	},
};

// Melee Attack success's ordinal-2 write: a ForEachActorInRadius whose body
// nests four further ops (the unconscious/death-save-reset branch). This is
// the row FrameWriteView's "render the nesting, do not flatten it" note is about.
const forEachRecord: Record<string, unknown> = {
	ordinal: 2,
	template_id: "srd/attack/melee/success",
	frame_write: {
		ForEachActorInRadius: {
			center_ref: "TargetSpatialRef",
			predicate_source: "actor.has_tag('srd.player_character') && actor.stat('srd/hp') <= 0",
			shape_id: "core/area/node_ball",
			shape_params_json: '{"ball_radius": 0}',
			body: [
				{
					ApplyStatus: {
						condition_definition_id: "srd/condition/unconscious",
						target_kind: "entity",
						target_ref: "Actor",
					},
				},
				{
					ModifyResource: {
						actor: "Actor",
						resource: "srd/death_save_successes",
						delta_source: "0",
					},
				},
				{
					ModifyResource: {
						actor: "Actor",
						resource: "srd/death_save_failures",
						delta_source: "0",
					},
				},
				{
					ModifyResource: {
						actor: "Actor",
						resource: "srd/death_save_last_roll",
						delta_source: "0",
					},
				},
			],
		},
	},
};

const LINKS: Record<string, string> = {
	"srd/hp": "/docs/srd/resources/hp",
	"srd/attack/unarmed-strike/damage/success":
		"/docs/srd/consequences/unarmed-strike-damage-success",
	"srd/attack/melee/success": "/docs/srd/consequences/melee-success",
	"srd/condition/unconscious": "/docs/srd/conditions/unconscious",
};
const link = (ref: string): string | undefined => LINKS[ref];

describe("projectFrameWriteOp", () => {
	it("projects a ModifyResource op's own fields, in reader order, with no body", () => {
		const op = projectFrameWriteOp(
			modifyResourceRecord.frame_write as Record<string, unknown>,
			link,
		);
		expect(op.variant).toBe("ModifyResource");
		expect(op.title).toBe("Modify resource");
		expect(op.fields).toEqual([
			{ label: "Target", value: "TargetActor" },
			{ label: "Resource", value: "srd/hp", code: true, href: "/docs/srd/resources/hp" },
			{
				label: "Amount",
				value: (modifyResourceRecord.frame_write as { ModifyResource: { delta_source: string } })
					.ModifyResource.delta_source,
			},
		]);
		expect(op.body).toEqual([]);
	});

	it("projects a ForEachActorInRadius op's own fields and extracts its body without flattening it", () => {
		const op = projectFrameWriteOp(forEachRecord.frame_write as Record<string, unknown>, link);
		expect(op.variant).toBe("ForEachActorInRadius");
		expect(op.title).toBe("For each actor in radius");
		expect(op.fields).toEqual([
			{ label: "Centered on", value: "TargetSpatialRef" },
			{ label: "Area shape", value: "core/area/node_ball", code: true },
			{ label: "Area parameters", value: "ball_radius: 0" },
			{
				label: "Filter",
				value: "actor.has_tag('srd.player_character') && actor.stat('srd/hp') <= 0",
			},
		]);
		expect(op.body).toHaveLength(4);
		expect(op.body[0]).toEqual({
			ApplyStatus: {
				condition_definition_id: "srd/condition/unconscious",
				target_kind: "entity",
				target_ref: "Actor",
			},
		});
	});

	it("falls back to a generic per-key rendering for a variant it has no dedicated mapping for", () => {
		const op = projectFrameWriteOp(
			{ FireBoundary: { boundary_id: "srd/boundary/short-rest", scope: "Actor" } },
			link,
		);
		expect(op.title).toBe("Fire boundary");
		expect(op.fields).toEqual([
			{ label: "Boundary id", value: "srd/boundary/short-rest" },
			{ label: "Scope", value: "Actor" },
		]);
	});
});

describe("frameWriteRowView", () => {
	it("keys the row on template_id + ordinal and links the owning consequence", () => {
		const row = frameWriteRowView(modifyResourceRecord, undefined, link);
		expect(row.ref).toBe("srd/attack/unarmed-strike/damage/success#0");
		expect(row.title).toBe("Modify resource");
		expect(row.kind_label).toBe("Frame write");
		expect(row.fields.at(-2)).toEqual({ label: "Order", value: "0" });
		expect(row.fields.at(-1)).toEqual({
			label: "Consequence",
			value: "srd/attack/unarmed-strike/damage/success",
			code: true,
			href: "/docs/srd/consequences/unarmed-strike-damage-success",
		});
	});
});

describe("FrameWriteView", () => {
	it("renders inline and compact from row alone, with no record/link needed", () => {
		const row = frameWriteRowView(modifyResourceRecord, undefined, link);
		render(FrameWriteView, { row, view: "inline" });
		expect(screen.getByText("Modify resource")).toBeTruthy();
		expect(screen.getByText("srd/attack/unarmed-strike/damage/success#0")).toBeTruthy();

		const compact = render(FrameWriteView, { row, view: "compact" });
		expect(within(compact.getByTestId("entry-compact")).getByText(/Order:/)).toBeTruthy();
	});

	it("renders the nested body recursively when record and link are given", () => {
		const row = frameWriteRowView(forEachRecord, undefined, link);
		render(FrameWriteView, { row, view: "full", record: forEachRecord, link });
		expect(screen.getByText("For each actor in radius")).toBeTruthy();
		const body = screen.getByTestId("frame-write-body");
		expect(within(body).getByText("Apply status")).toBeTruthy();
		expect(within(body).getAllByText("Modify resource")).toHaveLength(3);
		expect(
			within(body).getByRole("link", { name: "srd/condition/unconscious" }).getAttribute("href"),
		).toBe("/docs/srd/conditions/unconscious");
	});

	it("degrades to no nested block at all when record/link are not given, rather than crashing", () => {
		const row = frameWriteRowView(forEachRecord, undefined, link);
		render(FrameWriteView, { row, view: "full" });
		expect(screen.queryByTestId("frame-write-body")).toBeNull();
	});
});
