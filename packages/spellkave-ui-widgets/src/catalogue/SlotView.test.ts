import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import SlotView, { slotRowView } from "./SlotView.svelte";

/**
 * The Chest slot row, copied field-for-field from
 * `packages/spellkave-srd-cc/fixtures/base/equipment/armor-slots.toml`.
 * `title` stands in for the field `CatalogueEntryPage.svelte` merges in at
 * read time — this kind carries no `display_name` column, so the real page
 * derives it via `idLabelFromPath` (which happens to land on the same text
 * as `label` here, but the two are not assumed to always agree — see the
 * projector's doc comment).
 */
const CHEST_SLOT: Record<string, unknown> = {
	bundle_id: "srd",
	default_compatibility_predicate: "true",
	label: "Chest",
	slot_id: "srd/slot/chest",
	title: "Chest",
};

const link = (): string | undefined => undefined;

describe("slotRowView", () => {
	it("titles the page from the merged title field and keeps the slot id as its ref", () => {
		const row = slotRowView(CHEST_SLOT, "/docs/srd/equipment/slots/x", link);
		expect(row.title).toBe("Chest");
		expect(row.ref).toBe("srd/slot/chest");
		expect(row.kind_label).toBe("Equipment slot");
	});

	it("carries the authored label as its own field, distinct from the derived title", () => {
		const row = slotRowView(CHEST_SLOT, undefined, link);
		expect(row.fields.map((field) => field.label)).toEqual([
			"Slot name",
			"Compatible equipment",
			"Slot ID",
			"Owning bundle",
		]);
		expect(row.fields[0]?.value).toBe("Chest");
	});

	it("carries no description block at all, since the kind never authors one", () => {
		const row = slotRowView(CHEST_SLOT, undefined, link);
		expect(row.description).toBeUndefined();
	});
});

describe("SlotView", () => {
	const row = slotRowView(CHEST_SLOT, "/docs/srd/equipment/slots/x", link);

	it("renders inline as a linked one-liner carrying the raw ref", () => {
		const { unmount } = render(SlotView, { row, view: "inline" });
		expect(screen.getByRole("link", { name: "Chest" })).toBeTruthy();
		expect(screen.getByText("srd/slot/chest")).toBeTruthy();
		unmount();
	});

	it("renders compact as a card naming its kind", () => {
		const { unmount } = render(SlotView, { row, view: "compact" });
		expect(screen.getAllByText(/Chest/).length).toBeGreaterThan(0);
		expect(screen.getAllByText("Equipment slot").length).toBeGreaterThan(0);
		unmount();
	});

	it("renders full with its title and its fields", () => {
		const { unmount } = render(SlotView, { row, view: "full", chrome: true });
		expect(screen.getAllByText(/Chest/).length).toBeGreaterThan(0);
		expect(screen.getByText("Compatible equipment")).toBeTruthy();
		unmount();
	});

	it("shows the ref/kind caption, never the title, when chrome is off", () => {
		const { unmount } = render(SlotView, { row, view: "full", chrome: false });
		expect(screen.getByText("Compatible equipment")).toBeTruthy();
		expect(screen.queryByRole("heading", { name: "Chest" })).toBeNull();
		unmount();
	});
});
