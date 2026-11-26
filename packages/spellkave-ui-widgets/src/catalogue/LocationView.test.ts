import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import LocationView, { locationRowView } from "./LocationView.svelte";

/**
 * `core/spell_cave`, copied from
 * `packages/spellkave-mechanics/fixtures/core/base/locations.toml`. Every
 * H3 cell field and `parent_def`/`interior_graph_id` is authored empty/0
 * there — the realistic case for a location with no parent and no
 * geographic footprint yet.
 */
const SPELL_CAVE: Record<string, unknown> = {
	bundle_id: "core",
	cell_res10: 0,
	cell_res4: 0,
	cell_res7: 0,
	display_name: "Core",
	interior_graph_id: "",
	location_def_id: "core/spell_cave",
	parent_def: "",
};

/**
 * A nested location with a real H3 anchor, to exercise the non-zero/
 * non-empty branches. `cell_res*` is `u64` in `LocationDefinitionRow`; real
 * H3 cell indices run well past `Number.MAX_SAFE_INTEGER` and lose
 * precision once JSON-parsed into a JS `number` — a pre-existing property
 * of the manifest pipeline, not something this component controls, so the
 * fixture uses safe-integer stand-ins rather than a real H3 index.
 */
const NESTED: Record<string, unknown> = {
	bundle_id: "core",
	cell_res10: 622236750,
	cell_res4: 596538,
	cell_res7: 6081955,
	display_name: "Cave Antechamber",
	interior_graph_id: "core/antechamber_graph",
	location_def_id: "core/spell_cave/antechamber",
	parent_def: "core/spell_cave",
};

/** The realistic minimal case: only the identity column authored. */
const MINIMAL: Record<string, unknown> = {
	location_def_id: "core/unnamed",
};

const link = (ref: string): string | undefined =>
	ref === "core/spell_cave" ? "/docs/srd/mechanics/locations/core-spell-cave" : undefined;

describe("locationRowView", () => {
	it("titles the page from display_name directly, not a merged title", () => {
		const row = locationRowView(SPELL_CAVE, "/docs/srd/mechanics/locations/x", link);
		expect(row.title).toBe("Core");
		expect(row.ref).toBe("core/spell_cave");
		expect(row.kind_label).toBe("Location");
	});

	it("falls back to the raw ref when display_name is absent", () => {
		const { display_name: _dropped, ...withoutName } = SPELL_CAVE;
		const row = locationRowView(withoutName, undefined, link);
		expect(row.title).toBe("core/spell_cave");
	});

	it("omits parent/interior/cell fields when authored empty or zero", () => {
		const row = locationRowView(SPELL_CAVE, undefined, link);
		expect(row.fields.find((f) => f.label === "Parent location")).toBeUndefined();
		expect(row.fields.find((f) => f.label === "Interior graph")).toBeUndefined();
		expect(row.fields.find((f) => f.label.startsWith("H3 cell"))).toBeUndefined();
	});

	it("shows a linked parent location and interior graph, and the H3 cells, when authored", () => {
		const row = locationRowView(NESTED, undefined, link);
		const parent = row.fields.find((f) => f.label === "Parent location");
		expect(parent?.value).toBe("core/spell_cave");
		expect(parent?.href).toBe("/docs/srd/mechanics/locations/core-spell-cave");
		expect(row.fields.find((f) => f.label === "Interior graph")?.value).toBe(
			"core/antechamber_graph",
		);
		expect(row.fields.find((f) => f.label === "H3 cell (resolution 10)")?.value).toBe("622236750");
		expect(row.fields.find((f) => f.label === "H3 cell (resolution 7)")?.value).toBe("6081955");
		expect(row.fields.find((f) => f.label === "H3 cell (resolution 4)")?.value).toBe("596538");
	});

	it("renders sensibly for a row carrying only its identity column", () => {
		const row = locationRowView(MINIMAL, undefined, link);
		expect(row.title).toBe("core/unnamed");
		expect(row.fields.find((f) => f.label === "Location ID")?.value).toBe("core/unnamed");
	});
});

describe("LocationView", () => {
	const row = locationRowView(SPELL_CAVE, "/docs/srd/mechanics/locations/x", link);

	it("renders inline as a linked one-liner carrying the raw ref", () => {
		const { unmount } = render(LocationView, { row, view: "inline" });
		expect(screen.getByRole("link", { name: "Core" })).toBeTruthy();
		expect(screen.getByText("core/spell_cave")).toBeTruthy();
		unmount();
	});

	it("renders compact as a card naming its kind", () => {
		const { unmount } = render(LocationView, { row, view: "compact" });
		expect(screen.getAllByText(/Core/).length).toBeGreaterThan(0);
		expect(screen.getAllByText("Location").length).toBeGreaterThan(0);
		unmount();
	});

	it("renders full with its title and its identity field", () => {
		const { unmount } = render(LocationView, { row, view: "full", chrome: true });
		expect(screen.getAllByText(/Core/).length).toBeGreaterThan(0);
		expect(screen.getByText("Location ID")).toBeTruthy();
		unmount();
	});

	it("renders full for the minimal identity-only row without crashing", () => {
		const minimalRow = locationRowView(MINIMAL, undefined, link);
		const { unmount } = render(LocationView, { row: minimalRow, view: "full", chrome: false });
		expect(screen.getByTestId("entry-heading-ref").textContent).toContain("core/unnamed");
		unmount();
	});

	it("renders the nested location's linked parent and H3 cells in full view", () => {
		const nestedRow = locationRowView(NESTED, undefined, link);
		const { unmount } = render(LocationView, { row: nestedRow, view: "full", chrome: true });
		expect(screen.getByRole("link", { name: "core/spell_cave" })).toBeTruthy();
		expect(screen.getByText("H3 cell (resolution 10)")).toBeTruthy();
		unmount();
	});
});
