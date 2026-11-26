import { render, screen, within } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import ConsequenceView, { consequenceRowView } from "./ConsequenceView.svelte";

// Copied from packages/spellkave-srd-cc/fixtures/base/playing-the-game/attacks.toml
// (the Melee Attack success consequence). `consequence_templates` has NO
// display_name column at all — 478 of 478 rows — so `title` here stands in
// for what project-metadata-docs.ts is expected to derive and attach
// upstream (the same "no display_name" shape tag_value_definitions already
// has, resolved there via a compiler-derived title).
const record: Record<string, unknown> = {
	bundle_id: "srd",
	description:
		"Melee Attack hit: subtract the equipped melee weapon's own srd/damage magnitude from the target's Hit Points; a hit that drops a co-located MONSTER to 0 HP applies srd/condition/dead (playing-the-game.md:1217, Monster Death, monster-scoped — sk-dms.39, weapon-attack-units.ts's monsterDeathFrameWrite, finding #66 addendum).",
	template_id: "srd/attack/melee/success",
	title: "Melee Attack: Hit",
};

const link = (): string | undefined => undefined;

describe("consequenceRowView", () => {
	it("reads the upstream-derived title, never a display_name column that does not exist for this kind", () => {
		const row = consequenceRowView(record, "/docs/srd/consequences/melee-success", link);
		expect(row.title).toBe("Melee Attack: Hit");
		expect(row.kind_label).toBe("Consequence");
		expect(row.description).toBe(record.description);
		expect(row.fields).toEqual([
			{ label: "Consequence ID", value: "srd/attack/melee/success", code: true },
			{ label: "Owning bundle", value: "srd" },
		]);
	});

	it("falls back to the raw ref when no title has been derived upstream", () => {
		const row = consequenceRowView({ ...record, title: undefined }, undefined, link);
		expect(row.title).toBe("srd/attack/melee/success");
	});

	it("renders Effects and Trace emissions only when authored", () => {
		const withEffects = consequenceRowView(
			{ ...record, effect_refs_csv: "srd/effect/damage,srd/effect/death-check" },
			undefined,
			link,
		);
		expect(withEffects.fields).toContainEqual({
			label: "Effects",
			value: "srd/effect/damage,srd/effect/death-check",
			code: true,
		});
		expect(record.effect_refs_csv).toBeUndefined();
		const withoutEffects = consequenceRowView(record, undefined, link);
		expect(withoutEffects.fields.some((field) => field.label === "Effects")).toBe(false);
	});
});

describe("ConsequenceView", () => {
	const row = consequenceRowView(record, "/docs/srd/consequences/melee-success", link);

	it("renders the derived title as the page heading, not the raw ref", () => {
		render(ConsequenceView, { row, view: "full" });
		expect(screen.getByRole("heading", { level: 1, name: "Melee Attack: Hit" })).toBeTruthy();
		// The raw ref appears twice on the full view (the heading caption and
		// the trailing "Consequence ID" field) — the same duplication
		// ActionView's own "Action ID" field already carries.
		expect(screen.getAllByText("srd/attack/melee/success")).toHaveLength(2);
	});

	it("renders a compact card without inventing a description", () => {
		render(ConsequenceView, { row, view: "compact" });
		const card = screen.getByTestId("entry-compact");
		expect(within(card).getByText("Melee Attack: Hit")).toBeTruthy();
		expect(within(card).getByText(/subtract the equipped melee weapon/)).toBeTruthy();
	});
});
