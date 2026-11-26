import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import Pack from "./Pack.svelte";

describe("Pack", () => {
	it("select-only mode keeps item facts but offers no local actions", async () => {
		const onSelect = vi.fn();
		const onAct = vi.fn();
		render(Pack, {
			items: [{ id: "blade", name: "Blade", detail: "Item" }],
			density: "stage",
			selectionOnly: true,
			onSelect,
			onAct,
			detail: {
				id: "blade",
				description: "A fine blade.",
				facts: [],
				verbs: [{ id: "equip", label: "Equip", verb: "manipulate" }],
			},
		});
		expect(screen.getByText("A fine blade.")).toBeTruthy();
		expect(screen.queryByRole("button", { name: "Equip" })).toBeNull();
		await fireEvent.click(screen.getByRole("button", { name: "Blade" }));
		expect(onSelect).toHaveBeenCalledWith("blade");
		expect(onAct).not.toHaveBeenCalled();
	});
	it("shows supplied prose only for the selected item and renders it as text", () => {
		render(Pack, {
			items: [{ id: "1", name: "Blade", detail: "Item" }],
			density: "stage",
			detail: { id: "1", description: "<b>Authored blade</b>", facts: [], verbs: [] },
		});
		expect(screen.getByText("<b>Authored blade</b>")).toBeTruthy();
		expect(document.querySelector("b")).toBeNull();
	});
	const items = [
		{ id: "torch", name: "Torch", detail: "A pitch-wrapped brand." },
		{ id: "rations", name: "Rations", detail: "Three days of bread." },
	];
	const equippedItems = [
		{ id: "sword", name: "Longsword", detail: "A plain, well-oiled blade.", equipped: "hand" },
		{ id: "rations", name: "Rations", detail: "Three days of bread." },
	];

	it("stacks identical carried items into one row and selects the stack by its first entity", async () => {
		const onSelect = vi.fn();
		render(Pack, {
			items: [
				{ id: "r1", name: "Rations", detail: "Bread." },
				{ id: "r2", name: "Rations", detail: "Bread." },
				{ id: "r3", name: "Rations", detail: "Bread." },
				{ id: "t1", name: "Torch", detail: "A brand.", equipped: "hand" },
				{ id: "t2", name: "Torch", detail: "A brand." },
			],
			density: "stage",
			selectedId: "r2",
			onSelect,
		});
		const list = screen.getByRole("list", { name: "Pack items" });
		const names = Array.from(list.querySelectorAll("li")).map((li) =>
			li.textContent?.replace(/\s+/g, " ").trim(),
		);
		expect(names).toEqual(["Rations ×3", "Torch hand", "Torch"]);
		const stack = screen.getByRole("button", { name: /Rations/ });
		expect(stack.getAttribute("aria-pressed")).toBe("true");
		await fireEvent.click(stack);
		expect(onSelect).toHaveBeenCalledWith("r1");
	});

	it("indents rows carried inside a container and stacks per depth", () => {
		render(Pack, {
			items: [
				{ id: "p", name: "Explorer's Pack", detail: "Container", depth: 0 },
				{ id: "t1", name: "Torch", detail: "A brand.", depth: 1 },
				{ id: "t2", name: "Torch", detail: "A brand.", depth: 1 },
				{ id: "t3", name: "Torch", detail: "A brand.", depth: 0 },
			],
			density: "stage",
		});
		const list = screen.getByRole("list", { name: "Pack items" });
		const rows = Array.from(list.querySelectorAll("li button"));
		expect(rows.map((row) => row.textContent?.replace(/\s+/g, " ").trim())).toEqual([
			"Explorer's Pack",
			"Torch ×2",
			"Torch",
		]);
		expect(rows[1]?.getAttribute("style")).toContain("padding-left");
		expect(rows[2]?.getAttribute("style")).toBeNull();
	});

	it("renders pack items and inspects the first by default at stage", () => {
		render(Pack, { items, density: "stage" });
		expect(document.querySelector('[data-slot="play-pack"]')).not.toBeNull();
		expect(screen.getByRole("heading", { name: "Pack" })).toBeTruthy();
		expect(screen.getByRole("button", { name: "Torch" })).toBeTruthy();
		expect(screen.getByText(/pitch-wrapped brand/)).toBeTruthy();
	});

	it("renders strip density as a glyph, label, and worn-count datum", () => {
		render(Pack, { items: equippedItems, density: "strip" });
		expect(document.querySelector('[data-slot="play-pack"]')?.getAttribute("data-density")).toBe(
			"strip",
		);
		expect(screen.getByRole("heading", { name: "Pack" })).toBeTruthy();
		expect(screen.getByText("1 worn")).toBeTruthy();
		expect(screen.queryByRole("button", { name: "Longsword" })).toBeNull();
	});

	it("lets equipped card chips select, without rendering the full pack list", async () => {
		const onSelect = vi.fn();
		render(Pack, { items: equippedItems, density: "card", onSelect });
		expect(screen.getAllByText("Longsword").length).toBeGreaterThan(0);
		expect(screen.getByText("2 kinds · 2 pieces")).toBeTruthy();
		await fireEvent.click(screen.getByRole("button", { name: "Longsword" }));
		expect(onSelect).toHaveBeenCalledWith("sword");
		expect(screen.queryByRole("button", { name: "Rations" })).toBeNull();
	});

	it("renders stage density with the full pack list and item detail", () => {
		render(Pack, { items, density: "stage" });
		expect(screen.getByRole("button", { name: "Torch" })).toBeTruthy();
		expect(screen.getByRole("button", { name: "Rations" })).toBeTruthy();
	});

	it("renders bare chrome with no border or title row, the content unchanged", () => {
		render(Pack, { items, density: "stage", chrome: "bare" });
		const el = document.querySelector('[data-slot="play-pack"]');
		expect(el?.tagName).toBe("DIV");
		expect(el?.hasAttribute("data-play-frame")).toBe(false);
		expect(screen.queryByRole("heading", { name: "Pack" })).toBeNull();
		expect(screen.getByRole("button", { name: "Torch" })).toBeTruthy();
	});

	describe("the item detail and its verbs (sk-jay0.1.8.6)", () => {
		const detail = {
			id: "torch",
			slot: null,
			facts: [{ id: "srd/light_radius_ft", label: "Light Radius Ft", value: "20" }],
			verbs: [{ id: "h:light-torch", label: "Light", verb: "manipulate" }],
		};

		it("resets only the detail scroll when selection changes", async () => {
			const { rerender } = render(Pack, { items, density: "stage", selectedId: "torch", detail });
			const list = screen.getByRole("list", { name: "Pack items" });
			const pane = screen.getByRole("region", { name: "Selected item details" });
			list.scrollTop = 400;
			pane.scrollTop = 200;
			await rerender({
				items,
				density: "stage",
				selectedId: "rations",
				detail: { ...detail, id: "rations" },
			});
			expect(list.scrollTop).toBe(400);
			expect(pane.scrollTop).toBe(0);
			expect(pane.tabIndex).toBe(0);
		});

		it("marks the selected row aria-pressed and calls onSelect, never mutating selection itself", async () => {
			const onSelect = vi.fn();
			render(Pack, { items, density: "stage", selectedId: "rations", onSelect });
			const torchButton = screen.getByRole("button", { name: "Torch" });
			const rationsButton = screen.getByRole("button", { name: "Rations" });
			expect(torchButton.getAttribute("aria-pressed")).toBe("false");
			expect(rationsButton.getAttribute("aria-pressed")).toBe("true");

			await fireEvent.click(torchButton);
			expect(onSelect).toHaveBeenCalledWith("torch");
			// Controlled: the prop, not an internal click, decides the display —
			// `selectedId` was not re-passed, so Rations stays shown.
			expect(screen.getByText(/Three days of bread/)).toBeTruthy();
		});

		it("shows the caller's own detail — slot chip, facts and verbs — only for the currently-selected item", () => {
			render(Pack, { items, density: "stage", selectedId: "torch", detail });
			expect(screen.getByText("Light Radius Ft")).toBeTruthy();
			expect(screen.getByText("20")).toBeTruthy();
			expect(screen.getByRole("button", { name: "Light" })).toBeTruthy();
		});

		it("shows a loading state instead of a stale detail while a different item is still selected", () => {
			render(Pack, { items, density: "stage", selectedId: "rations", detail });
			expect(screen.queryByText("Light Radius Ft")).toBeNull();
			expect(screen.getByText("Loading actions on this item…")).toBeTruthy();
		});

		it("scopes an empty result to actions on the item", () => {
			render(Pack, {
				items,
				density: "stage",
				selectedId: "torch",
				detail: { ...detail, verbs: [] },
			});
			expect(screen.getByText("No actions on this item are offered here.")).toBeTruthy();
		});

		it("shows a failed state instead of the loading line once the on-demand read errors out (sk-jay0.1.8.11 item 7)", () => {
			render(Pack, {
				items,
				density: "stage",
				selectedId: "torch",
				detail: { ...detail, verbs: [], failed: true },
			});
			expect(screen.getByText("Could not load actions on this item.")).toBeTruthy();
			expect(screen.queryByText("Loading actions on this item…")).toBeNull();
			expect(screen.queryByText("No actions on this item are offered here.")).toBeNull();
		});

		it("fires a verb through onAct with the affordance handle", async () => {
			const onAct = vi.fn();
			render(Pack, { items, density: "stage", selectedId: "torch", detail, onAct });
			await fireEvent.click(screen.getByRole("button", { name: "Light" }));
			expect(onAct).toHaveBeenCalledWith("h:light-torch");
		});

		it("navigates to host-supplied other actions without invoking an item verb", async () => {
			const onAct = vi.fn();
			const onOpen = vi.fn();
			render(Pack, {
				items,
				density: "stage",
				detail: { ...detail, verbs: [] },
				onAct,
				otherActions: { label: "Other target actions", onOpen },
			});
			await fireEvent.click(screen.getByRole("button", { name: "Other target actions" }));
			expect(onOpen).toHaveBeenCalledOnce();
			expect(onAct).not.toHaveBeenCalled();
		});
	});
});
