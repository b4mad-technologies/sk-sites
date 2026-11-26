import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DocsTechnicalSourceSummary, DocsTechnicalTable } from "./docs-types";
import TechnicalBundlePage from "./TechnicalBundlePage.svelte";

const bundle: DocsTechnicalSourceSummary = {
	source_id: "srd",
	bundle_ids: ["srd"],
	row_count: 120,
	href: "/docs/technical/srd",
	tables: [
		{
			table: "entity_definition_tag",
			count: 120,
			href: "/compendium/docs/technical/srd/entity_definition_tag.json",
		},
	],
};

function table(count = 120): DocsTechnicalTable {
	return {
		version: 1,
		source_id: "srd",
		bundle_ids: ["srd"],
		table: "entity_definition_tag",
		rows: Array.from({ length: count }, (_, index) => ({
			bundle_id: "srd",
			entity_def_id: `srd/item/item-${index}`,
			tag: index === 110 ? "srd.special.needle" : `srd.item.${index}`,
		})),
	};
}

describe("TechnicalBundlePage", () => {
	beforeEach(() => vi.stubGlobal("scrollTo", vi.fn()));

	it("renders at most fifty collapsed rows per page and preserves original numbering", async () => {
		render(TechnicalBundlePage, { bundle, table: table() });
		expect(document.querySelectorAll("details")).toHaveLength(50);
		expect(document.querySelector("details[open]")).toBeNull();
		expect(screen.getByText(/Row 1 · entity_def_id: srd\/item\/item-0/)).toBeTruthy();

		await fireEvent.click(screen.getByRole("button", { name: "Next" }));
		expect(document.querySelectorAll("details")).toHaveLength(50);
		expect(screen.getByText(/Row 51 · entity_def_id: srd\/item\/item-50/)).toBeTruthy();
		expect(screen.getByText("Page 2 of 3")).toBeTruthy();
	});

	it("filters case-insensitively by full row text and resets to the first page", async () => {
		render(TechnicalBundlePage, { bundle, table: table() });
		await fireEvent.click(screen.getByRole("button", { name: "Next" }));
		await fireEvent.input(screen.getByRole("searchbox", { name: "Filter rows" }), {
			target: { value: "SPECIAL.NEEDLE" },
		});

		expect(screen.getByText("1 filtered / 120 total rows")).toBeTruthy();
		expect(document.querySelectorAll("details")).toHaveLength(1);
		expect(screen.getByText(/Row 111 · entity_def_id: srd\/item\/item-110/)).toBeTruthy();
		expect(screen.queryByText(/Page 2/)).toBeNull();
	});

	it("resets page, filter, and disclosure state when the source or table changes", async () => {
		const view = render(TechnicalBundlePage, { bundle, table: table() });
		await fireEvent.click(screen.getByRole("button", { name: "Next" }));
		const smallTable = {
			...table(2),
			table: "resource_definitions",
			rows: [{ resource_definition_id: "srd/str" }, { resource_definition_id: "srd/dex" }],
		};
		await view.rerender({ bundle, table: smallTable });
		expect((screen.getByRole("searchbox", { name: "Filter rows" }) as HTMLInputElement).value).toBe(
			"",
		);
		expect(screen.getByText(/Row 1 · resource_definition_id: srd\/str/)).toBeTruthy();
		expect(screen.queryByText(/Page 2/)).toBeNull();

		await fireEvent.input(screen.getByRole("searchbox", { name: "Filter rows" }), {
			target: { value: "dex" },
		});
		await fireEvent.click(screen.getByText(/Row 2 · resource_definition_id: srd\/dex/));
		expect(document.querySelector("details[open]")).toBeTruthy();

		const otherBundle = { ...bundle, source_id: "extension", bundle_ids: ["extension"] };
		await view.rerender({
			bundle: otherBundle,
			table: {
				...smallTable,
				source_id: "extension",
				rows: [{ resource_definition_id: "extension/luck" }],
			},
		});
		expect((screen.getByRole("searchbox", { name: "Filter rows" }) as HTMLInputElement).value).toBe(
			"",
		);
		expect(screen.getByText(/Row 1 · resource_definition_id: extension\/luck/)).toBeTruthy();
		expect(document.querySelector("details[open]")).toBeNull();
	});

	it("shows distinct empty-table and no-filter-match states", async () => {
		const view = render(TechnicalBundlePage, { bundle, table: table(0) });
		expect(screen.getByText("This table contains no rows.")).toBeTruthy();

		view.unmount();
		render(TechnicalBundlePage, { bundle, table: table(2) });
		await fireEvent.input(screen.getByRole("searchbox", { name: "Filter rows" }), {
			target: { value: "not-present" },
		});
		expect(screen.getByText("No rows match this filter.")).toBeTruthy();
		expect(screen.getByText("0 filtered / 2 total rows")).toBeTruthy();
	});

	it("uses deterministic Row N when a row has no structural identifier", () => {
		render(TechnicalBundlePage, {
			bundle,
			table: { ...table(0), rows: [{ ordinal: 3, enabled: true }] },
		});
		expect(screen.getByText("Row 1")).toBeTruthy();
	});

	it("intercepts ordinary links but leaves modified and middle clicks to the browser", async () => {
		render(TechnicalBundlePage, { bundle });
		const link = screen.getByRole("link", { name: /entity_definition_tag/ });
		await fireEvent.click(link);
		expect(window.scrollTo).toHaveBeenCalledWith({ top: 0 });

		vi.mocked(window.scrollTo).mockClear();
		for (const options of [
			{ ctrlKey: true },
			{ metaKey: true },
			{ shiftKey: true },
			{ button: 1 },
		]) {
			await fireEvent.click(link, options);
		}
		expect(window.scrollTo).not.toHaveBeenCalled();
	});

	it("shows an explicit empty state for a source without non-empty tables", () => {
		render(TechnicalBundlePage, { bundle: { ...bundle, row_count: 0, tables: [] } });
		expect(
			screen.getByText(
				"This manifest source contains no technical row tables or metadata envelopes.",
			),
		).toBeTruthy();
	});
});
