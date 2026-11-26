import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import SubstrateView, { substrateRowView } from "./SubstrateView.svelte";

/**
 * No `substrate_definitions` row is authored anywhere in the repo today
 * (see the projector's own doc comment) — this fixture is built directly
 * against `crates/spellkave-schema/src/lib.rs`'s `SubstrateDefinitionRow`
 * shape (`substrate_id`, `bundle_id`, `coordinate_kind_id`, `description`).
 * `substrate_id = "outdoor"` matches the value real `place_graphs`/
 * `place_nodes` rows already reference across the fixtures.
 */
const OUTDOOR: Record<string, unknown> = {
	bundle_id: "core",
	coordinate_kind_id: "core/coordinate/cartesian",
	description: "The open-air substrate place graphs and place nodes anchor to outdoors.",
	substrate_id: "outdoor",
	title: "Outdoor",
};

/** The realistic minimal case: only the identity column authored. */
const MINIMAL: Record<string, unknown> = {
	substrate_id: "indoor",
};

const link = (ref: string): string | undefined =>
	ref === "core/coordinate/cartesian"
		? "/docs/srd/mechanics/coordinate-kinds/core-coordinate-cartesian"
		: undefined;

describe("substrateRowView", () => {
	it("titles the page from the merged title and keeps the substrate id as its ref", () => {
		const row = substrateRowView(OUTDOOR, "/docs/srd/mechanics/substrates/x", link);
		expect(row.title).toBe("Outdoor");
		expect(row.ref).toBe("outdoor");
		expect(row.kind_label).toBe("Substrate");
	});

	it("falls back to the raw ref when no title was merged in", () => {
		const { title: _dropped, ...withoutTitle } = OUTDOOR;
		const row = substrateRowView(withoutTitle, undefined, link);
		expect(row.title).toBe("outdoor");
	});

	it("links the coordinate kind FK to its catalogue page", () => {
		const row = substrateRowView(OUTDOOR, undefined, link);
		const field = row.fields.find((f) => f.label === "Coordinate kind");
		expect(field?.value).toBe("core/coordinate/cartesian");
		expect(field?.href).toBe("/docs/srd/mechanics/coordinate-kinds/core-coordinate-cartesian");
		expect(field?.code).toBe(true);
	});

	it("renders sensibly for a row carrying only its identity column", () => {
		const row = substrateRowView(MINIMAL, undefined, link);
		expect(row.title).toBe("indoor");
		expect(row.fields.find((f) => f.label === "Substrate ID")?.value).toBe("indoor");
		expect(row.fields.find((f) => f.label === "Coordinate kind")).toBeUndefined();
	});
});

describe("SubstrateView", () => {
	const row = substrateRowView(OUTDOOR, "/docs/srd/mechanics/substrates/x", link);

	it("renders inline as a linked one-liner carrying the raw ref", () => {
		const { unmount } = render(SubstrateView, { row, view: "inline" });
		expect(screen.getByRole("link", { name: "Outdoor" })).toBeTruthy();
		expect(screen.getByText("outdoor")).toBeTruthy();
		unmount();
	});

	it("renders compact as a card naming its kind", () => {
		const { unmount } = render(SubstrateView, { row, view: "compact" });
		expect(screen.getAllByText(/Outdoor/).length).toBeGreaterThan(0);
		expect(screen.getAllByText("Substrate").length).toBeGreaterThan(0);
		unmount();
	});

	it("renders full with a linked coordinate kind field", () => {
		const { unmount } = render(SubstrateView, { row, view: "full", chrome: true });
		expect(screen.getByRole("link", { name: "core/coordinate/cartesian" })).toBeTruthy();
		unmount();
	});

	it("renders full for the minimal identity-only row without crashing", () => {
		const minimalRow = substrateRowView(MINIMAL, undefined, link);
		const { unmount } = render(SubstrateView, { row: minimalRow, view: "full", chrome: false });
		expect(screen.getByTestId("entry-heading-ref").textContent).toContain("indoor");
		unmount();
	});

	it("shows the description in the header half and the fields in the details half", () => {
		const { unmount } = render(SubstrateView, {
			row,
			view: "full",
			chrome: false,
			sections: { details: false },
		});
		expect(screen.getByText(/open-air substrate/)).toBeTruthy();
		expect(screen.queryByText("Coordinate kind")).toBeNull();
		unmount();

		render(SubstrateView, { row, view: "full", chrome: false, sections: { header: false } });
		expect(screen.getByText("Coordinate kind")).toBeTruthy();
		expect(screen.queryByText(/open-air substrate/)).toBeNull();
	});
});
