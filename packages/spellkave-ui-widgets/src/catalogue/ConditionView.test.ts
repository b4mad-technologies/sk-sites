import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import ConditionView, { conditionRowView } from "./ConditionView.svelte";

/**
 * Unconscious, copied field-for-field from
 * `packages/spellkave-srd-cc/fixtures/base/playing-the-game/conditions.toml`.
 * Carries a single-element `grants_capability_while_active` and a
 * single-element `implies` — the common case, one linked entry per list.
 */
const UNCONSCIOUS: Record<string, unknown> = {
	bundle_id: "srd",
	condition_definition_id: "srd/condition/unconscious",
	description:
		"Unconscious (cache/markdown/playing-the-game.md:1229 Falling Unconscious; rules-glossary Unconscious): a character that reaches 0 Hit Points and does not die instantly has the Unconscious condition until it regains any Hit Points, and now faces Death Saving Throws (sk-609b.18). Cascades to Incapacitated via `implies` so action/bonus/reaction channels zero. Grants `srd/capability/death_save` while active (condition capability grant bridge). A K-B ResourceDelta hook clears Unconscious + Stable and resets the death-save clock when HP rises above 0 (pattern: condition-hook-on-event). Other Unconscious axes (drop held items, auto-fail STR/DEX saves, attacks against have Advantage, melee auto-crit) remain unmechanized, honestly.",
	display_name: "Unconscious",
	gate_predicate_source: "",
	grants_capability_while_active: ["srd/capability/death_save"],
	hooks: [],
	implies: ["srd/condition/incapacitated"],
	modifier_template_id: "",
	observable: true,
	remove_time_policy: "srd/remove_policy/independent_lifetime",
	stacking_rule: "srd/stacking/single",
	suppresses_capability_while_active: [],
};

/**
 * Incapacitated, same fixture file. Its own `implies` carries THREE
 * sibling ids — the condition that exercises the "more than one element"
 * numbering, since `grants`/`suppresses`/`modifier_template_id` are all
 * empty on this row.
 */
const INCAPACITATED: Record<string, unknown> = {
	bundle_id: "srd",
	condition_definition_id: "srd/condition/incapacitated",
	description:
		"Incapacitated (cache/markdown/rules-glossary.md:923-933): can't take any action, Bonus Action, or Reaction.",
	display_name: "Incapacitated",
	gate_predicate_source: "",
	grants_capability_while_active: [],
	hooks: [],
	implies: [
		"srd/condition/incapacitated/no-action",
		"srd/condition/incapacitated/no-bonus-action",
		"srd/condition/incapacitated/no-reaction",
	],
	modifier_template_id: "",
	observable: true,
	remove_time_policy: "srd/remove_policy/independent_lifetime",
	stacking_rule: "srd/stacking/single",
	suppresses_capability_while_active: [],
};

/**
 * Incapacitated: No Reaction, the sibling row that actually carries a
 * `modifier_template_id` and sets `observable = false` — the corpus's own
 * non-default-observable row.
 */
const NO_REACTION: Record<string, unknown> = {
	bundle_id: "srd",
	condition_definition_id: "srd/condition/incapacitated/no-reaction",
	description:
		"Sibling channel-zeroing half of Incapacitated: zeroes the bearer's reaction economy channel.",
	display_name: "Incapacitated: No Reaction",
	gate_predicate_source: "",
	grants_capability_while_active: [],
	hooks: [],
	implies: [],
	modifier_template_id: "srd/condition/incapacitated/no-reaction",
	observable: false,
	remove_time_policy: "srd/remove_policy/independent_lifetime",
	stacking_rule: "srd/stacking/single",
	suppresses_capability_while_active: [],
};

const link = (ref: string): string | undefined =>
	ref === "srd/condition/incapacitated"
		? "/docs/srd/mechanics/conditions/incapacitated"
		: undefined;

describe("conditionRowView", () => {
	it("titles the page from display_name and keeps the condition id as its ref", () => {
		const row = conditionRowView(UNCONSCIOUS, "/docs/srd/mechanics/conditions/x", link);
		expect(row.title).toBe("Unconscious");
		expect(row.ref).toBe("srd/condition/unconscious");
		expect(row.kind_label).toBe("Condition");
	});

	it("leads with the capability grant, then implies, before the identity rows", () => {
		const row = conditionRowView(UNCONSCIOUS, undefined, link);
		expect(row.fields.map((field) => field.label).slice(0, 2)).toEqual([
			"Grants capability while active",
			"Implies",
		]);
	});

	it("renders a single-element list under its plain label, linked when the target has a page", () => {
		const row = conditionRowView(UNCONSCIOUS, undefined, link);
		const implies = row.fields.find((field) => field.label === "Implies");
		expect(implies).toMatchObject({ value: "srd/condition/incapacitated", code: true });
		expect(implies?.href).toBe("/docs/srd/mechanics/conditions/incapacitated");
		const grants = row.fields.find((field) => field.label === "Grants capability while active");
		expect(grants).toMatchObject({ value: "srd/capability/death_save", code: true });
		// This target has no page in the link resolver — stays unlinked.
		expect(grants?.href).toBeUndefined();
	});

	it("renders every element of a multi-item list, each with a distinct numbered label", () => {
		const row = conditionRowView(INCAPACITATED, undefined, link);
		const impliesFields = row.fields.filter((field) => field.label.startsWith("Implies"));
		expect(impliesFields.map((field) => field.label)).toEqual([
			"Implies (1 of 3)",
			"Implies (2 of 3)",
			"Implies (3 of 3)",
		]);
		expect(impliesFields.map((field) => field.value)).toEqual([
			"srd/condition/incapacitated/no-action",
			"srd/condition/incapacitated/no-bonus-action",
			"srd/condition/incapacitated/no-reaction",
		]);
	});

	it("omits an empty list and an empty modifier_template_id rather than printing a blank row", () => {
		const row = conditionRowView(INCAPACITATED, undefined, link);
		expect(row.fields.some((field) => field.label === "Grants capability while active")).toBe(
			false,
		);
		expect(row.fields.some((field) => field.label === "Suppresses capability while active")).toBe(
			false,
		);
		expect(row.fields.some((field) => field.label === "Modifier while active")).toBe(false);
	});

	it("shows the modifier and marks a non-observable condition, but stays silent when observable is the true default", () => {
		const row = conditionRowView(NO_REACTION, undefined, link);
		expect(row.fields.find((field) => field.label === "Modifier while active")?.value).toBe(
			"srd/condition/incapacitated/no-reaction",
		);
		expect(row.fields.find((field) => field.label === "Observable")?.value).toBe("No");

		const observableRow = conditionRowView(UNCONSCIOUS, undefined, link);
		expect(observableRow.fields.some((field) => field.label === "Observable")).toBe(false);
	});

	it("carries no description when the row leaves it empty", () => {
		const { description: _dropped, ...withoutDescription } = UNCONSCIOUS;
		expect(conditionRowView(withoutDescription, undefined, link).description).toBeUndefined();
	});
});

describe("ConditionView", () => {
	const row = conditionRowView(UNCONSCIOUS, "/docs/srd/mechanics/conditions/x", link);

	it("renders inline as a linked one-liner carrying the raw ref", () => {
		const { unmount } = render(ConditionView, { row, view: "inline" });
		expect(screen.getByRole("link", { name: "Unconscious" })).toBeTruthy();
		expect(screen.getByText("srd/condition/unconscious")).toBeTruthy();
		unmount();
	});

	it("renders compact as a card naming its kind", () => {
		const { unmount } = render(ConditionView, { row, view: "compact" });
		expect(screen.getAllByText(/Unconscious/).length).toBeGreaterThan(0);
		expect(screen.getAllByText("Condition").length).toBeGreaterThan(0);
		unmount();
	});

	it("renders full with its title and its fields", () => {
		const { unmount } = render(ConditionView, { row, view: "full", chrome: true });
		expect(screen.getAllByText(/Unconscious/).length).toBeGreaterThan(0);
		expect(screen.getByText("Grants capability while active")).toBeTruthy();
		unmount();
	});

	it("shows the description in the header half and the fields in the details half", () => {
		const { unmount } = render(ConditionView, {
			row,
			view: "full",
			chrome: false,
			sections: { details: false },
		});
		expect(screen.getByText(/Death Saving Throws/)).toBeTruthy();
		expect(screen.queryByText("Grants capability while active")).toBeNull();
		unmount();

		render(ConditionView, { row, view: "full", chrome: false, sections: { header: false } });
		expect(screen.getByText("Grants capability while active")).toBeTruthy();
		expect(screen.queryByText(/Death Saving Throws/)).toBeNull();
	});
});
