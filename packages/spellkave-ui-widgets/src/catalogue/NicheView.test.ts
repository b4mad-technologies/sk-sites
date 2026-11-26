import { render, screen, within } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import NicheView, { nicheRowView } from "./NicheView.svelte";

// Copied from packages/spellkave-srd-cc/fixtures/base/playing-the-game/attacks.toml
// (the actor-carried attack-verb niche every affordance in this fixture
// points at via niche_id). niche_definitions rows all carry both
// display_name and description.
const record: Record<string, unknown> = {
	bundle_id: "srd",
	description:
		"An attack is a capability of the ACTOR, not a property of the target (operator ruling 2026-08-12, bead sk-rd0): the acting entity's own srd/action/attack capability carries this niche everywhere, gated on nothing target-side — AC remains a resolution input only (target.effective('srd/ac')), never an offer doorman.",
	display_name: "Attack (actor-carried)",
	niche_id: "srd/niche/attack-verb",
	predicate_source: "",
	provider: "actor",
};

const link = (): string | undefined => undefined;

describe("nicheRowView", () => {
	it("projects the niche's own columns, in reader order", () => {
		const row = nicheRowView(record, "/docs/srd/niches/attack-verb", link);
		expect(row.ref).toBe("srd/niche/attack-verb");
		expect(row.title).toBe("Attack (actor-carried)");
		expect(row.kind_label).toBe("Niche");
		expect(row.description).toBe(record.description);
		expect(row.fields).toEqual([
			{ label: "Offered by", value: "actor" },
			{ label: "Niche ID", value: "srd/niche/attack-verb", code: true },
			{ label: "Owning bundle", value: "srd" },
		]);
	});

	it("omits Target eligibility when the predicate is empty (trivially true), not a fabricated 'always' row", () => {
		const row = nicheRowView(record, undefined, link);
		expect(row.fields.some((field) => field.label === "Target eligibility")).toBe(false);
	});

	it("shows Target eligibility when a niche actually gates candidates", () => {
		const row = nicheRowView(
			{ ...record, provider: "place", predicate_source: "target.has_tag('srd.door')" },
			undefined,
			link,
		);
		expect(row.fields).toContainEqual({
			label: "Target eligibility",
			value: "target.has_tag('srd.door')",
		});
	});
});

describe("NicheView", () => {
	const row = nicheRowView(record, "/docs/srd/niches/attack-verb", link);

	it("renders the full view's heading and description", () => {
		render(NicheView, { row, view: "full" });
		expect(screen.getByRole("heading", { level: 1, name: "Attack (actor-carried)" })).toBeTruthy();
		expect(screen.getByText(/An attack is a capability of the ACTOR/)).toBeTruthy();
	});

	it("renders a compact card with the provider fact", () => {
		render(NicheView, { row, view: "compact" });
		const card = screen.getByTestId("entry-compact");
		expect(within(card).getByText(/Offered by:/)).toBeTruthy();
		expect(within(card).getByText("actor")).toBeTruthy();
	});
});
