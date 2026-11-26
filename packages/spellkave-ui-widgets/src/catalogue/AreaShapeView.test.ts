import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import AreaShapeView, { areaShapeRowView } from "./AreaShapeView.svelte";

/**
 * `core/area/sphere`, copied from
 * `packages/spellkave-mechanics/fixtures/core/base/spatial.toml`.
 */
const SPHERE: Record<string, unknown> = {
	bundle_id: "core",
	description:
		"Sphere/ellipsoid centred on origin. radius_m is the required fallback; optional per-axis radii override it.",
	parameter_schema_json:
		'{"radius_m": "f32", "radius_x_m": "f32?", "radius_y_m": "f32?", "radius_z_m": "f32?"}',
	shape_id: "core/area/sphere",
	// The page merges `title` in from compiler-derived display copy —
	// `area_shape_definitions` itself has no `display_name` column.
	title: "Sphere",
};

/** The realistic minimal case: only the identity column authored. */
const MINIMAL: Record<string, unknown> = {
	shape_id: "core/area/cube",
};

const link = (): string | undefined => undefined;

describe("areaShapeRowView", () => {
	it("titles the page from the merged title and keeps the shape id as its ref", () => {
		const row = areaShapeRowView(SPHERE, "/docs/srd/mechanics/area-shapes/x", link);
		expect(row.title).toBe("Sphere");
		expect(row.ref).toBe("core/area/sphere");
		expect(row.kind_label).toBe("Area shape");
	});

	it("falls back to the raw ref when no title was merged in", () => {
		const { title: _dropped, ...withoutTitle } = SPHERE;
		const row = areaShapeRowView(withoutTitle, undefined, link);
		expect(row.title).toBe("core/area/sphere");
	});

	it("shows the parameter schema in code", () => {
		const row = areaShapeRowView(SPHERE, undefined, link);
		const field = row.fields.find((f) => f.label === "Parameters");
		expect(field?.value).toBe(
			'{"radius_m": "f32", "radius_x_m": "f32?", "radius_y_m": "f32?", "radius_z_m": "f32?"}',
		);
		expect(field?.code).toBe(true);
	});

	it("renders sensibly for a row carrying only its identity column", () => {
		const row = areaShapeRowView(MINIMAL, undefined, link);
		expect(row.title).toBe("core/area/cube");
		expect(row.fields.find((f) => f.label === "Area Shape ID")?.value).toBe("core/area/cube");
		expect(row.fields.find((f) => f.label === "Parameters")).toBeUndefined();
	});
});

describe("AreaShapeView", () => {
	const row = areaShapeRowView(SPHERE, "/docs/srd/mechanics/area-shapes/x", link);

	it("renders inline as a linked one-liner carrying the raw ref", () => {
		const { unmount } = render(AreaShapeView, { row, view: "inline" });
		expect(screen.getByRole("link", { name: "Sphere" })).toBeTruthy();
		expect(screen.getByText("core/area/sphere")).toBeTruthy();
		unmount();
	});

	it("renders compact as a card naming its kind", () => {
		const { unmount } = render(AreaShapeView, { row, view: "compact" });
		expect(screen.getAllByText(/Sphere/).length).toBeGreaterThan(0);
		expect(screen.getAllByText("Area shape").length).toBeGreaterThan(0);
		unmount();
	});

	it("renders full with its title and its fields", () => {
		const { unmount } = render(AreaShapeView, { row, view: "full", chrome: true });
		expect(screen.getAllByText(/Sphere/).length).toBeGreaterThan(0);
		expect(screen.getByText("Parameters")).toBeTruthy();
		unmount();
	});

	it("renders full for the minimal identity-only row without crashing", () => {
		const minimalRow = areaShapeRowView(MINIMAL, undefined, link);
		const { unmount } = render(AreaShapeView, { row: minimalRow, view: "full", chrome: false });
		expect(screen.getByTestId("entry-heading-ref").textContent).toContain("core/area/cube");
		unmount();
	});

	it("shows the description in the header half and the fields in the details half", () => {
		const { unmount } = render(AreaShapeView, {
			row,
			view: "full",
			chrome: false,
			sections: { details: false },
		});
		expect(screen.getByText(/Sphere\/ellipsoid centred on origin/)).toBeTruthy();
		expect(screen.queryByText("Parameters")).toBeNull();
		unmount();

		render(AreaShapeView, { row, view: "full", chrome: false, sections: { header: false } });
		expect(screen.getByText("Parameters")).toBeTruthy();
		expect(screen.queryByText(/Sphere\/ellipsoid centred on origin/)).toBeNull();
	});
});
