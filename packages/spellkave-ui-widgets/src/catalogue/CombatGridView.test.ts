import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import CombatGridView, { combatGridRowView } from "./CombatGridView.svelte";

/**
 * The "Climb" arena grid, copied field-for-field from
 * `packages/spellkave-srd-cc/fixtures/proofs/playing-the-game-identity/combat-arena/grid.toml`.
 * It authors real `edge_overrides_json` (a difficult-terrain edge pair) and
 * a `display_name` — the interesting case for both.
 */
const ARENA_GRID: Record<string, unknown> = {
	blueprint_id: "srd_proof/combat-grid/arena",
	bundle_id: "srd_proof",
	cell_size_m: 1.52400004863739,
	display_name: "Climb",
	edge_affordance_bindings_json:
		'{"movement_reach_resource":"srd/speed-walk","long_running_move_session":"srd/long_running_move"}',
	edge_affordance_template_id: "srd/affordance/step",
	edge_overrides_json:
		'[{"from":"c_4_4","to":"c_5_4","movement_cost_cells":2,"label":"Difficult Terrain"},{"from":"c_5_4","to":"c_4_4","movement_cost_cells":2,"label":"Difficult Terrain"}]',
	height: 10,
	topology: "8",
	width: 10,
};

/**
 * The standard 10x10 grid, copied from
 * `packages/spellkave-srd-cc/fixtures/base/playing-the-game/grid.toml`. It
 * authors NO `display_name` and an EMPTY `edge_overrides_json` — the two
 * omit/fallback cases the arena row above does not exercise.
 */
const STANDARD_GRID: Record<string, unknown> = {
	blueprint_id: "srd/combat-grid/standard-10x10",
	bundle_id: "srd",
	cell_size_m: 1.52400004863739,
	edge_affordance_bindings_json:
		'{"movement_reach_resource":"srd/speed-walk","long_running_move_session":"srd/long_running_move"}',
	edge_affordance_template_id: "srd/affordance/step",
	edge_overrides_json: "[]",
	height: 10,
	topology: "8",
	width: 10,
};

const link = (ref: string): string | undefined =>
	ref === "srd/affordance/step" ? "/docs/srd/mechanics/affordances/x" : undefined;

describe("combatGridRowView", () => {
	it("titles the page from display_name and keeps the blueprint id as its ref", () => {
		const row = combatGridRowView(ARENA_GRID, "/docs/srd/mechanics/combat-grids/x", link);
		expect(row.title).toBe("Climb");
		expect(row.ref).toBe("srd_proof/combat-grid/arena");
		expect(row.kind_label).toBe("Combat grid");
	});

	it("falls back to the raw ref when a row authors no display_name", () => {
		const row = combatGridRowView(STANDARD_GRID, undefined, link);
		expect(row.title).toBe("srd/combat-grid/standard-10x10");
	});

	it("spells out size, cell scale and adjacency in player-readable terms", () => {
		const row = combatGridRowView(ARENA_GRID, undefined, link);
		expect(row.fields.find((f) => f.label === "Grid size")?.value).toBe("10 × 10 cells");
		expect(row.fields.find((f) => f.label === "Cell size")?.value).toBe("1.52 m");
		expect(row.fields.find((f) => f.label === "Adjacency")?.value).toBe(
			"8-directional (diagonal steps allowed)",
		);
	});

	it("links the movement affordance when it has a page", () => {
		const row = combatGridRowView(ARENA_GRID, undefined, link);
		const affordance = row.fields.find((f) => f.label === "Movement affordance");
		expect(affordance?.href).toBe("/docs/srd/mechanics/affordances/x");
		expect(affordance?.code).toBe(true);
	});

	it("shows edge overrides when the row authors real ones", () => {
		const row = combatGridRowView(ARENA_GRID, undefined, link);
		const overrides = row.fields.find((f) => f.label === "Edge overrides");
		expect(overrides?.value).toContain("Difficult Terrain");
	});

	it("omits the edge overrides field when the row leaves it an empty array", () => {
		const row = combatGridRowView(STANDARD_GRID, undefined, link);
		expect(row.fields.some((field) => field.label === "Edge overrides")).toBe(false);
	});
});

describe("CombatGridView", () => {
	const row = combatGridRowView(ARENA_GRID, "/docs/srd/mechanics/combat-grids/x", link);

	it("renders inline as a linked one-liner carrying the raw ref", () => {
		const { unmount } = render(CombatGridView, { row, view: "inline" });
		expect(screen.getByRole("link", { name: "Climb" })).toBeTruthy();
		expect(screen.getByText("srd_proof/combat-grid/arena")).toBeTruthy();
		unmount();
	});

	it("renders compact as a card naming its kind", () => {
		const { unmount } = render(CombatGridView, { row, view: "compact" });
		expect(screen.getAllByText(/Climb/).length).toBeGreaterThan(0);
		expect(screen.getAllByText("Combat grid").length).toBeGreaterThan(0);
		unmount();
	});

	it("renders full with its title and its fields", () => {
		const { unmount } = render(CombatGridView, { row, view: "full", chrome: true });
		expect(screen.getAllByText(/Climb/).length).toBeGreaterThan(0);
		expect(screen.getByText("Adjacency")).toBeTruthy();
		unmount();
	});

	it("keeps the ref visible at full view even with chrome off, where the title is deliberately omitted", () => {
		const { unmount } = render(CombatGridView, {
			row,
			view: "full",
			chrome: false,
			sections: { details: false },
		});
		expect(screen.getByText("srd_proof/combat-grid/arena")).toBeTruthy();
		expect(screen.queryByText("Adjacency")).toBeNull();
		unmount();

		render(CombatGridView, { row, view: "full", chrome: false, sections: { header: false } });
		expect(screen.getByText("Adjacency")).toBeTruthy();
	});
});
