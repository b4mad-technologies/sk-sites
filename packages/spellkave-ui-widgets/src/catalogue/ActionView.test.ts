import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import ActionView, { actionRowView } from "./ActionView.svelte";

/**
 * The Opportunity Attack row, copied field-for-field from
 * `packages/spellkave-srd-cc/fixtures/base/playing-the-game/attacks.toml`.
 * A real row rather than a minimal invention: the empty-column handling below
 * is the whole point, and a hand-made row would not exercise it honestly.
 */
const OPPORTUNITY_ATTACK: Record<string, unknown> = {
	action_id: "srd/attack/opportunity-attack",
	bundle_id: "srd",
	cost_time_ms: 0,
	description:
		"When a creature you can see leaves your reach, take a Reaction to make one melee attack with a weapon or Unarmed Strike against it.",
	display_name: "Opportunity Attack",
	on_failure: "srd/attack/opportunity-attack/miss",
	on_success: "srd/attack/opportunity-attack/success",
	reaction_trigger: "$event.kind == 'r_move' && $event.detail.on_exit == 'true'",
	reaction_window_ms: 30000,
	required_capability: "srd/action/attack",
	resolution_mode: "Stochastic",
	resolution_scope: "srd/attack_roll",
	resumable: false,
	self_eligible: false,
	self_only: false,
	session_def_id: "",
	spends_channel: "srd/economy_channel/reaction",
};

const link = (ref: string): string | undefined =>
	ref === "srd/attack/opportunity-attack/success"
		? "/docs/srd/mechanics/consequences/x"
		: undefined;

describe("actionRowView", () => {
	it("titles the page from display_name and keeps the action id as its ref", () => {
		const row = actionRowView(OPPORTUNITY_ATTACK, "/docs/srd/mechanics/actions/x", link);
		expect(row.title).toBe("Opportunity Attack");
		expect(row.ref).toBe("srd/attack/opportunity-attack");
		expect(row.kind_label).toBe("Action");
	});

	it("leads with the consequences and the capability, not with the identity rows", () => {
		const row = actionRowView(OPPORTUNITY_ATTACK, undefined, link);
		expect(row.fields.slice(0, 4).map((field) => field.label)).toEqual([
			"Consequence on success",
			"Consequence on failure",
			"Requires capability",
			"Spends",
		]);
	});

	it("links a referenced id when it has a page and leaves it plain text when it does not", () => {
		const row = actionRowView(OPPORTUNITY_ATTACK, undefined, link);
		const success = row.fields.find((field) => field.label === "Consequence on success");
		const failure = row.fields.find((field) => field.label === "Consequence on failure");
		expect(success?.href).toBe("/docs/srd/mechanics/consequences/x");
		expect(failure?.href).toBeUndefined();
		// A referenced id stays recognisably an id either way.
		expect(failure?.code).toBe(true);
	});

	it("omits a column the row leaves empty rather than printing a blank row", () => {
		const row = actionRowView(OPPORTUNITY_ATTACK, undefined, link);
		// This row authors no reaction_eligibility and a zero cost_time_ms.
		expect(row.fields.some((field) => field.label === "Reaction eligibility")).toBe(false);
		expect(row.fields.some((field) => field.label === "Time cost")).toBe(false);
		// …but it does author a reaction window, rendered in seconds.
		expect(row.fields.find((field) => field.label === "Reaction window")?.value).toBe("30 s");
	});

	it("carries no description when the row leaves it empty", () => {
		const { description: _dropped, ...withoutDescription } = OPPORTUNITY_ATTACK;
		expect(actionRowView(withoutDescription, undefined, link).description).toBeUndefined();
	});
});

describe("ActionView", () => {
	const row = actionRowView(OPPORTUNITY_ATTACK, "/docs/srd/mechanics/actions/x", link);

	// All three levels are mandatory for every per-kind component, so assert
	// them one by one and say what each is expected to show. `full` is checked
	// with `chrome: true`: with chrome off the heading deliberately omits the
	// title, because the owning page already rendered it.
	it("renders inline as a linked one-liner carrying the raw ref", () => {
		const { unmount } = render(ActionView, { row, view: "inline" });
		expect(screen.getByRole("link", { name: "Opportunity Attack" })).toBeTruthy();
		expect(screen.getByText("srd/attack/opportunity-attack")).toBeTruthy();
		unmount();
	});

	it("renders compact as a card naming its kind", () => {
		const { unmount } = render(ActionView, { row, view: "compact" });
		expect(screen.getAllByText(/Opportunity Attack/).length).toBeGreaterThan(0);
		expect(screen.getAllByText("Action").length).toBeGreaterThan(0);
		unmount();
	});

	it("renders full with its title and its fields", () => {
		const { unmount } = render(ActionView, { row, view: "full", chrome: true });
		expect(screen.getAllByText(/Opportunity Attack/).length).toBeGreaterThan(0);
		expect(screen.getByText("Requires capability")).toBeTruthy();
		unmount();
	});

	it("shows the description in the header half and the fields in the details half", () => {
		const { unmount } = render(ActionView, {
			row,
			view: "full",
			chrome: false,
			sections: { details: false },
		});
		expect(screen.getByText(/take a Reaction to make one melee attack/)).toBeTruthy();
		expect(screen.queryByText("Requires capability")).toBeNull();
		unmount();

		render(ActionView, { row, view: "full", chrome: false, sections: { header: false } });
		expect(screen.getByText("Requires capability")).toBeTruthy();
		expect(screen.queryByText(/take a Reaction to make one melee attack/)).toBeNull();
	});
});
