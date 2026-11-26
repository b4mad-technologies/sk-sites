import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import RollTableView, { rollTableRowView } from "./RollTableView.svelte";

/**
 * The Common magic-item draw table and its 3 entries, copied field-for-field
 * from `packages/spellkave-srd-cc/fixtures/base/magic-items/loot-tables.toml`.
 * `roll_table_entries` is `surface = "owner"` of `roll_tables` in
 * `row-kind-coverage.toml`, so the entries never go through the projector —
 * they arrive as the component's own `entries` prop, exactly as the real
 * owning page would supply them.
 */
const COMMON_DRAW: Record<string, unknown> = {
	bundle_id: "srd",
	description:
		"Weighted common-tier treasure draw (magic-items.md rarity; gameplay-toolbox treasure). Int codes resolve via LOOT_CODE_CATALOG.",
	display_name: "Common magic-item draw",
	result_kind: "int",
	roll_table_id: "srd/loot/rarity/common",
};

const COMMON_DRAW_ENTRIES: Record<string, unknown>[] = [
	{
		authored_order: 1,
		result_ref: "0",
		roll_table_entry_id: "srd/loot/rarity/common:1",
		roll_table_id: "srd/loot/rarity/common",
		weight: 4,
	},
	{
		authored_order: 2,
		result_ref: "10",
		roll_table_entry_id: "srd/loot/rarity/common:2",
		roll_table_id: "srd/loot/rarity/common",
		weight: 4,
	},
	{
		authored_order: 3,
		result_ref: "11",
		roll_table_entry_id: "srd/loot/rarity/common:3",
		roll_table_id: "srd/loot/rarity/common",
		weight: 2,
	},
];

const link = (): string | undefined => undefined;

describe("rollTableRowView", () => {
	it("titles the page from display_name and keeps the roll table id as its ref", () => {
		const row = rollTableRowView(COMMON_DRAW, "/docs/srd/mechanics/roll-tables/x", link);
		expect(row.title).toBe("Common magic-item draw");
		expect(row.ref).toBe("srd/loot/rarity/common");
		expect(row.kind_label).toBe("Roll table");
	});

	it("carries the result kind and the description", () => {
		const row = rollTableRowView(COMMON_DRAW, undefined, link);
		expect(row.fields.find((field) => field.label === "Result kind")?.value).toBe("int");
		expect(row.description).toBe(
			"Weighted common-tier treasure draw (magic-items.md rarity; gameplay-toolbox treasure). Int codes resolve via LOOT_CODE_CATALOG.",
		);
	});
});

describe("RollTableView", () => {
	const row = rollTableRowView(COMMON_DRAW, "/docs/srd/mechanics/roll-tables/x", link);

	it("renders inline as a linked one-liner carrying the raw ref", () => {
		const { unmount } = render(RollTableView, { row, view: "inline" });
		expect(screen.getByRole("link", { name: "Common magic-item draw" })).toBeTruthy();
		expect(screen.getByText("srd/loot/rarity/common")).toBeTruthy();
		unmount();
	});

	it("renders compact as a card naming its kind", () => {
		const { unmount } = render(RollTableView, { row, view: "compact" });
		expect(screen.getAllByText(/Common magic-item draw/).length).toBeGreaterThan(0);
		expect(screen.getAllByText("Roll table").length).toBeGreaterThan(0);
		unmount();
	});

	it("renders no entries table when none are given", () => {
		const { unmount } = render(RollTableView, { row, view: "full", chrome: true });
		expect(screen.queryByTestId("roll-table-entries")).toBeNull();
		unmount();
	});

	it("renders the entries as a real table, sorted by authored_order, when given", () => {
		const { unmount } = render(RollTableView, {
			row,
			view: "full",
			chrome: true,
			entries: [...COMMON_DRAW_ENTRIES].reverse(),
		});
		const table = screen.getByTestId("roll-table-entries");
		const cells = table.querySelectorAll("tbody td:first-child");
		expect(Array.from(cells).map((cell) => cell.textContent)).toEqual(["1", "2", "3"]);
		expect(screen.getByText("11")).toBeTruthy();
		unmount();
	});

	it("shows the ref/kind caption, never the title, when chrome is off", () => {
		const { unmount } = render(RollTableView, {
			row,
			view: "full",
			chrome: false,
			entries: COMMON_DRAW_ENTRIES,
		});
		expect(screen.getByText("Result kind")).toBeTruthy();
		expect(screen.queryByRole("heading", { name: "Common magic-item draw" })).toBeNull();
		unmount();
	});
});
