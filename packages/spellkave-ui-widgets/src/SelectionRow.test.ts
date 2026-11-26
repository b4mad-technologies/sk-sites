import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import SelectionRow from "./SelectionRow.svelte";

describe("SelectionRow", () => {
	it("numbers primary actions with digit pills across the whole row, not per subject", () => {
		const onAct = vi.fn();
		render(SelectionRow, {
			title: "Selected",
			subjects: [
				{ id: "rat-1", name: "Cellar Rat 1", primary: [{ id: "a1", label: "Strike" }], more: [] },
				{
					id: "rat-2",
					name: "Cellar Rat 2",
					primary: [
						{ id: "a2", label: "Shove" },
						{ id: "a3", label: "Trip" },
					],
					more: [],
				},
			],
			onAct,
		});
		expect(screen.getByRole("button", { name: "1 Strike" })).toBeTruthy();
		expect(screen.getByRole("button", { name: "2 Shove" })).toBeTruthy();
		expect(screen.getByRole("button", { name: "3 Trip" })).toBeTruthy();
	});

	it("fires onAct with the pill's own action id", async () => {
		const onAct = vi.fn();
		render(SelectionRow, {
			title: "Selected",
			subjects: [
				{
					id: "rat-1",
					name: "Cellar Rat 1",
					primary: [{ id: "act:swing", label: "Swing" }],
					more: [],
				},
			],
			onAct,
		});
		await fireEvent.click(screen.getByRole("button", { name: "1 Swing" }));
		expect(onAct).toHaveBeenCalledWith("act:swing");
	});

	it("renders a trailing menu for 'more' entries and forwards its selection", async () => {
		const onAct = vi.fn();
		render(SelectionRow, {
			title: "Selected",
			subjects: [
				{
					id: "rat-1",
					name: "Cellar Rat 1",
					primary: [],
					more: [
						{ id: "checks", label: "Checks", submenu: [{ id: "c1", label: "Check: Athletics" }] },
					],
				},
			],
			onAct,
		});
		await fireEvent.click(screen.getByRole("button", { name: "More for Cellar Rat 1" }));
		await fireEvent.click(await screen.findByText("Checks"));
		await fireEvent.click(await screen.findByText("Check: Athletics"));
		expect(onAct).toHaveBeenCalledWith("c1");
	});

	it("shows only the pressed pill as pending and disables the rest", () => {
		render(SelectionRow, {
			title: "Selected",
			subjects: [
				{
					id: "rat-1",
					name: "Cellar Rat 1",
					primary: [
						{ id: "a1", label: "Strike" },
						{ id: "a2", label: "Shove" },
					],
					more: [],
				},
			],
			onAct: vi.fn(),
			pendingActionId: "a1",
			disabled: true,
		});
		const strike = screen.getByRole("button", { name: "1 Strike" });
		const shove = screen.getByRole("button", { name: "2 Shove" });
		expect(strike.getAttribute("aria-busy")).toBe("true");
		expect(shove.hasAttribute("disabled")).toBe(true);
	});

	it("renders the note and the subtitle", () => {
		render(SelectionRow, {
			title: "Selected",
			subtitle: "east",
			subjects: [{ id: "free", name: "Free cell", primary: [], more: [] }],
			note: "Nothing is offered from here.",
			onAct: vi.fn(),
		});
		expect(screen.getByText("east")).toBeTruthy();
		expect(screen.getByText("Nothing is offered from here.")).toBeTruthy();
	});

	it("disambiguates two identically-labelled pills from different subjects via accessibleLabel", () => {
		render(SelectionRow, {
			title: "Selected",
			subjects: [
				{
					id: "rat-1",
					name: "Cellar Rat 1",
					primary: [
						{
							id: "h:melee-1",
							label: "Melee Attack",
							accessibleLabel: "Melee Attack — Cellar Rat 1",
						},
					],
					more: [],
				},
				{
					id: "rat-2",
					name: "Cellar Rat 2",
					primary: [
						{
							id: "h:melee-2",
							label: "Melee Attack",
							accessibleLabel: "Melee Attack — Cellar Rat 2",
						},
					],
					more: [],
				},
			],
			onAct: vi.fn(),
		});
		expect(screen.getByRole("button", { name: "1 Melee Attack — Cellar Rat 1" })).toBeTruthy();
		expect(screen.getByRole("button", { name: "2 Melee Attack — Cellar Rat 2" })).toBeTruthy();
		// The visible text stays the short verb, not the full accessible name.
		expect(screen.getAllByText("Melee Attack")).toHaveLength(2);
	});

	it("renders a subject with no info-card link as plain text via the default name slot", () => {
		render(SelectionRow, {
			title: "Selected",
			subjects: [{ id: "rat-1", name: "Cellar Rat 1", primary: [], more: [] }],
			onAct: vi.fn(),
		});
		expect(screen.getByText("Cellar Rat 1")).toBeTruthy();
	});
});
