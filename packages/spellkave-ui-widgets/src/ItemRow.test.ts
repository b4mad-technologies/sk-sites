import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import ItemRow from "./ItemRow.svelte";

describe("ItemRow", () => {
	it("renders glyph row with stack count and equipped label", () => {
		render(ItemRow, {
			props: { id: "9", name: "Javelin", quantity: 8, equipped: "main hand" },
		});
		expect(screen.getByText("Javelin")).toBeTruthy();
		expect(screen.getByText("×8")).toBeTruthy();
		expect(screen.getByText("main hand")).toBeTruthy();
		expect(screen.getByRole("button", { name: /Javelin/ })).toBeTruthy();
	});

	it("hides the count for a single item and the label when unequipped", () => {
		render(ItemRow, { props: { id: "3", name: "Torch" } });
		expect(screen.queryByText(/×/)).toBeNull();
		expect(screen.queryByText("main hand")).toBeNull();
	});

	it("renders a link row with href and test id", () => {
		render(ItemRow, {
			props: { id: "9", name: "Javelin", quantity: 8, href: "/w/elven-mini/thing/9" },
		});
		const link = screen.getByRole("link", { name: /Javelin/ });
		expect(link.getAttribute("href")).toBe("/w/elven-mini/thing/9");
		expect(link.getAttribute("data-testid")).toBeNull();
	});

	it("a link row with onSelect preventDefaults instead of navigating", async () => {
		const onSelect = vi.fn();
		render(ItemRow, {
			props: {
				id: "9",
				name: "Javelin",
				href: "/w/elven-mini/thing/9",
				onSelect,
				testId: "inspect-carried-item",
			},
		});
		const link = screen.getByTestId("inspect-carried-item");
		link.click();
		expect(onSelect).toHaveBeenCalledWith("9");
	});

	it("button form reports selection", async () => {
		const onSelect = vi.fn();
		render(ItemRow, { props: { id: "4", name: "Club", onSelect } });
		await screen.getByRole("button", { name: /Club/ }).click();
		expect(onSelect).toHaveBeenCalledWith("4");
	});
});
