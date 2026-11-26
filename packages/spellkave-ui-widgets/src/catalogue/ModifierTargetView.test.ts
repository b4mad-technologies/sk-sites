import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import ModifierTargetView, { modifierTargetRowView } from "./ModifierTargetView.svelte";

/**
 * The Armor Class modifier axis, copied field-for-field from
 * `packages/spellkave-srd-cc/fixtures/base/playing-the-game/armor-class.toml`.
 */
const ARMOR_CLASS: Record<string, unknown> = {
	bundle_id: "srd",
	description:
		"Modder-defined Armor Class modifier axis — additive and replacement composition for armor, cover, magic, and other effects.",
	display_name: "Armor Class",
	shape: "Numeric",
	target_id: "srd/ac",
};

/**
 * The Resolution Check axis, from
 * `packages/spellkave-srd-cc/fixtures/base/playing-the-game/perception-conditions.toml`.
 * `shape = "Mode"` and no authored description — proves the shape is read
 * verbatim rather than assumed Numeric, and that description stays optional.
 */
const RESOLUTION_CHECK: Record<string, unknown> = {
	bundle_id: "srd",
	display_name: "Resolution Check (against bearer)",
	shape: "Mode",
	target_id: "ResolutionCheck",
};

const link = (_ref: string): string | undefined => undefined;

describe("modifierTargetRowView", () => {
	it("titles the page from display_name and keeps the target id as its ref", () => {
		const row = modifierTargetRowView(ARMOR_CLASS, "/docs/srd/mechanics/modifier-targets/x", link);
		expect(row.title).toBe("Armor Class");
		expect(row.ref).toBe("srd/ac");
		expect(row.kind_label).toBe("Modifier target");
	});

	it("leads with the fold shape, then the identity rows", () => {
		const row = modifierTargetRowView(ARMOR_CLASS, undefined, link);
		expect(row.fields.map((field) => field.label)).toEqual([
			"Value shape",
			"Target ID",
			"Owning bundle",
		]);
		expect(row.fields[0]).toMatchObject({ label: "Value shape", value: "Numeric" });
	});

	it("reads the shape verbatim rather than assuming Numeric", () => {
		const row = modifierTargetRowView(RESOLUTION_CHECK, undefined, link);
		expect(row.fields.find((field) => field.label === "Value shape")?.value).toBe("Mode");
	});

	it("carries no description when the row leaves it empty", () => {
		expect(modifierTargetRowView(RESOLUTION_CHECK, undefined, link).description).toBeUndefined();
	});
});

describe("ModifierTargetView", () => {
	const row = modifierTargetRowView(ARMOR_CLASS, "/docs/srd/mechanics/modifier-targets/x", link);

	it("renders inline as a linked one-liner carrying the raw ref", () => {
		const { unmount } = render(ModifierTargetView, { row, view: "inline" });
		expect(screen.getByRole("link", { name: "Armor Class" })).toBeTruthy();
		expect(screen.getByText("srd/ac")).toBeTruthy();
		unmount();
	});

	it("renders compact as a card naming its kind", () => {
		const { unmount } = render(ModifierTargetView, { row, view: "compact" });
		expect(screen.getAllByText(/Armor Class/).length).toBeGreaterThan(0);
		expect(screen.getAllByText("Modifier target").length).toBeGreaterThan(0);
		unmount();
	});

	it("renders full with its title and its fields", () => {
		const { unmount } = render(ModifierTargetView, { row, view: "full", chrome: true });
		expect(screen.getAllByText(/Armor Class/).length).toBeGreaterThan(0);
		expect(screen.getByText("Value shape")).toBeTruthy();
		unmount();
	});

	it("shows the description in the header half and the fields in the details half", () => {
		const { unmount } = render(ModifierTargetView, {
			row,
			view: "full",
			chrome: false,
			sections: { details: false },
		});
		expect(screen.getByText(/additive and replacement composition/)).toBeTruthy();
		expect(screen.queryByText("Value shape")).toBeNull();
		unmount();

		render(ModifierTargetView, { row, view: "full", chrome: false, sections: { header: false } });
		expect(screen.getByText("Value shape")).toBeTruthy();
		expect(screen.queryByText(/additive and replacement composition/)).toBeNull();
	});
});
