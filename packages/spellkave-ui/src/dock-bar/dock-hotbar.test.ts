import { fireEvent, render, screen, within } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import DockHotbar from "./dock-hotbar.svelte";
import type { DockHotbarGroup, DockHotbarPip, DockHotbarUrgent } from "./types";

afterEach(async () => {
	// bits-ui menus restore focus on a timeout; let it run while jsdom lives.
	await new Promise((resolve) => setTimeout(resolve, 50));
});

describe("DockHotbar", () => {
	it("renders groups and labels under toolbar/group roles", () => {
		const rows: DockHotbarGroup[][] = [
			[
				{ id: "here", label: "HERE", slots: [{ id: "look", label: "Look" }] },
				{ id: "me", label: "ME", slots: [{ id: "dodge", label: "Dodge" }] },
			],
		];
		render(DockHotbar, { rows, onSelect: vi.fn() });

		const toolbar = screen.getByRole("toolbar", { name: "Actions" });
		expect(toolbar).toBeTruthy();
		const here = within(toolbar).getByRole("group", { name: "HERE" });
		expect(within(here).getByRole("button", { name: "Look" })).toBeTruthy();
		const me = within(toolbar).getByRole("group", { name: "ME" });
		expect(within(me).getByRole("button", { name: "Dodge" })).toBeTruthy();
	});

	it("labels a second row 'More actions, row N'", () => {
		const rows: DockHotbarGroup[][] = [
			[{ id: "selection", label: "SELECTION", slots: [{ id: "attack", label: "Attack" }] }],
			[{ id: "here", label: "HERE", slots: [{ id: "look", label: "Look" }] }],
		];
		render(DockHotbar, { rows, onSelect: vi.fn() });

		expect(screen.getByRole("toolbar", { name: "Actions" })).toBeTruthy();
		expect(screen.getByRole("toolbar", { name: "More actions, row 2" })).toBeTruthy();
	});

	it("builds the accessible name from key and accessibleLabel", () => {
		const rows: DockHotbarGroup[][] = [
			[
				{
					id: "selection",
					label: "GOBLIN WARRIOR 1",
					slots: [
						{
							id: "attack",
							label: "Attack",
							key: "1",
							accessibleLabel: "Melee Attack — Goblin Warrior 1",
						},
					],
				},
			],
		];
		render(DockHotbar, { rows, onSelect: vi.fn() });

		expect(screen.getByRole("button", { name: "1 Melee Attack — Goblin Warrior 1" })).toBeTruthy();
	});

	it("fires onSelect with the slot id on click", async () => {
		const onSelect = vi.fn();
		const rows: DockHotbarGroup[][] = [
			[{ id: "here", label: "HERE", slots: [{ id: "look", label: "Look" }] }],
		];
		render(DockHotbar, { rows, onSelect });

		await fireEvent.click(screen.getByRole("button", { name: "Look" }));
		expect(onSelect).toHaveBeenCalledWith("look");
	});

	it("a dimmed slot does not fire, is aria-disabled, and carries the reason as its title", async () => {
		const onSelect = vi.fn();
		const rows: DockHotbarGroup[][] = [
			[
				{
					id: "selection",
					label: "GOBLIN WARRIOR 1",
					slots: [{ id: "grapple", label: "Grapple", dimmed: true, dimmedReason: "No free hand" }],
				},
			],
		];
		render(DockHotbar, { rows, onSelect });

		const button = screen.getByRole("button", { name: "Grapple" });
		expect(button.getAttribute("aria-disabled")).toBe("true");
		expect(button.getAttribute("title")).toBe("No free hand");
		await fireEvent.click(button);
		expect(onSelect).not.toHaveBeenCalled();
	});

	it("a disabled bar fires nothing from any slot", async () => {
		const onSelect = vi.fn();
		const rows: DockHotbarGroup[][] = [
			[{ id: "here", label: "HERE", slots: [{ id: "look", label: "Look" }] }],
		];
		render(DockHotbar, { rows, onSelect, disabled: true });

		await fireEvent.click(screen.getByRole("button", { name: "Look" }));
		expect(onSelect).not.toHaveBeenCalled();
	});

	it("a pending slot is aria-busy", () => {
		const rows: DockHotbarGroup[][] = [
			[
				{
					id: "selection",
					label: "SELECTION",
					slots: [{ id: "attack", label: "Attack", pending: true }],
				},
			],
		];
		render(DockHotbar, { rows, onSelect: vi.fn() });

		expect(screen.getByRole("button", { name: "Attack" }).getAttribute("aria-busy")).toBe("true");
	});

	it("an active slot is aria-pressed", () => {
		const rows: DockHotbarGroup[][] = [
			[
				{
					id: "selection",
					label: "SELECTION",
					slots: [{ id: "speak", label: "Speak", active: true }],
				},
			],
		];
		render(DockHotbar, { rows, onSelect: vi.fn() });

		expect(screen.getByRole("button", { name: "Speak" }).getAttribute("aria-pressed")).toBe("true");
	});

	it("gives each pip an accessible name naming its state, with a percent for partial", () => {
		const pips: DockHotbarPip[] = [
			{ id: "action", label: "Action", state: "available", fraction: null },
			{ id: "reaction", label: "Reaction", state: "spent", fraction: null },
			{ id: "move", label: "Move", state: "partial", fraction: 0.4 },
			{ id: "spell", label: "Spell slot", state: "pending", fraction: null },
			{ id: "unknown", label: "Ki", state: "unknown", fraction: null },
		];
		render(DockHotbar, { rows: [[]], pips, onSelect: vi.fn() });

		const list = screen.getByRole("list", { name: "Resources" });
		const items = within(list).getAllByRole("listitem");
		expect(items).toHaveLength(5);
		expect(screen.getByRole("listitem", { name: "Action: available" })).toBeTruthy();
		expect(screen.getByRole("listitem", { name: "Reaction: spent" })).toBeTruthy();
		expect(screen.getByRole("listitem", { name: "Move: partial 40%" })).toBeTruthy();
		expect(screen.getByRole("listitem", { name: "Spell slot: pending" })).toBeTruthy();
		expect(screen.getByRole("listitem", { name: "Ki: unknown" })).toBeTruthy();
	});

	it("renders no pip list when pips is omitted", () => {
		render(DockHotbar, { rows: [[]], onSelect: vi.fn() });
		expect(screen.queryByRole("list", { name: "Resources" })).toBeNull();
	});

	it("fires onToggleExpanded and reflects aria-expanded/label", async () => {
		const onToggleExpanded = vi.fn();
		const rows: DockHotbarGroup[][] = [
			[{ id: "here", label: "HERE", slots: [{ id: "look", label: "Look" }] }],
		];
		const { rerender } = render(DockHotbar, {
			rows,
			onSelect: vi.fn(),
			expanded: false,
			onToggleExpanded,
		});

		const toggle = screen.getByRole("button", { name: "Show more actions" });
		expect(toggle.getAttribute("aria-expanded")).toBe("false");
		await fireEvent.click(toggle);
		expect(onToggleExpanded).toHaveBeenCalledOnce();

		await rerender({ rows, onSelect: vi.fn(), expanded: true, onToggleExpanded });
		const collapsed = screen.getByRole("button", { name: "Show fewer actions" });
		expect(collapsed.getAttribute("aria-expanded")).toBe("true");
	});

	it("renders no toggle button when onToggleExpanded is omitted", () => {
		const rows: DockHotbarGroup[][] = [
			[{ id: "here", label: "HERE", slots: [{ id: "look", label: "Look" }] }],
		];
		render(DockHotbar, { rows, onSelect: vi.fn() });
		expect(screen.queryByRole("button", { name: "Show more actions" })).toBeNull();
	});

	it("renders nothing for an empty group", () => {
		const rows: DockHotbarGroup[][] = [
			[
				{ id: "here", label: "HERE", slots: [] },
				{ id: "me", label: "ME", slots: [{ id: "dodge", label: "Dodge" }] },
			],
		];
		render(DockHotbar, { rows, onSelect: vi.fn() });

		expect(screen.queryByRole("group", { name: "HERE" })).toBeNull();
		expect(screen.getByRole("group", { name: "ME" })).toBeTruthy();
	});

	it("renders a group with no slots but a note, showing the note text", () => {
		const rows: DockHotbarGroup[][] = [
			[
				{
					id: "selection",
					label: "GOBLIN WARRIOR 1",
					slots: [],
					note: "Nothing is offered from here.",
				},
			],
		];
		render(DockHotbar, { rows, onSelect: vi.fn() });

		const group = screen.getByRole("group", { name: "GOBLIN WARRIOR 1" });
		expect(within(group).getByText("Nothing is offered from here.")).toBeTruthy();
	});

	it("renders a group's overflow menu trigger named 'More for <label>' and hands its pick to onSelect", async () => {
		const onSelect = vi.fn();
		const rows: DockHotbarGroup[][] = [
			[
				{
					id: "selection",
					label: "GOBLIN WARRIOR 1",
					slots: [{ id: "attack", label: "Attack" }],
					more: [{ entries: [{ id: "check:perception", label: "Perception check" }] }],
				},
			],
		];
		render(DockHotbar, { rows, onSelect });

		const trigger = screen.getByRole("button", { name: "More for GOBLIN WARRIOR 1" });
		await fireEvent.keyDown(trigger, { key: "Enter" });
		const menu = await screen.findByRole("menu");
		await fireEvent.click(within(menu).getByRole("menuitem", { name: "Perception check" }));
		expect(onSelect).toHaveBeenCalledWith("check:perception");
	});
	describe("urgent", () => {
		const rows: DockHotbarGroup[][] = [
			[{ id: "me", label: "ME", slots: [{ id: "dodge", label: "Dodge", key: "1" }] }],
			[{ id: "here", label: "HERE", slots: [{ id: "look", label: "Look" }] }],
		];
		const urgent: DockHotbarUrgent = {
			title: "A moment to react",
			text: "Cellar Rat 1 attacks",
			remainingMs: 5400,
			totalMs: 6000,
			answers: [
				{ id: "reaction:react", label: "React", key: "1" },
				{ id: "reaction:pass", label: "Let it pass", key: "2" },
			],
		};

		it("replaces every action row, so no stale digit is on screen", () => {
			const onSelect = vi.fn();
			render(DockHotbar, { rows, urgent, onSelect, onToggleExpanded: vi.fn() });

			expect(screen.queryByRole("toolbar", { name: "Actions" })).toBeNull();
			expect(screen.queryByRole("toolbar", { name: "More actions, row 2" })).toBeNull();
			expect(screen.queryByRole("button", { name: "1 Dodge" })).toBeNull();
			const row = screen.getByRole("toolbar", { name: "A moment to react" });
			expect(within(row).getByRole("button", { name: "1 React" })).toBeTruthy();
			expect(within(row).getByRole("button", { name: "2 Let it pass" })).toBeTruthy();
		});

		it("announces what happens and how long is left", () => {
			render(DockHotbar, { rows, urgent, onSelect: vi.fn() });

			const status = screen.getByRole("status");
			expect(status.getAttribute("aria-live")).toBe("assertive");
			expect(status.textContent).toContain("A moment to react.");
			expect(status.textContent).toContain("Cellar Rat 1 attacks");
			expect(status.textContent).toContain("6 s");
		});

		it("answers through onSelect and keeps the resource pips", async () => {
			const onSelect = vi.fn();
			const pips: DockHotbarPip[] = [
				{ id: "reaction", label: "Reaction", state: "available", fraction: null },
			];
			render(DockHotbar, { rows, urgent, pips, onSelect });

			await fireEvent.click(screen.getByRole("button", { name: "2 Let it pass" }));
			expect(onSelect).toHaveBeenCalledWith("reaction:pass");
			expect(screen.getByRole("list", { name: "Resources" })).toBeTruthy();
		});

		it("drains from what is left of the window, and shows no bar without a countdown", () => {
			const { container, unmount } = render(DockHotbar, { rows, urgent, onSelect: vi.fn() });
			const drain = container.querySelector<HTMLElement>("[data-slot=dock-hotbar-urgent-drain]");
			expect(drain?.style.getPropertyValue("--drain-from")).toBe("0.9");
			expect(drain?.style.getPropertyValue("--drain-ms")).toBe("5400ms");
			unmount();

			const open = render(DockHotbar, {
				rows,
				urgent: { ...urgent, remainingMs: null },
				onSelect: vi.fn(),
			});
			expect(open.container.querySelector("[data-slot=dock-hotbar-urgent-drain]")).toBeNull();
			expect(screen.getByRole("status").textContent).not.toContain(" s");
		});

		it("stops answering while busy", async () => {
			const onSelect = vi.fn();
			render(DockHotbar, { rows, urgent, disabled: true, onSelect });

			await fireEvent.click(screen.getByRole("button", { name: "1 React" }));
			expect(onSelect).not.toHaveBeenCalled();
		});
	});
});
