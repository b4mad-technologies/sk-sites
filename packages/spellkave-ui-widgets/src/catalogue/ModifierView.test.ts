import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import ModifierView, { modifierRowView } from "./ModifierView.svelte";

/**
 * Chain Mail's AC modifier, copied field-for-field from
 * `packages/spellkave-srd-cc/fixtures/base/equipment/armor/chain-mail.toml`.
 */
const CHAIN_MAIL_AC: Record<string, unknown> = {
	applies_to: "srd/ac",
	bundle_id: "srd",
	delta_kind: "FlatSet",
	description:
		"Static AC 16 (Armor.json ac_base, pk 'srd-2024_chain-mail') — FlatSet, not Plus: Chain Mail's AC does not compose with a base value, it REPLACES it outright (ac_add_dexmod: false — no Dexterity term to add on top). Live-wired to the wearer via entity_definition_equip_modifier (BL-19).",
	display_name: "Chain Mail AC 16",
	modifier_expression_source: "let ac = 16; ac",
	modifier_template_id: "srd/armor/chain-mail/ac_bonus",
	predicate_source: "",
	priority: 0,
};

/**
 * Bane's Dexterity-save penalty, from `packages/spellkave-srd-cc/fixtures/base/spells/level-1/bane.toml`.
 * Carries no description and a non-zero `priority` — the corpus's own
 * away-from-default case.
 */
const BANE_DEX_SAVE: Record<string, unknown> = {
	applies_to: "srd/dex_save",
	bundle_id: "srd",
	delta_kind: "Plus",
	display_name: "Bane dex_save 0 - 1d4",
	modifier_expression_source: "let bonus = 0 - 1d4; bonus",
	modifier_template_id: "srd/condition/spell/baned/mod_dex_save",
	predicate_source: "",
	priority: 1,
};

/**
 * The srd_proof gated-off Disadvantage template, from
 * `packages/spellkave-srd-cc/fixtures/proofs/playing-the-game-identity/checks/actions.toml`.
 * Its `predicate_source` is authored non-empty — the eligibility gate,
 * distinct from `modifier_expression_source`.
 */
const GATED_DISADVANTAGE: Record<string, unknown> = {
	applies_to: "srd_proof/false-modifier-scope",
	bundle_id: "srd_proof",
	delta_kind: "Disadvantage",
	display_name: "TEST-ONLY: gated-off Disadvantage",
	modifier_expression_source: "let unused = 0; unused",
	modifier_template_id: "srd_proof/false-modifier-disadvantage",
	predicate_source: "1 == 0",
	priority: 0,
};

const link = (ref: string): string | undefined =>
	ref === "srd/ac" ? "/docs/srd/mechanics/modifier-targets/ac" : undefined;

describe("modifierRowView", () => {
	it("titles the page from display_name and keeps the modifier template id as its ref", () => {
		const row = modifierRowView(CHAIN_MAIL_AC, "/docs/srd/mechanics/modifiers/x", link);
		expect(row.title).toBe("Chain Mail AC 16");
		expect(row.ref).toBe("srd/armor/chain-mail/ac_bonus");
		expect(row.kind_label).toBe("Modifier");
	});

	it("leads with what it applies to and how, before the value expression and the identity rows", () => {
		const row = modifierRowView(CHAIN_MAIL_AC, undefined, link);
		expect(row.fields.map((field) => field.label)).toEqual([
			"Applies to",
			"Modifier type",
			"Value expression",
			"Modifier ID",
			"Owning bundle",
		]);
	});

	it("links applies_to when the target has a page and leaves it plain text otherwise", () => {
		const row = modifierRowView(CHAIN_MAIL_AC, undefined, link);
		const appliesTo = row.fields.find((field) => field.label === "Applies to");
		expect(appliesTo).toMatchObject({
			value: "srd/ac",
			code: true,
			href: "/docs/srd/mechanics/modifier-targets/ac",
		});

		const untargeted = modifierRowView(GATED_DISADVANTAGE, undefined, link);
		const scoped = untargeted.fields.find((field) => field.label === "Applies to");
		expect(scoped?.href).toBeUndefined();
	});

	it("omits an empty predicate_source and a zero priority rather than printing a boring default", () => {
		const row = modifierRowView(CHAIN_MAIL_AC, undefined, link);
		expect(row.fields.some((field) => field.label === "Applies when")).toBe(false);
		expect(row.fields.some((field) => field.label === "Priority")).toBe(false);
	});

	it("shows a non-empty predicate_source as the eligibility gate", () => {
		const row = modifierRowView(GATED_DISADVANTAGE, undefined, link);
		expect(row.fields.find((field) => field.label === "Applies when")?.value).toBe("1 == 0");
	});

	it("shows a non-zero priority", () => {
		const row = modifierRowView(BANE_DEX_SAVE, undefined, link);
		expect(row.fields.find((field) => field.label === "Priority")?.value).toBe("1");
	});

	it("carries no description when the row leaves it empty", () => {
		expect(modifierRowView(BANE_DEX_SAVE, undefined, link).description).toBeUndefined();
	});
});

describe("ModifierView", () => {
	const row = modifierRowView(CHAIN_MAIL_AC, "/docs/srd/mechanics/modifiers/x", link);

	it("renders inline as a linked one-liner carrying the raw ref", () => {
		const { unmount } = render(ModifierView, { row, view: "inline" });
		expect(screen.getByRole("link", { name: "Chain Mail AC 16" })).toBeTruthy();
		expect(screen.getByText("srd/armor/chain-mail/ac_bonus")).toBeTruthy();
		unmount();
	});

	it("renders compact as a card naming its kind", () => {
		const { unmount } = render(ModifierView, { row, view: "compact" });
		expect(screen.getAllByText(/Chain Mail AC 16/).length).toBeGreaterThan(0);
		expect(screen.getAllByText("Modifier").length).toBeGreaterThan(0);
		unmount();
	});

	it("renders full with its title and its fields", () => {
		const { unmount } = render(ModifierView, { row, view: "full", chrome: true });
		expect(screen.getAllByText(/Chain Mail AC 16/).length).toBeGreaterThan(0);
		expect(screen.getByText("Applies to")).toBeTruthy();
		unmount();
	});

	it("shows the description in the header half and the fields in the details half", () => {
		const { unmount } = render(ModifierView, {
			row,
			view: "full",
			chrome: false,
			sections: { details: false },
		});
		expect(screen.getByText(/does not compose with a base value/)).toBeTruthy();
		expect(screen.queryByText("Applies to")).toBeNull();
		unmount();

		render(ModifierView, { row, view: "full", chrome: false, sections: { header: false } });
		expect(screen.getByText("Applies to")).toBeTruthy();
		expect(screen.queryByText(/does not compose with a base value/)).toBeNull();
	});
});
