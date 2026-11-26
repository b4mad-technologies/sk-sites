import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import ObjectStateView, { objectStateRowView } from "./ObjectStateView.svelte";

/**
 * `affordances_tour/hp`, copied from
 * `server/src/manifest/testdata/affordances_tour.toml`.
 */
const HP: Record<string, unknown> = {
	bundle_id: "affordances_tour",
	default_visibility: "public",
	display_name: "Hit Points",
	state_id: "affordances_tour/hp",
	target_kind: "entity",
};

/** The realistic minimal case: only the identity column authored. */
const MINIMAL: Record<string, unknown> = {
	state_id: "affordances_tour/fatigue",
};

const link = (): string | undefined => undefined;

describe("objectStateRowView", () => {
	it("titles the page from display_name directly, not a merged title", () => {
		const row = objectStateRowView(HP, "/docs/srd/mechanics/object-states/x", link);
		expect(row.title).toBe("Hit Points");
		expect(row.ref).toBe("affordances_tour/hp");
		expect(row.kind_label).toBe("Object state");
	});

	it("falls back to the raw ref when display_name is absent", () => {
		const { display_name: _dropped, ...withoutName } = HP;
		const row = objectStateRowView(withoutName, undefined, link);
		expect(row.title).toBe("affordances_tour/hp");
	});

	it("shows target_kind and default_visibility as plain text, not links", () => {
		const row = objectStateRowView(HP, undefined, link);
		const target = row.fields.find((f) => f.label === "Applies to");
		expect(target?.value).toBe("entity");
		expect(target?.href).toBeUndefined();
		const visibility = row.fields.find((f) => f.label === "Default visibility");
		expect(visibility?.value).toBe("public");
	});

	it("renders sensibly for a row carrying only its identity column", () => {
		const row = objectStateRowView(MINIMAL, undefined, link);
		expect(row.title).toBe("affordances_tour/fatigue");
		expect(row.fields.find((f) => f.label === "Object State ID")?.value).toBe(
			"affordances_tour/fatigue",
		);
		expect(row.fields.find((f) => f.label === "Applies to")).toBeUndefined();
	});
});

describe("ObjectStateView", () => {
	const row = objectStateRowView(HP, "/docs/srd/mechanics/object-states/x", link);

	it("renders inline as a linked one-liner carrying the raw ref", () => {
		const { unmount } = render(ObjectStateView, { row, view: "inline" });
		expect(screen.getByRole("link", { name: "Hit Points" })).toBeTruthy();
		expect(screen.getByText("affordances_tour/hp")).toBeTruthy();
		unmount();
	});

	it("renders compact as a card naming its kind", () => {
		const { unmount } = render(ObjectStateView, { row, view: "compact" });
		expect(screen.getAllByText(/Hit Points/).length).toBeGreaterThan(0);
		expect(screen.getAllByText("Object state").length).toBeGreaterThan(0);
		unmount();
	});

	it("renders full with its title and its fields", () => {
		const { unmount } = render(ObjectStateView, { row, view: "full", chrome: true });
		expect(screen.getAllByText(/Hit Points/).length).toBeGreaterThan(0);
		expect(screen.getByText("Applies to")).toBeTruthy();
		unmount();
	});

	it("renders full for the minimal identity-only row without crashing", () => {
		const minimalRow = objectStateRowView(MINIMAL, undefined, link);
		const { unmount } = render(ObjectStateView, { row: minimalRow, view: "full", chrome: false });
		expect(screen.getByTestId("entry-heading-ref").textContent).toContain(
			"affordances_tour/fatigue",
		);
		unmount();
	});

	it("splits header/details across sections", () => {
		const { unmount } = render(ObjectStateView, {
			row,
			view: "full",
			chrome: false,
			sections: { details: false },
		});
		expect(screen.queryByText("Applies to")).toBeNull();
		unmount();

		render(ObjectStateView, { row, view: "full", chrome: false, sections: { header: false } });
		expect(screen.getByText("Applies to")).toBeTruthy();
	});
});
