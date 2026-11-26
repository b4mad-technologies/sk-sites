import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import SpatialStateView, { spatialStateRowView } from "./SpatialStateView.svelte";

/**
 * The Flaming Sphere hazard marker, copied field-for-field from
 * `packages/spellkave-srd-cc/fixtures/base/playing-the-game/grid.toml`.
 */
const FLAMING_SPHERE_STATE: Record<string, unknown> = {
	bundle_id: "srd",
	description: "Flaming Sphere lingering hazard marker.",
	freshness_rule: "expires_after_ticks:1000000000",
	lod_policy: "retain_latest",
	merge_rule: "replace",
	state_id: "srd/hazard/flaming-sphere",
	value_type: "int",
	writer_policy: "world_interaction",
	// The page merges `title` in — `spatial_state_definitions` has no
	// `display_name` column.
	title: "Flaming Sphere",
};

/**
 * The difficult-terrain marker, copied from the same fixture file. It
 * authors an EMPTY `freshness_rule` — the omit-when-blank case.
 */
const DIFFICULT_TERRAIN_STATE: Record<string, unknown> = {
	bundle_id: "srd",
	description:
		"Difficult-terrain marker authored on a place_node (ADR-0101 D-4): the Step template's movement_cost_expression_source multiplies the crossing cost by this value (via the edge's incident-node @from_node/@to_node projection). world_interaction writer_policy lets a reducer-driven effect (a spell, a hazard) flip this state and change the NEXT traversal's charge with no manifest re-apply.",
	freshness_rule: "",
	lod_policy: "retain_latest",
	merge_rule: "replace",
	state_id: "srd/state/difficult_terrain",
	value_type: "int",
	writer_policy: "world_interaction",
	title: "Difficult Terrain",
};

const link = (): string | undefined => undefined;

describe("spatialStateRowView", () => {
	it("titles the page from the merged title and keeps the state id as its ref", () => {
		const row = spatialStateRowView(
			FLAMING_SPHERE_STATE,
			"/docs/srd/mechanics/spatial-states/x",
			link,
		);
		expect(row.title).toBe("Flaming Sphere");
		expect(row.ref).toBe("srd/hazard/flaming-sphere");
		expect(row.kind_label).toBe("Spatial state");
	});

	it("falls back to the raw ref when no title was merged in", () => {
		const { title: _dropped, ...withoutTitle } = FLAMING_SPHERE_STATE;
		const row = spatialStateRowView(withoutTitle, undefined, link);
		expect(row.title).toBe("srd/hazard/flaming-sphere");
	});

	it("leads with the value shape and the write/merge rules", () => {
		const row = spatialStateRowView(FLAMING_SPHERE_STATE, undefined, link);
		expect(row.fields.slice(0, 4).map((field) => field.label)).toEqual([
			"Value type",
			"Who can write it",
			"Merge rule",
			"Detail retention",
		]);
		expect(row.fields.find((f) => f.label === "Expires")?.value).toBe(
			"expires_after_ticks:1000000000",
		);
	});

	it("omits the expiry field when the row leaves freshness_rule blank", () => {
		const row = spatialStateRowView(DIFFICULT_TERRAIN_STATE, undefined, link);
		expect(row.fields.some((field) => field.label === "Expires")).toBe(false);
	});
});

describe("SpatialStateView", () => {
	const row = spatialStateRowView(
		FLAMING_SPHERE_STATE,
		"/docs/srd/mechanics/spatial-states/x",
		link,
	);

	it("renders inline as a linked one-liner carrying the raw ref", () => {
		const { unmount } = render(SpatialStateView, { row, view: "inline" });
		expect(screen.getByRole("link", { name: "Flaming Sphere" })).toBeTruthy();
		expect(screen.getByText("srd/hazard/flaming-sphere")).toBeTruthy();
		unmount();
	});

	it("renders compact as a card naming its kind", () => {
		const { unmount } = render(SpatialStateView, { row, view: "compact" });
		expect(screen.getAllByText(/Flaming Sphere/).length).toBeGreaterThan(0);
		expect(screen.getAllByText("Spatial state").length).toBeGreaterThan(0);
		unmount();
	});

	it("renders full with its title and its fields", () => {
		const { unmount } = render(SpatialStateView, { row, view: "full", chrome: true });
		expect(screen.getAllByText(/Flaming Sphere/).length).toBeGreaterThan(0);
		expect(screen.getByText("Who can write it")).toBeTruthy();
		unmount();
	});

	it("shows the description in the header half and the fields in the details half", () => {
		const { unmount } = render(SpatialStateView, {
			row,
			view: "full",
			chrome: false,
			sections: { details: false },
		});
		expect(screen.getByText(/Flaming Sphere lingering hazard marker/)).toBeTruthy();
		expect(screen.queryByText("Who can write it")).toBeNull();
		unmount();

		render(SpatialStateView, { row, view: "full", chrome: false, sections: { header: false } });
		expect(screen.getByText("Who can write it")).toBeTruthy();
		expect(screen.queryByText(/Flaming Sphere lingering hazard marker/)).toBeNull();
	});
});
