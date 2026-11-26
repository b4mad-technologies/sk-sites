import { render, screen, within } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import OutcomeView, { outcomeRowView } from "./OutcomeView.svelte";

// Copied from packages/spellkave-srd-cc/fixtures/base/playing-the-game/attacks.toml
// (the Unarmed Strike: Damage outcome) — one of only 7 of 415 outcome_templates
// rows in the corpus that carries a description, and it holds a
// `{target_name}`-style placeholder.
const record: Record<string, unknown> = {
	bundle_id: "srd",
	consequence_template_id: "",
	description: "You strike {target_name}.",
	display_name: "Unarmed Strike: Damage",
	manipulation_action_id: "srd/attack/unarmed-strike/damage",
	outcome_bool: true,
	outcome_template_id: "srd/attack/unarmed-strike/damage/outcome",
	sense_visibility: "local",
};

const link = (ref: string): string | undefined =>
	ref === "srd/attack/unarmed-strike/damage"
		? "/docs/srd/actions/unarmed-strike-damage"
		: undefined;

describe("outcomeRowView", () => {
	it("projects the outcome's own columns, in reader order, carrying the description through as-authored", () => {
		const row = outcomeRowView(record, "/docs/srd/outcomes/unarmed-strike-damage", link);
		expect(row.ref).toBe("srd/attack/unarmed-strike/damage/outcome");
		expect(row.title).toBe("Unarmed Strike: Damage");
		expect(row.kind_label).toBe("Outcome");
		// Placeholder rendered verbatim — no interpolation attempted.
		expect(row.description).toBe("You strike {target_name}.");
		expect(row.fields).toEqual([
			{
				label: "Action",
				value: "srd/attack/unarmed-strike/damage",
				code: true,
				href: "/docs/srd/actions/unarmed-strike-damage",
			},
			{ label: "Visibility", value: "local" },
			{ label: "Outcome ID", value: "srd/attack/unarmed-strike/damage/outcome", code: true },
			{ label: "Owning bundle", value: "srd" },
		]);
	});

	it("omits Consequence and Discovery for the ordinary, non-graph-driven case", () => {
		const row = outcomeRowView(record, undefined, link);
		expect(row.fields.some((field) => field.label === "Consequence")).toBe(false);
		expect(row.fields.some((field) => field.label === "Discovery")).toBe(false);
	});

	it("shows Discovery only when discovery_validated is true", () => {
		const row = outcomeRowView({ ...record, discovery_validated: true }, undefined, link);
		expect(row.fields.find((field) => field.label === "Discovery")).toEqual({
			label: "Discovery",
			value: "Marked validated",
		});
	});
});

describe("OutcomeView", () => {
	const row = outcomeRowView(record, "/docs/srd/outcomes/unarmed-strike-damage", link);

	it("renders the placeholder description as authored text, not interpolated", () => {
		render(OutcomeView, { row, view: "full" });
		expect(screen.getByRole("heading", { level: 1, name: "Unarmed Strike: Damage" })).toBeTruthy();
		expect(screen.getByText("You strike {target_name}.")).toBeTruthy();
	});

	it("diagnoses a missing description as a content gap, like ActionView does", () => {
		const withoutDescription = outcomeRowView({ ...record, description: "" }, undefined, link);
		render(OutcomeView, { row: withoutDescription, view: "full" });
		expect(screen.getByText("No description is authored in this manifest field.")).toBeTruthy();
	});

	it("renders a compact card with a linked action fact", () => {
		render(OutcomeView, { row, view: "compact" });
		const card = screen.getByTestId("entry-compact");
		expect(within(card).getByText("Unarmed Strike: Damage")).toBeTruthy();
		expect(within(card).getByText(/Action:/)).toBeTruthy();
	});

	it("renders an inline entry with a trimmed summary", () => {
		render(OutcomeView, { row, view: "inline" });
		expect(screen.getByRole("link", { name: "Unarmed Strike: Damage" })).toBeTruthy();
		// This once asserted `{targetname}`: `first-sentence.ts` stripped every
		// underscore, not just `_emphasis_` markers, and ate the one inside the
		// placeholder. Fixed under sk-jay0.7.96, so the placeholder now survives
		// the trim exactly as authored.
		expect(screen.getByText(/You strike \{target_name\}\./)).toBeTruthy();
	});
});
