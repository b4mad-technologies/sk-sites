import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import Inspect from "./Inspect.svelte";

describe("Inspect", () => {
	it("shows prose, place, carried kit, and people here", async () => {
		const onSelectHere = vi.fn();
		const { component } = render(Inspect, {
			props: {
				title: "Aldwin",
				description: "Aldwin sits by the hearth, ledger open on his knee.",
				facts: [{ label: "Place", value: "Inn · Common room" }],
				carried: [{ id: "1", name: "Ledger" }],
				here: [{ id: "2", name: "Mira" }],
				onSelectHere,
			},
		});
		expect(screen.getByRole("heading", { name: "Aldwin" })).toBeTruthy();
		expect(screen.getByText(/sits by the hearth/)).toBeTruthy();
		expect(screen.getByText("Inn · Common room")).toBeTruthy();
		expect(screen.getByText("Ledger")).toBeTruthy();
		const mira = screen.getByRole("button", { name: "Mira" });
		expect(mira.className).toContain("text-primary");
		mira.click();
		expect(onSelectHere).toHaveBeenCalledWith("2");
		expect(component).toBeTruthy();
	});

	it("renders carried items as ItemRow links with count and equipped", () => {
		const onSelectCarried = vi.fn();
		render(Inspect, {
			props: {
				title: "Torvald Ironmark",
				facts: [],
				carried: [
					{
						id: "12",
						name: "Javelin",
						quantity: 8,
						href: "/w/elven-mini/thing/12",
					},
					{
						id: "3",
						name: "Chain Mail",
						equipped: "main hand",
						href: "/w/elven-mini/thing/3",
					},
				],
				onSelectCarried,
			},
		});
		const javelin = screen.getAllByTestId("inspect-carried-item")[0];
		expect(javelin).toBeTruthy();
		if (javelin === undefined) return;
		expect(javelin.getAttribute("href")).toBe("/w/elven-mini/thing/12");
		expect(javelin.textContent).toContain("Javelin");
		expect(javelin.textContent).toContain("×8");
		expect(screen.getByText("main hand")).toBeTruthy();
		javelin.click();
		expect(onSelectCarried).toHaveBeenCalledWith("12");
	});

	it("renders carried items without href as plain rows", () => {
		render(Inspect, {
			props: { title: "Aldwin", facts: [], carried: [{ id: "1", name: "Ledger" }] },
		});
		expect(screen.queryByTestId("inspect-carried-item")).toBeNull();
		expect(screen.getByText("Ledger")).toBeTruthy();
	});
});
