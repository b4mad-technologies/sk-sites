import { fireEvent, render } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import BattleMap from "./BattleMap.svelte";
import { hasGridCells } from "./battle-map";

// Hand-written, not rendered through @spellkave/world-map: that package is
// not a dependency of @spellkave/ui-widgets (adding it would be a new
// package.json dependency, out of this widget's file-ownership scope), so
// this markup is a minimal stand-in that mirrors the real renderer's shape —
// a `<g data-node-id="...">` per cell, wrapping a `<rect class="grid-cell">`
// (`packages/spellkave-world-map/src/svg/render-svg.ts`).
const gridPlate = [
	'<svg viewBox="0 0 60 20">',
	'<g data-node-id="cell-a"><rect class="grid-cell" x="0" y="0" width="20" height="20" /></g>',
	'<g data-node-id="cell-b"><rect class="grid-cell" x="20" y="0" width="20" height="20" /></g>',
	'<g data-node-id="cell-c"><rect class="grid-cell" x="40" y="0" width="20" height="20" /></g>',
	"</svg>",
].join("");

// An ordinary place plate: a named `<circle class="place">`, no grid cell.
const placePlate =
	'<svg viewBox="0 0 60 20"><g data-node-id="place-1"><circle class="place" r="7" /></g></svg>';

// A 2x2 grid whose ids carry real `c_<x>_<y>` coordinates (the shape
// `render-svg.ts` actually emits — confirmed against
// `packages/spellkave-world-map`'s own fixtures), so selection-mode tests can
// exercise roving tabindex and arrow-key navigation. One cell (c_1_1) already
// carries the world's own anonymous occupant badge, to prove tokens hide it.
const coordGridPlate = [
	'<svg viewBox="0 0 40 40">',
	'<g data-node-id="battle/c_0_0"><rect class="grid-cell" x="0" y="0" width="20" height="20" /></g>',
	'<g data-node-id="battle/c_1_0"><rect class="grid-cell" x="20" y="0" width="20" height="20" /></g>',
	'<g data-node-id="battle/c_0_1"><rect class="grid-cell" x="0" y="20" width="20" height="20" /></g>',
	'<g data-node-id="battle/c_1_1"><rect class="grid-cell" x="20" y="20" width="20" height="20" />' +
		'<circle cx="30" cy="30" r="6" class="actor" /><text x="30" y="33" class="actor-label">1</text></g>',
	"</svg>",
].join("");

/**
 * jsdom has no real `PointerEvent` constructor, so `fireEvent.pointerDown`
 * falls back to a bare `Event` that never carries `clientX`/`clientY`
 * (`@testing-library/dom`'s `createEvent`: `window[EventType] || window.Event`).
 * Build the event by hand and assign the coordinates as plain own
 * properties — `Event.prototype` declares no `clientX`/`clientY` accessor to
 * conflict with, so this is a faithful stand-in for a real pointer event.
 */
function pointerLikeEvent(
	type: string,
	init: { clientX: number; clientY: number; pointerId: number },
) {
	const event = new Event(type, { bubbles: true, cancelable: true });
	Object.assign(event, init);
	return event;
}

describe("hasGridCells", () => {
	it("is true for a plate carrying grid cells", () => {
		expect(hasGridCells(gridPlate)).toBe(true);
	});

	it("is false for a plain place plate", () => {
		expect(hasGridCells(placePlate)).toBe(false);
	});
});

describe("BattleMap", () => {
	const exits = [{ handle: "s:exit:cell-b", toNodeId: "cell-b", label: "Step east" }];

	it("marks the own cell and the offered cell, leaving others untouched", () => {
		const { container } = render(BattleMap, {
			plate: gridPlate,
			ownNodeId: "cell-a",
			exits,
			onStep: vi.fn(),
			refusal: null,
		});
		const own = container.querySelector('[data-node-id="cell-a"]');
		const offered = container.querySelector('[data-node-id="cell-b"]');
		const untouched = container.querySelector('[data-node-id="cell-c"]');
		expect(own?.classList.contains("sk-battle-map-own")).toBe(true);
		expect(offered?.classList.contains("sk-battle-map-offered")).toBe(true);
		expect(offered?.getAttribute("aria-label")).toBe("Step east");
		expect(untouched?.classList.contains("sk-battle-map-offered")).toBe(false);
		expect(untouched?.classList.contains("sk-battle-map-own")).toBe(false);
	});

	it("clicking an offered cell calls onStep with its handle", async () => {
		const onStep = vi.fn();
		const { container } = render(BattleMap, {
			plate: gridPlate,
			ownNodeId: "cell-a",
			exits,
			onStep,
			refusal: null,
		});
		const offered = container.querySelector('[data-node-id="cell-b"]') as SVGGraphicsElement;
		await fireEvent.click(offered);
		expect(onStep).toHaveBeenCalledWith("s:exit:cell-b");
	});

	it("swallows the click that trails a drag past the threshold, but not a plain click", async () => {
		const onStep = vi.fn();
		const { container } = render(BattleMap, {
			plate: gridPlate,
			ownNodeId: "cell-a",
			exits,
			onStep,
			refusal: null,
		});
		const offered = container.querySelector('[data-node-id="cell-b"]') as SVGGraphicsElement;

		await fireEvent(
			offered,
			pointerLikeEvent("pointerdown", { clientX: 0, clientY: 0, pointerId: 1 }),
		);
		await fireEvent(
			offered,
			pointerLikeEvent("pointermove", { clientX: 20, clientY: 0, pointerId: 1 }),
		);
		await fireEvent(
			offered,
			pointerLikeEvent("pointerup", { clientX: 20, clientY: 0, pointerId: 1 }),
		);
		await fireEvent.click(offered);
		expect(onStep).not.toHaveBeenCalled();

		await fireEvent.click(offered);
		expect(onStep).toHaveBeenCalledWith("s:exit:cell-b");
	});

	it("pressing Enter on an offered cell calls onStep too", async () => {
		const onStep = vi.fn();
		const { container } = render(BattleMap, {
			plate: gridPlate,
			ownNodeId: "cell-a",
			exits,
			onStep,
			refusal: null,
		});
		const offered = container.querySelector('[data-node-id="cell-b"]') as SVGGraphicsElement;
		await fireEvent.keyDown(offered, { key: "Enter" });
		expect(onStep).toHaveBeenCalledWith("s:exit:cell-b");
	});

	it("does nothing for a cell that is not offered", async () => {
		const onStep = vi.fn();
		const { container } = render(BattleMap, {
			plate: gridPlate,
			ownNodeId: "cell-a",
			exits,
			onStep,
			refusal: null,
		});
		const untouched = container.querySelector('[data-node-id="cell-c"]') as SVGGraphicsElement;
		await fireEvent.click(untouched);
		await fireEvent.keyDown(untouched, { key: "Enter" });
		expect(onStep).not.toHaveBeenCalled();
	});

	it("renders a refusal line, and renders nothing when refusal is null", () => {
		const withRefusal = render(BattleMap, {
			plate: gridPlate,
			ownNodeId: "cell-a",
			exits,
			onStep: vi.fn(),
			refusal: "That cell is occupied.",
		});
		expect(withRefusal.getByText("That cell is occupied.")).toBeTruthy();
		withRefusal.unmount();

		const without = render(BattleMap, {
			plate: gridPlate,
			ownNodeId: "cell-a",
			exits,
			onStep: vi.fn(),
			refusal: null,
		});
		expect(without.queryByText("That cell is occupied.")).toBeNull();
	});
});

// Selection mode (user ruling 2026-09-19): "the map only ever SELECTS."
// Supplying `onSelectCell` switches every cell — free, occupied, own, out of
// reach — into a selector; `onStep` must never fire.
describe("BattleMap selection mode", () => {
	const exits = [{ handle: "s:exit:east", toNodeId: "battle/c_1_0", label: "Step east" }];
	const tokens = [
		{ nodeId: "battle/c_1_1", actorId: "goblin-1", name: "Goblin Minion 1", tone: "foe" as const },
		{ nodeId: "battle/c_1_1", actorId: "goblin-2", name: "Goblin Minion 2", tone: "foe" as const },
		{ nodeId: "battle/c_0_0", actorId: "hero-1", name: "You", isMe: true },
	];

	function cell(container: HTMLElement, nodeId: string) {
		return container.querySelector(`[data-node-id="${nodeId}"]`) as SVGGraphicsElement;
	}

	it.each([
		["offered", "battle/c_1_0"],
		["occupied", "battle/c_1_1"],
		["free", "battle/c_0_1"],
		["own", "battle/c_0_0"],
	])("clicking a %s cell calls onSelectCell, never onStep", async (_kind, nodeId) => {
		const onSelectCell = vi.fn();
		const onStep = vi.fn();
		const { container } = render(BattleMap, {
			plate: coordGridPlate,
			ownNodeId: "battle/c_0_0",
			exits,
			onStep,
			refusal: null,
			onSelectCell,
			tokens,
		});
		await fireEvent.click(cell(container, nodeId));
		expect(onSelectCell).toHaveBeenCalledWith(nodeId);
		expect(onStep).not.toHaveBeenCalled();
	});

	it("marks exactly one cell selected and moves the mark when the prop changes", async () => {
		const { container, rerender } = render(BattleMap, {
			plate: coordGridPlate,
			ownNodeId: "battle/c_0_0",
			exits,
			onStep: vi.fn(),
			refusal: null,
			onSelectCell: vi.fn(),
			selectedNodeId: "battle/c_0_1",
		});
		expect(cell(container, "battle/c_0_1").getAttribute("aria-pressed")).toBe("true");
		expect(cell(container, "battle/c_1_0").getAttribute("aria-pressed")).toBe("false");
		expect(cell(container, "battle/c_0_1").querySelector(".sk-battle-map-ring")).not.toBeNull();

		await rerender({
			plate: coordGridPlate,
			ownNodeId: "battle/c_0_0",
			exits,
			onStep: vi.fn(),
			refusal: null,
			onSelectCell: vi.fn(),
			selectedNodeId: "battle/c_1_1",
		});
		expect(cell(container, "battle/c_0_1").getAttribute("aria-pressed")).toBe("false");
		expect(cell(container, "battle/c_0_1").querySelector(".sk-battle-map-ring")).toBeNull();
		expect(cell(container, "battle/c_1_1").getAttribute("aria-pressed")).toBe("true");
		expect(cell(container, "battle/c_1_1").querySelector(".sk-battle-map-ring")).not.toBeNull();
	});

	it("renders occupant tokens with initials, isMe, and a +N overflow, and hides the plate's own badge", () => {
		const crowded = [
			...tokens,
			{
				nodeId: "battle/c_1_1",
				actorId: "goblin-3",
				name: "Goblin Minion 3",
				tone: "foe" as const,
			},
			{
				nodeId: "battle/c_1_1",
				actorId: "goblin-4",
				name: "Goblin Minion 4",
				tone: "foe" as const,
			},
		];
		const { container } = render(BattleMap, {
			plate: coordGridPlate,
			ownNodeId: "battle/c_0_0",
			exits,
			onStep: vi.fn(),
			refusal: null,
			onSelectCell: vi.fn(),
			tokens: crowded,
		});
		const crowdedCell = cell(container, "battle/c_1_1");
		expect(crowdedCell.classList.contains("sk-battle-map-has-tokens")).toBe(true);
		const discs = crowdedCell.querySelectorAll(".sk-battle-map-token");
		expect(discs).toHaveLength(4);
		expect(discs[0]?.querySelector("title")?.textContent).toBe("Goblin Minion 1");
		expect(discs[0]?.querySelector(".sk-battle-map-token-label")?.textContent).toBe("GM");
		expect(
			crowdedCell.querySelector(".sk-battle-map-token--overflow .sk-battle-map-token-label")
				?.textContent,
		).toBe("+1");

		const ownCell = cell(container, "battle/c_0_0");
		expect(ownCell.querySelector(".sk-battle-map-token--me")).not.toBeNull();
	});

	it("draws a token's picture on its disc and keeps the initials disc for a token without one", () => {
		const { container } = render(BattleMap, {
			plate: coordGridPlate,
			ownNodeId: "battle/c_0_0",
			exits,
			onStep: vi.fn(),
			refusal: null,
			onSelectCell: vi.fn(),
			tokens: [
				{
					nodeId: "battle/c_1_1",
					actorId: "rat-1",
					name: "Giant Rat",
					tone: "foe" as const,
					image: "/art/giant-rat.webp",
				},
				{ nodeId: "battle/c_0_0", actorId: "hero-1", name: "You", isMe: true },
			],
		});
		const withArt = cell(container, "battle/c_1_1").querySelector(".sk-battle-map-token");
		const art = withArt?.querySelector("image.sk-battle-map-token-art");
		expect(art?.getAttribute("href")).toBe("/art/giant-rat.webp");
		expect(withArt?.classList.contains("sk-battle-map-token--art")).toBe(true);
		// The tone rim and the name stay with the picture.
		expect(withArt?.classList.contains("sk-battle-map-token--foe")).toBe(true);
		expect(withArt?.querySelector("title")?.textContent).toBe("Giant Rat");

		const plain = cell(container, "battle/c_0_0").querySelector(".sk-battle-map-token");
		expect(plain?.querySelector("image")).toBeNull();
		expect(plain?.classList.contains("sk-battle-map-token--art")).toBe(false);
		expect(plain?.querySelector(".sk-battle-map-token-label")?.textContent).toBe("YO");
	});

	it("falls back to the initials disc when a token's picture fails to load", async () => {
		const { container } = render(BattleMap, {
			plate: coordGridPlate,
			ownNodeId: "battle/c_0_0",
			exits,
			onStep: vi.fn(),
			refusal: null,
			onSelectCell: vi.fn(),
			tokens: [
				{
					nodeId: "battle/c_1_1",
					actorId: "rat-1",
					name: "Giant Rat",
					tone: "foe" as const,
					image: "/missing.webp",
				},
			],
		});
		const disc = cell(container, "battle/c_1_1").querySelector(
			".sk-battle-map-token",
		) as SVGGElement;
		await fireEvent.error(disc.querySelector("image") as SVGImageElement);
		expect(disc.querySelector("image")).toBeNull();
		expect(disc.classList.contains("sk-battle-map-token--art")).toBe(false);
		expect(disc.querySelector(".sk-battle-map-token-label")?.textContent).toBe("GR");
	});

	it("builds the accessible name from occupants, own cell, and reachability", () => {
		const { container } = render(BattleMap, {
			plate: coordGridPlate,
			ownNodeId: "battle/c_0_0",
			exits,
			onStep: vi.fn(),
			refusal: null,
			onSelectCell: vi.fn(),
			tokens,
		});
		expect(cell(container, "battle/c_0_0").getAttribute("aria-label")).toBe("Your cell");
		expect(cell(container, "battle/c_0_1").getAttribute("aria-label")).toBe("Free cell");
		expect(cell(container, "battle/c_1_0").getAttribute("aria-label")).toBe("Free cell, reachable");
		expect(cell(container, "battle/c_1_1").getAttribute("aria-label")).toBe(
			"Goblin Minion 1 and Goblin Minion 2",
		);
	});

	it("swallows a drag's trailing click without selecting, but selects a plain click", async () => {
		const onSelectCell = vi.fn();
		const { container } = render(BattleMap, {
			plate: coordGridPlate,
			ownNodeId: "battle/c_0_0",
			exits,
			onStep: vi.fn(),
			refusal: null,
			onSelectCell,
		});
		const target = cell(container, "battle/c_0_1");

		await fireEvent(
			target,
			pointerLikeEvent("pointerdown", { clientX: 0, clientY: 0, pointerId: 1 }),
		);
		await fireEvent(
			target,
			pointerLikeEvent("pointermove", { clientX: 20, clientY: 0, pointerId: 1 }),
		);
		await fireEvent(
			target,
			pointerLikeEvent("pointerup", { clientX: 20, clientY: 0, pointerId: 1 }),
		);
		await fireEvent.click(target);
		expect(onSelectCell).not.toHaveBeenCalled();

		await fireEvent.click(target);
		expect(onSelectCell).toHaveBeenCalledWith("battle/c_0_1");
	});

	it("zooms with the + and − buttons and disables them at the limits", async () => {
		const { container, getByRole } = render(BattleMap, {
			plate: coordGridPlate,
			ownNodeId: "battle/c_0_0",
			exits,
			onStep: vi.fn(),
			refusal: null,
			onSelectCell: vi.fn(),
		});
		const plate = container.querySelector(".sk-battle-map-plate") as HTMLElement;
		const zoomIn = getByRole("button", { name: "Zoom in" }) as HTMLButtonElement;
		const zoomOut = getByRole("button", { name: "Zoom out" }) as HTMLButtonElement;
		expect(plate.style.transform).toContain("scale(1)");
		await fireEvent.click(zoomIn);
		expect(plate.style.transform).toContain("scale(1.25)");
		for (let i = 0; i < 20; i++) await fireEvent.click(zoomIn);
		expect(plate.style.transform).toContain("scale(4)");
		expect(zoomIn.disabled).toBe(true);
		for (let i = 0; i < 20; i++) await fireEvent.click(zoomOut);
		expect(plate.style.transform).toContain("scale(0.5)");
		expect(zoomOut.disabled).toBe(true);
	});

	it("keeps pan and zoom across a remount when the host passes a viewKey, and starts fresh without one", async () => {
		const props = {
			plate: coordGridPlate,
			ownNodeId: "battle/c_0_0",
			exits,
			onStep: vi.fn(),
			refusal: null,
			onSelectCell: vi.fn(),
		};
		const first = render(BattleMap, { ...props, viewKey: "fight:test-remount" });
		await fireEvent.click(first.getByRole("button", { name: "Zoom in" }));
		await fireEvent.click(first.getByRole("button", { name: "Zoom in" }));
		first.unmount();

		// Play drops the plate for a moment on every map reload, so the widget
		// really is torn down and built again between two turns.
		const second = render(BattleMap, { ...props, viewKey: "fight:test-remount" });
		const plate = second.container.querySelector(".sk-battle-map-plate") as HTMLElement;
		expect(plate.style.transform).toContain("scale(1.5)");
		await fireEvent.click(second.getByRole("button", { name: "Reset view" }));
		expect(plate.style.transform).toContain("scale(1)");
		second.unmount();

		const unkeyed = render(BattleMap, props);
		const fresh = unkeyed.container.querySelector(".sk-battle-map-plate") as HTMLElement;
		expect(fresh.style.transform).toContain("scale(1)");
	});

	it("does not capture the pointer on a plain press — a captured pointer retargets the click away from the cell", async () => {
		// Regression: `setPointerCapture` on pointerdown made a real browser
		// dispatch the following `click` to the capturing viewport element, an
		// ancestor of the plate, so no cell could be selected with a mouse.
		// jsdom cannot retarget, so assert the cause: capture starts only once
		// the pointer has really dragged past the threshold.
		const capture = vi.fn();
		const original = (HTMLElement.prototype as { setPointerCapture?: unknown }).setPointerCapture;
		(HTMLElement.prototype as { setPointerCapture?: unknown }).setPointerCapture = capture;
		try {
			const { container } = render(BattleMap, {
				plate: coordGridPlate,
				ownNodeId: "battle/c_0_0",
				exits,
				onStep: vi.fn(),
				refusal: null,
				onSelectCell: vi.fn(),
			});
			const target = cell(container, "battle/c_0_1");
			await fireEvent(
				target,
				pointerLikeEvent("pointerdown", { clientX: 0, clientY: 0, pointerId: 7 }),
			);
			await fireEvent(
				target,
				pointerLikeEvent("pointermove", { clientX: 2, clientY: 1, pointerId: 7 }),
			);
			expect(capture).not.toHaveBeenCalled();
			await fireEvent(
				target,
				pointerLikeEvent("pointermove", { clientX: 20, clientY: 0, pointerId: 7 }),
			);
			expect(capture).toHaveBeenCalledWith(7);
		} finally {
			(HTMLElement.prototype as { setPointerCapture?: unknown }).setPointerCapture = original;
		}
	});

	it("keeps exactly one roving tabindex entry and moves it with arrow keys, when ids carry grid coordinates", async () => {
		const { container } = render(BattleMap, {
			plate: coordGridPlate,
			ownNodeId: "battle/c_0_0",
			exits,
			onStep: vi.fn(),
			refusal: null,
			onSelectCell: vi.fn(),
		});
		const tabbable = Array.from(container.querySelectorAll('[data-node-id][tabindex="0"]'));
		expect(tabbable).toHaveLength(1);
		expect(tabbable[0]).toBe(cell(container, "battle/c_0_0"));

		await fireEvent.keyDown(cell(container, "battle/c_0_0"), { key: "ArrowRight" });
		expect(cell(container, "battle/c_0_0").getAttribute("tabindex")).toBe("-1");
		expect(cell(container, "battle/c_1_0").getAttribute("tabindex")).toBe("0");
	});

	it("falls back to a plain Tab order when node ids carry no grid coordinates", () => {
		const { container } = render(BattleMap, {
			plate: gridPlate,
			ownNodeId: "cell-a",
			exits: [],
			onStep: vi.fn(),
			refusal: null,
			onSelectCell: vi.fn(),
		});
		for (const id of ["cell-a", "cell-b", "cell-c"]) {
			expect(cell(container, id).getAttribute("tabindex")).toBe("0");
		}
	});

	it("legacy mode (no onSelectCell) is unaffected: offered cells still step, others stay inert", async () => {
		const onStep = vi.fn();
		const { container } = render(BattleMap, {
			plate: coordGridPlate,
			ownNodeId: "battle/c_0_0",
			exits,
			onStep,
			refusal: null,
		});
		await fireEvent.click(cell(container, "battle/c_1_0"));
		expect(onStep).toHaveBeenCalledWith("s:exit:east");
		expect(cell(container, "battle/c_0_1").hasAttribute("role")).toBe(false);
		expect(cell(container, "battle/c_0_0").hasAttribute("role")).toBe(false);
	});

	it("frames the grid, not the parent place the plate was composed over (sk-jay0.1.8.63.42)", () => {
		const composed = [
			'<svg viewBox="0 0 900 600">',
			'<g data-node-id="tomb/antechamber"><circle class="place" cx="100" cy="100" r="7" /></g>',
			'<g data-node-id="grid/c_0_0"><rect x="400" y="120" width="10" height="10" class="grid-cell" /></g>',
			'<g data-node-id="grid/c_1_0"><rect x="410" y="120" width="10" height="10" class="grid-cell" /></g>',
			"</svg>",
		].join("");
		const { container } = render(BattleMap, {
			plate: composed,
			ownNodeId: "grid/c_0_0",
			exits: [],
			onStep: vi.fn(),
			refusal: null,
		});
		expect(container.querySelector("svg")?.getAttribute("viewBox")).toBe("395 115 30 20");
	});
});
