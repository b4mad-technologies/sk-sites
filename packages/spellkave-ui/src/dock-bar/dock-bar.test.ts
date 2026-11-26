import { fireEvent, render, screen, waitFor, within } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import DockBarAction from "./dock-bar-action.svelte";
import DockBarDivider from "./dock-bar-divider.svelte";
import Harness from "./dock-bar-test-harness.svelte";
import DockBarText from "./dock-bar-text.svelte";
import type { DockBarMenuProps } from "./types";

afterEach(async () => {
	// bits-ui menus restore focus on a timeout; let it run while jsdom lives.
	await new Promise((resolve) => setTimeout(resolve, 50));
});

describe("DockBarMenu", () => {
	it("opens and lists every entry as a menuitem", async () => {
		render(Harness, {
			menus: [
				{
					label: "Ways out",
					sections: [{ entries: [{ id: "exit:1", label: "Village Square", hint: "north" }] }],
				},
			],
		});

		await fireEvent.keyDown(screen.getByRole("button", { name: "Ways out" }), { key: "Enter" });
		const menu = await screen.findByRole("menu");
		const items = within(menu).getAllByRole("menuitem");
		expect(items).toHaveLength(1);
	});

	it("renders a separator between sections", async () => {
		render(Harness, {
			menus: [
				{
					label: "More…",
					sections: [
						{ entries: [{ id: "a:1", label: "Rest" }] },
						{ entries: [{ id: "a:2", label: "Search" }] },
					],
				},
			],
		});

		await fireEvent.keyDown(screen.getByRole("button", { name: "More…" }), { key: "Enter" });
		const menu = await screen.findByRole("menu");
		expect(menu.querySelector('[data-slot="dock-bar-separator"]')).toBeTruthy();
		expect(within(menu).getAllByRole("menuitem")).toHaveLength(2);
	});

	it("renders a hint next to its entry", async () => {
		render(Harness, {
			menus: [
				{
					label: "Ways out",
					sections: [{ entries: [{ id: "exit:1", label: "Village Square", hint: "north" }] }],
				},
			],
		});

		await fireEvent.keyDown(screen.getByRole("button", { name: "Ways out" }), { key: "Enter" });
		await waitFor(() => expect(screen.getByRole("menu")).toBeTruthy());
		expect(screen.getByText("north")).toBeTruthy();
	});

	it("hands the chosen leaf id to onSelect", async () => {
		const onSelect = vi.fn();
		render(Harness, {
			menus: [
				{
					label: "Ways out",
					sections: [{ entries: [{ id: "exit:1", label: "Village Square" }] }],
					onSelect,
				},
			],
		});

		await fireEvent.keyDown(screen.getByRole("button", { name: "Ways out" }), { key: "Enter" });
		const menu = await screen.findByRole("menu");
		await fireEvent.click(within(menu).getByRole("menuitem"));
		await waitFor(() => expect(onSelect).toHaveBeenCalledWith("exit:1"));
	});

	it("opens a submenu on click and hands the chosen submenu id to onSelect", async () => {
		const onSelect = vi.fn();
		render(Harness, {
			menus: [
				{
					label: "More…",
					sections: [
						{
							entries: [
								{
									id: "group:cellar-rat",
									label: "Cellar Rat",
									submenu: [{ id: "a:attack", label: "Attack" }],
								},
							],
						},
					],
					onSelect,
				},
			],
		});

		await fireEvent.keyDown(screen.getByRole("button", { name: "More…" }), { key: "Enter" });
		const subTrigger = await screen.findByRole("menuitem", { name: "Cellar Rat" });
		await fireEvent.click(subTrigger);
		const subItem = await screen.findByRole("menuitem", { name: "Attack" });
		await fireEvent.click(subItem);
		await waitFor(() => expect(onSelect).toHaveBeenCalledWith("a:attack"));
	});

	it("uses accessibleLabel as the trigger's accessible name when given", async () => {
		render(Harness, {
			menus: [
				{
					label: "…",
					accessibleLabel: "More actions",
					sections: [{ entries: [{ id: "a:end-turn", label: "End turn" }] }],
				},
			],
		});

		expect(screen.getByRole("button", { name: "More actions" })).toBeTruthy();
	});

	it("renders a custom trigger snippet and still opens the menu", async () => {
		render(Harness, {
			menus: [
				{
					accessibleLabel: "Seat menu",
					trigger: createRawSnippet(() => ({
						render: () => `<span data-testid="custom-trigger">A</span>`,
					})),
					sections: [{ entries: [{ id: "sign-out", label: "Sign out" }] }],
				},
			],
		});

		const button = screen.getByRole("button", { name: "Seat menu" });
		expect(screen.getByTestId("custom-trigger")).toBeTruthy();
		expect(button.textContent).not.toContain("▴");

		await fireEvent.keyDown(button, { key: "Enter" });
		await waitFor(() => expect(screen.getByRole("menu")).toBeTruthy());
		expect(screen.getByRole("menuitem", { name: "Sign out" })).toBeTruthy();
	});

	it("shows a ▴ next to a plain label title", () => {
		render(Harness, {
			menus: [
				{ label: "Ways out", sections: [{ entries: [{ id: "exit:1", label: "Village Square" }] }] },
			],
		});

		expect(screen.getByRole("button", { name: "Ways out" }).textContent).toContain("▴");
	});

	it("opens each menu from its own button", async () => {
		const menus: DockBarMenuProps[] = [
			{ label: "Ways out", sections: [{ entries: [{ id: "exit:1", label: "Village Square" }] }] },
			{ label: "More…", sections: [{ entries: [{ id: "a:rest", label: "Rest" }] }] },
		];
		render(Harness, { menus });

		await fireEvent.keyDown(screen.getByRole("button", { name: "Ways out" }), { key: "Enter" });
		const firstMenu = await screen.findByRole("menu");
		expect(within(firstMenu).getByRole("menuitem", { name: "Village Square" })).toBeTruthy();

		await fireEvent.keyDown(screen.getByRole("button", { name: "More…" }), { key: "Enter" });
		await waitFor(() => expect(screen.getByRole("menuitem", { name: "Rest" })).toBeTruthy());
		expect(firstMenu).toBeTruthy();
	});
});

describe("DockBarAction", () => {
	it("has 'key label' as its accessible name and fires onclick", async () => {
		const onclick = vi.fn();
		render(DockBarAction, { label: "Fighter", key: 1, onclick });

		const button = screen.getByRole("button", { name: "1 Fighter" });
		await fireEvent.click(button);
		expect(onclick).toHaveBeenCalledOnce();
	});

	it("does not fire onclick while disabled", async () => {
		const onclick = vi.fn();
		render(DockBarAction, { label: "Rest", disabled: true, onclick });

		await fireEvent.click(screen.getByRole("button", { name: "Rest" }));
		expect(onclick).not.toHaveBeenCalled();
	});

	it("a disabled, non-pending action looks unchanged (no opacity-50 class)", () => {
		render(DockBarAction, { label: "Rest", disabled: true, onclick: vi.fn() });
		expect(screen.getByRole("button", { name: "Rest" }).className).not.toContain("opacity-50");
	});

	it("is aria-busy and does not fire onclick while pending", async () => {
		const onclick = vi.fn();
		render(DockBarAction, { label: "Defend", pending: true, onclick });

		const button = screen.getByRole("button", { name: "Defend" });
		expect(button.getAttribute("aria-busy")).toBe("true");
		await fireEvent.click(button);
		expect(onclick).not.toHaveBeenCalled();
	});
});

describe("DockBarText", () => {
	it("renders chip tone content", () => {
		render(DockBarText, {
			tone: "chip",
			children: createRawSnippet(() => ({ render: () => "<span>Poisoned</span>" })),
		});

		expect(screen.getByText("Poisoned")).toBeTruthy();
	});
});

describe("DockBarDivider", () => {
	it("is aria-hidden", () => {
		render(DockBarDivider);
		expect(document.querySelector('[aria-hidden="true"]')).toBeTruthy();
	});
});
