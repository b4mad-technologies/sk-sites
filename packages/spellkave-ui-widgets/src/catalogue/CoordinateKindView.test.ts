import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import CoordinateKindView, { coordinateKindRowView } from "./CoordinateKindView.svelte";

/**
 * No `coordinate_kind_definitions` row is authored anywhere in the repo
 * today (see the projector's own doc comment) — this fixture is built
 * directly against `crates/spellkave-schema/src/lib.rs`'s
 * `CoordinateKindDefinitionRow` shape (`coordinate_kind_id`, `bundle_id`,
 * `description`).
 */
const CARTESIAN: Record<string, unknown> = {
	bundle_id: "core",
	coordinate_kind_id: "core/coordinate/cartesian",
	description: "Metric x/y/z coordinates over a substrate with no natural grid.",
	title: "Cartesian",
};

/** The realistic minimal case: only the identity column authored. */
const MINIMAL: Record<string, unknown> = {
	coordinate_kind_id: "core/coordinate/h3",
};

const link = (): string | undefined => undefined;

describe("coordinateKindRowView", () => {
	it("titles the page from the merged title and keeps the coordinate kind id as its ref", () => {
		const row = coordinateKindRowView(CARTESIAN, "/docs/srd/mechanics/coordinate-kinds/x", link);
		expect(row.title).toBe("Cartesian");
		expect(row.ref).toBe("core/coordinate/cartesian");
		expect(row.kind_label).toBe("Coordinate kind");
	});

	it("falls back to the raw ref when no title was merged in", () => {
		const { title: _dropped, ...withoutTitle } = CARTESIAN;
		const row = coordinateKindRowView(withoutTitle, undefined, link);
		expect(row.title).toBe("core/coordinate/cartesian");
	});

	it("shows the owning bundle field a real row carries", () => {
		const row = coordinateKindRowView(CARTESIAN, undefined, link);
		expect(row.fields.find((f) => f.label === "Owning bundle")?.value).toBe("core");
	});

	it("renders sensibly for a row carrying only its identity column", () => {
		const row = coordinateKindRowView(MINIMAL, undefined, link);
		expect(row.title).toBe("core/coordinate/h3");
		expect(row.fields.find((f) => f.label === "Coordinate Kind ID")?.value).toBe(
			"core/coordinate/h3",
		);
		expect(row.fields.find((f) => f.label === "Owning bundle")).toBeUndefined();
	});
});

describe("CoordinateKindView", () => {
	const row = coordinateKindRowView(CARTESIAN, "/docs/srd/mechanics/coordinate-kinds/x", link);

	it("renders inline as a linked one-liner carrying the raw ref", () => {
		const { unmount } = render(CoordinateKindView, { row, view: "inline" });
		expect(screen.getByRole("link", { name: "Cartesian" })).toBeTruthy();
		expect(screen.getByText("core/coordinate/cartesian")).toBeTruthy();
		unmount();
	});

	it("renders compact as a card naming its kind", () => {
		const { unmount } = render(CoordinateKindView, { row, view: "compact" });
		expect(screen.getAllByText(/Cartesian/).length).toBeGreaterThan(0);
		expect(screen.getAllByText("Coordinate kind").length).toBeGreaterThan(0);
		unmount();
	});

	it("renders full with its title and its fields", () => {
		const { unmount } = render(CoordinateKindView, { row, view: "full", chrome: true });
		expect(screen.getAllByText(/Cartesian/).length).toBeGreaterThan(0);
		expect(screen.getByText("Owning bundle")).toBeTruthy();
		unmount();
	});

	it("renders full for the minimal identity-only row without crashing", () => {
		const minimalRow = coordinateKindRowView(MINIMAL, undefined, link);
		const { unmount } = render(CoordinateKindView, {
			row: minimalRow,
			view: "full",
			chrome: false,
		});
		expect(screen.getByTestId("entry-heading-ref").textContent).toContain("core/coordinate/h3");
		unmount();
	});

	it("shows the description in the header half and the fields in the details half", () => {
		const { unmount } = render(CoordinateKindView, {
			row,
			view: "full",
			chrome: false,
			sections: { details: false },
		});
		expect(screen.getByText(/Metric x\/y\/z coordinates/)).toBeTruthy();
		expect(screen.queryByText("Owning bundle")).toBeNull();
		unmount();

		render(CoordinateKindView, { row, view: "full", chrome: false, sections: { header: false } });
		expect(screen.getByText("Owning bundle")).toBeTruthy();
		expect(screen.queryByText(/Metric x\/y\/z coordinates/)).toBeNull();
	});
});
