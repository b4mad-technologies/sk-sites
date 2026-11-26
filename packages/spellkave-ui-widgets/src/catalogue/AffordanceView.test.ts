import { render, screen, within } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import AffordanceView, { affordanceRowView } from "./AffordanceView.svelte";

// Copied from packages/spellkave-srd-cc/fixtures/base/playing-the-game/attacks.toml
// (the Opportunity Attack affordance) — a REAL row, including the
// validator-computed columns (accepts_global_storm, locality_class,
// reads_occupancy, stratification_ok, predicate_bool) this view must NOT
// surface.
const record: Record<string, unknown> = {
	accepts_global_storm: true,
	bundle_id: "srd",
	capability_id: "srd/action/attack",
	display_name: "Opportunity Attack",
	locality_class: "",
	movement_cost_expression_source: "",
	niche_id: "srd/niche/attack-verb",
	outcome_template_id: "srd/attack/opportunity-attack/outcome",
	predicate_bool: false,
	predicate_source:
		"target.stat('core/distance_to_actor_mm') <= actor.effective('srd/reach_mm') + cond(actor.equipped_item('srd/slot/main-hand').has_tag('srd.weapon.property.reach'), 1524, 0)",
	range_m: 10.668000221252441,
	reads_occupancy: false,
	spends_channel: "srd/economy_channel/reaction",
	stratification_ok: true,
	template_id: "srd/attack/opportunity-attack/affordance",
};

const link = (ref: string): string | undefined =>
	ref === "srd/niche/attack-verb" ? "/docs/srd/niches/attack-verb" : undefined;

describe("affordanceRowView", () => {
	it("projects the offer's own columns, in reader order, linking only what the link resolver knows", () => {
		const row = affordanceRowView(record, "/docs/srd/affordances/opportunity-attack", link);
		expect(row.ref).toBe("srd/attack/opportunity-attack/affordance");
		expect(row.title).toBe("Opportunity Attack");
		expect(row.kind_label).toBe("Affordance");
		expect(row.href).toBe("/docs/srd/affordances/opportunity-attack");
		expect(row.description).toBeUndefined();
		expect(row.fields).toEqual([
			{
				label: "Niche",
				value: "srd/niche/attack-verb",
				code: true,
				href: "/docs/srd/niches/attack-verb",
			},
			{ label: "Requires capability", value: "srd/action/attack", code: true },
			{ label: "Outcome", value: "srd/attack/opportunity-attack/outcome", code: true },
			{ label: "Spends", value: "srd/economy_channel/reaction", code: true },
			{ label: "Offer condition", value: record.predicate_source },
			{ label: "Range", value: "10.67 m" },
			{ label: "Affordance ID", value: "srd/attack/opportunity-attack/affordance", code: true },
			{ label: "Owning bundle", value: "srd" },
		]);
	});

	it("omits Range for a deliberately untargeted offer instead of printing a false 0 m", () => {
		// Swing (no target) — same fixture file, range_m = 0.0.
		const row = affordanceRowView(
			{ ...record, template_id: "srd/attack/melee/swing/affordance", range_m: 0.0 },
			undefined,
			link,
		);
		expect(row.fields.some((field) => field.label === "Range")).toBe(false);
	});

	it("falls back to the raw ref for the title when display_name is absent", () => {
		const row = affordanceRowView({ ...record, display_name: undefined }, undefined, link);
		expect(row.title).toBe("srd/attack/opportunity-attack/affordance");
	});
});

describe("AffordanceView", () => {
	const row = affordanceRowView(record, "/docs/srd/affordances/opportunity-attack", link);

	it("renders the full view's identity fields and never a description block", () => {
		render(AffordanceView, { row, view: "full" });
		expect(screen.getByRole("heading", { level: 1, name: "Opportunity Attack" })).toBeTruthy();
		expect(screen.getByText("Requires capability")).toBeTruthy();
		expect(screen.getByText("srd/action/attack")).toBeTruthy();
		expect(screen.queryByTestId("description-rendered")).toBeNull();
		expect(screen.queryByText(/No description is authored/)).toBeNull();
	});

	it("renders a compact card with the offer's fields as facts", () => {
		render(AffordanceView, { row, view: "compact" });
		const card = screen.getByTestId("entry-compact");
		expect(within(card).getByText("Opportunity Attack")).toBeTruthy();
		expect(within(card).getByText("Affordance")).toBeTruthy();
		expect(within(card).getByText(/Offer condition:/)).toBeTruthy();
	});

	it("renders an inline linked title with the raw ref", () => {
		render(AffordanceView, { row, view: "inline" });
		const link = screen.getByRole("link", { name: "Opportunity Attack" });
		expect(link.getAttribute("href")).toBe("/docs/srd/affordances/opportunity-attack");
		expect(screen.getByText("srd/attack/opportunity-attack/affordance")).toBeTruthy();
	});
});
