import { fireEvent, render, screen, waitFor, within } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import ActionMenu from "./ActionMenu.svelte";
import type { ActionMenuEntry } from "./types";

const ITEMS: ActionMenuEntry[] = [
	{ id: "attack", label: "Attack" },
	{ id: "speak-to", label: "Speak to" },
	{
		id: "checks",
		label: "Checks",
		submenu: [
			{ id: "check:athletics", label: "Check: Athletics" },
			{ id: "check:stealth", label: "Check: Stealth" },
		],
	},
	{ id: "recruit", label: "Recruit", disabled: true, hint: "Hostile" },
];

afterEach(async () => {
	// bits-ui menus restore focus on a timeout; let it run while jsdom lives
	// (same pattern as link-menu.test.ts).
	await new Promise((resolve) => setTimeout(resolve, 50));
});

describe("ActionMenu", () => {
	it("renders a plain icon trigger named by `label`, not the glyph", () => {
		render(ActionMenu, { label: "Actions for Goblin Warrior 1", items: ITEMS });
		const trigger = screen.getByRole("button", { name: "Actions for Goblin Warrior 1" });
		expect(trigger.textContent).toContain("⋯");
	});

	it("opens a real role=menu on click, listing leaves, a submenu trigger, and a disabled entry with its hint", async () => {
		render(ActionMenu, { label: "Actions for Goblin Warrior 1", items: ITEMS });
		await fireEvent.click(screen.getByRole("button", { name: "Actions for Goblin Warrior 1" }));

		const menu = await screen.findByRole("menu");
		expect(within(menu).getByRole("menuitem", { name: "Attack" })).toBeTruthy();
		expect(within(menu).getByRole("menuitem", { name: "Speak to" })).toBeTruthy();
		const checks = within(menu).getByRole("menuitem", { name: "Checks" });
		expect(checks).toBeTruthy();
		const recruit = within(menu).getByRole("menuitem", { name: /Recruit/ });
		expect(recruit.getAttribute("data-disabled")).not.toBeNull();
		expect(within(menu).getByText("Hostile")).toBeTruthy();
	});

	it("opens the Checks submenu on click, revealing its nested entries", async () => {
		render(ActionMenu, { label: "Actions for Goblin Warrior 1", items: ITEMS });
		await fireEvent.click(screen.getByRole("button", { name: "Actions for Goblin Warrior 1" }));
		const menu = await screen.findByRole("menu");

		await fireEvent.click(within(menu).getByRole("menuitem", { name: "Checks" }));
		expect(await screen.findByRole("menuitem", { name: "Check: Athletics" })).toBeTruthy();
		expect(screen.getByRole("menuitem", { name: "Check: Stealth" })).toBeTruthy();
	});

	it("selecting a leaf entry calls onSelect with its id — never for the submenu trigger itself", async () => {
		const onSelect = vi.fn();
		render(ActionMenu, { label: "Actions for Goblin Warrior 1", items: ITEMS, onSelect });
		await fireEvent.click(screen.getByRole("button", { name: "Actions for Goblin Warrior 1" }));
		const menu = await screen.findByRole("menu");

		await fireEvent.click(within(menu).getByRole("menuitem", { name: "Attack" }));
		await waitFor(() => expect(onSelect).toHaveBeenCalledWith("attack"));
		expect(onSelect).toHaveBeenCalledTimes(1);
	});

	it("reports open/close through onOpenChange, same shape as bits-ui's own open/onOpenChange", async () => {
		const onOpenChange = vi.fn();
		render(ActionMenu, { label: "Actions for Goblin Warrior 1", items: ITEMS, onOpenChange });
		await fireEvent.click(screen.getByRole("button", { name: "Actions for Goblin Warrior 1" }));
		await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(true));

		await fireEvent.keyDown(await screen.findByRole("menu"), { key: "Escape" });
		await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
	});
});
