import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import ExtentKindView, { extentKindRowView } from "./ExtentKindView.svelte";

/**
 * `party`, copied from
 * `packages/spellkave-mechanics/fixtures/core/base/extent-kinds.toml`.
 */
const PARTY: Record<string, unknown> = {
	bundle_id: "core",
	description:
		"party membership-tag extent (extent_ref is the entity tag) plus current encounter union; any entity carrying that exact tag is a member — choose party refs from a namespace nothing else uses (e.g. srd.party.*)",
	kind_id: "party",
	resolution_shape: "Party",
	// The page merges `title` in from compiler-derived display copy —
	// `extent_kind_definitions` itself has no `display_name` column.
	title: "Party",
};

/** The realistic minimal case: only the identity column authored. */
const MINIMAL: Record<string, unknown> = {
	kind_id: "place_graph",
};

const link = (): string | undefined => undefined;

describe("extentKindRowView", () => {
	it("titles the page from the merged title and keeps the kind id as its ref", () => {
		const row = extentKindRowView(PARTY, "/docs/srd/mechanics/extent-kinds/x", link);
		expect(row.title).toBe("Party");
		expect(row.ref).toBe("party");
		expect(row.kind_label).toBe("Extent kind");
	});

	it("falls back to the raw ref when no title was merged in", () => {
		const { title: _dropped, ...withoutTitle } = PARTY;
		const row = extentKindRowView(withoutTitle, undefined, link);
		expect(row.title).toBe("party");
	});

	it("shows the resolution shape as plain text, not a link", () => {
		const row = extentKindRowView(PARTY, undefined, link);
		const field = row.fields.find((f) => f.label === "Resolution shape");
		expect(field?.value).toBe("Party");
		expect(field?.href).toBeUndefined();
	});

	it("renders sensibly for a row carrying only its identity column", () => {
		const row = extentKindRowView(MINIMAL, undefined, link);
		expect(row.title).toBe("place_graph");
		expect(row.fields.find((f) => f.label === "Extent Kind ID")?.value).toBe("place_graph");
		expect(row.fields.find((f) => f.label === "Resolution shape")).toBeUndefined();
	});
});

describe("ExtentKindView", () => {
	const row = extentKindRowView(PARTY, "/docs/srd/mechanics/extent-kinds/x", link);

	it("renders inline as a linked one-liner carrying the raw ref", () => {
		const { unmount } = render(ExtentKindView, { row, view: "inline" });
		expect(screen.getByRole("link", { name: "Party" })).toBeTruthy();
		expect(screen.getByText("party")).toBeTruthy();
		unmount();
	});

	it("renders compact as a card naming its kind", () => {
		const { unmount } = render(ExtentKindView, { row, view: "compact" });
		expect(screen.getAllByText(/Party/).length).toBeGreaterThan(0);
		expect(screen.getAllByText("Extent kind").length).toBeGreaterThan(0);
		unmount();
	});

	it("renders full with its title and its fields", () => {
		const { unmount } = render(ExtentKindView, { row, view: "full", chrome: true });
		expect(screen.getAllByText(/Party/).length).toBeGreaterThan(0);
		expect(screen.getByText("Resolution shape")).toBeTruthy();
		unmount();
	});

	it("renders full for the minimal identity-only row without crashing", () => {
		const minimalRow = extentKindRowView(MINIMAL, undefined, link);
		const { unmount } = render(ExtentKindView, { row: minimalRow, view: "full", chrome: false });
		expect(screen.getByTestId("entry-heading-ref").textContent).toContain("place_graph");
		unmount();
	});

	it("shows the description in the header half and the fields in the details half", () => {
		const { unmount } = render(ExtentKindView, {
			row,
			view: "full",
			chrome: false,
			sections: { details: false },
		});
		expect(screen.getByText(/party membership-tag extent/)).toBeTruthy();
		expect(screen.queryByText("Resolution shape")).toBeNull();
		unmount();

		render(ExtentKindView, { row, view: "full", chrome: false, sections: { header: false } });
		expect(screen.getByText("Resolution shape")).toBeTruthy();
		expect(screen.queryByText(/party membership-tag extent/)).toBeNull();
	});
});
