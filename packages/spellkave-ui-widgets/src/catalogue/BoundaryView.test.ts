import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import BoundaryView, { boundaryRowView } from "./BoundaryView.svelte";

/**
 * `srd/boundary/short_rest`, copied from
 * `packages/spellkave-srd-cc/fixtures/base/playing-the-game/action-economy.toml`.
 * The struct field is `id`, not `boundary_id` — see the projector's own
 * doc comment for why.
 */
const SHORT_REST: Record<string, unknown> = {
	bundle_id: "srd",
	description: "Completion of the SRD Short Rest described in rules-glossary.md § Short Rest.",
	id: "srd/boundary/short_rest",
	// The page merges `title` in from compiler-derived display copy —
	// `boundary_definitions` itself has no `display_name` column.
	title: "Short Rest",
};

/** The realistic minimal case: only the identity column authored. */
const MINIMAL: Record<string, unknown> = {
	id: "srd/boundary/turn_start",
};

const link = (): string | undefined => undefined;

describe("boundaryRowView", () => {
	it("reads the id column (not boundary_id) as the ref", () => {
		const row = boundaryRowView(SHORT_REST, "/docs/srd/mechanics/boundaries/x", link);
		expect(row.ref).toBe("srd/boundary/short_rest");
		expect(row.kind_label).toBe("Boundary");
	});

	it("titles the page from the merged title", () => {
		const row = boundaryRowView(SHORT_REST, undefined, link);
		expect(row.title).toBe("Short Rest");
	});

	it("falls back to the raw ref when no title was merged in", () => {
		const { title: _dropped, ...withoutTitle } = SHORT_REST;
		const row = boundaryRowView(withoutTitle, undefined, link);
		expect(row.title).toBe("srd/boundary/short_rest");
	});

	it("shows the owning bundle field a real row carries", () => {
		const row = boundaryRowView(SHORT_REST, undefined, link);
		expect(row.fields.find((f) => f.label === "Owning bundle")?.value).toBe("srd");
	});

	it("renders sensibly for a row carrying only its identity column", () => {
		const row = boundaryRowView(MINIMAL, undefined, link);
		expect(row.title).toBe("srd/boundary/turn_start");
		expect(row.fields.find((f) => f.label === "Boundary ID")?.value).toBe(
			"srd/boundary/turn_start",
		);
		expect(row.fields.find((f) => f.label === "Owning bundle")).toBeUndefined();
	});
});

describe("BoundaryView", () => {
	const row = boundaryRowView(SHORT_REST, "/docs/srd/mechanics/boundaries/x", link);

	it("renders inline as a linked one-liner carrying the raw ref", () => {
		const { unmount } = render(BoundaryView, { row, view: "inline" });
		expect(screen.getByRole("link", { name: "Short Rest" })).toBeTruthy();
		expect(screen.getByText("srd/boundary/short_rest")).toBeTruthy();
		unmount();
	});

	it("renders compact as a card naming its kind", () => {
		const { unmount } = render(BoundaryView, { row, view: "compact" });
		expect(screen.getAllByText(/Short Rest/).length).toBeGreaterThan(0);
		expect(screen.getAllByText("Boundary").length).toBeGreaterThan(0);
		unmount();
	});

	it("renders full with its title and its fields", () => {
		const { unmount } = render(BoundaryView, { row, view: "full", chrome: true });
		expect(screen.getAllByText(/Short Rest/).length).toBeGreaterThan(0);
		expect(screen.getByText("Owning bundle")).toBeTruthy();
		unmount();
	});

	it("renders full for the minimal identity-only row without crashing", () => {
		const minimalRow = boundaryRowView(MINIMAL, undefined, link);
		const { unmount } = render(BoundaryView, { row: minimalRow, view: "full", chrome: false });
		expect(screen.getByTestId("entry-heading-ref").textContent).toContain(
			"srd/boundary/turn_start",
		);
		unmount();
	});

	it("shows the description in the header half and the fields in the details half", () => {
		const { unmount } = render(BoundaryView, {
			row,
			view: "full",
			chrome: false,
			sections: { details: false },
		});
		expect(screen.getByText(/Completion of the SRD Short Rest/)).toBeTruthy();
		expect(screen.queryByText("Owning bundle")).toBeNull();
		unmount();

		render(BoundaryView, { row, view: "full", chrome: false, sections: { header: false } });
		expect(screen.getByText("Owning bundle")).toBeTruthy();
		expect(screen.queryByText(/Completion of the SRD Short Rest/)).toBeNull();
	});
});
