import { readFileSync } from "node:fs";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { describe, expect, it, vi } from "vitest";
import PlaceMap from "./PlaceMap.svelte";
import { sanitiseSvg } from "./svg";

// jsdom has no PointerEvent constructor, so testing-library falls back to an
// Event without position or pointer identity. The map's drag contract needs
// both, exactly as BattleMap's interaction tests do.
function pointerLikeEvent(
	type: string,
	init: { clientX: number; clientY: number; pointerId: number; button?: number },
) {
	const event = new Event(type, { bubbles: true, cancelable: true });
	Object.assign(event, init);
	return event;
}

describe("PlaceMap", () => {
	const frame = {
		mode: "peek" as const,
		placeName: "The Mountain View Inn · Common Room",
		caption: "Current place peek.",
		svg: '<svg viewBox="0 0 100 80"><circle cx="50" cy="40" r="5" /></svg>',
	};

	it.each([
		"loading",
		"empty",
		"failed",
	] as const)("shows place and exits instead of a decorative map when %s", (state) => {
		render(PlaceMap, {
			frame: {
				...frame,
				svg: undefined,
				state,
				description: "A quiet room above the inn.",
				nearby: ["Stairs"],
			},
		});
		expect(screen.queryByRole("img")).toBeNull();
		expect(screen.getByText("A quiet room above the inn.")).toBeTruthy();
		expect(screen.getByText("Exits: Stairs")).toBeTruthy();
		expect(screen.getByRole("status")).toBeTruthy();
	});

	it("renders a map peek with place caption", () => {
		render(PlaceMap, { frame });
		expect(document.querySelector('[data-slot="play-map"]')).not.toBeNull();
		expect(screen.getByRole("heading", { name: "Map peek" })).toBeTruthy();
		expect(screen.getByRole("img", { name: /Mountain View Inn/ })).toBeTruthy();
	});

	it("renders strip density as a glyph, label, and place-name datum", () => {
		render(PlaceMap, { frame, density: "strip" });
		expect(document.querySelector('[data-slot="play-map"]')?.getAttribute("data-density")).toBe(
			"strip",
		);
		expect(screen.getByRole("heading", { name: "Map peek" })).toBeTruthy();
		expect(screen.getByText(frame.placeName)).toBeTruthy();
		expect(document.querySelector(".sk-play-map")).toBeNull();
	});

	it("renders card and stage density with the map plate", () => {
		const card = render(PlaceMap, { frame, density: "card" });
		expect(card.container.querySelector(".sk-play-map--dense")).not.toBeNull();
		card.unmount();

		const stage = render(PlaceMap, { frame, density: "stage" });
		expect(stage.container.querySelector(".sk-play-map--dense")).toBeNull();
	});

	it("offers compact zoom controls for a drawn place map", async () => {
		render(PlaceMap, { frame, density: "card" });
		const zoomOut = screen.getByRole("button", { name: "Zoom out" }) as HTMLButtonElement;
		const zoomIn = screen.getByRole("button", { name: "Zoom in" });
		expect(zoomOut.disabled).toBe(true);
		await fireEvent.click(zoomIn);
		expect(zoomOut.disabled).toBe(false);
		expect(document.querySelector(".sk-play-map")?.getAttribute("style")).toContain(
			"--sk-play-map-zoom: 1.25",
		);
		const map = document.querySelector(".sk-play-map");
		if (!map) throw new Error("map plate");
		await fireEvent.wheel(map, { deltaY: -20, clientX: 20, clientY: 20 });
		expect(document.querySelector(".sk-play-map")?.getAttribute("style")).toContain(
			"--sk-play-map-zoom: 1.5",
		);
		await fireEvent.click(screen.getByRole("button", { name: "Reset map view" }));
		await fireEvent(
			map,
			pointerLikeEvent("pointerdown", { button: 0, pointerId: 1, clientX: 20, clientY: 20 }),
		);
		await fireEvent(
			map,
			pointerLikeEvent("pointermove", { pointerId: 1, clientX: 44, clientY: 32 }),
		);
		await fireEvent(map, pointerLikeEvent("pointerup", { pointerId: 1, clientX: 44, clientY: 32 }));
		expect(map.getAttribute("style")).toContain("--sk-play-map-pan-x: 24px");
		await fireEvent.click(screen.getByRole("button", { name: "Reset map view" }));
		expect(document.querySelector(".sk-play-map")?.getAttribute("style")).toContain(
			"--sk-play-map-zoom: 1",
		);
	});

	it("captures only a drag, preserving an ordinary place click's SVG target", async () => {
		const { container } = render(PlaceMap, { frame });
		const map = container.querySelector(".sk-play-map") as HTMLDivElement;
		const capture = vi.fn();
		Object.assign(map, { setPointerCapture: capture });
		await fireEvent(
			map,
			pointerLikeEvent("pointerdown", { button: 0, pointerId: 1, clientX: 20, clientY: 20 }),
		);
		expect(capture).not.toHaveBeenCalled();
		await fireEvent(
			map,
			pointerLikeEvent("pointermove", { pointerId: 1, clientX: 28, clientY: 20 }),
		);
		expect(capture).toHaveBeenCalledWith(1);
	});

	it("renders bare chrome with no border, title row, or duplicate place name", () => {
		render(PlaceMap, { frame, density: "card", chrome: "bare" });
		const el = document.querySelector('[data-slot="play-map"]');
		expect(el?.tagName).toBe("DIV");
		expect(el?.hasAttribute("data-play-frame")).toBe(false);
		expect(screen.queryByRole("heading", { name: "Map peek" })).toBeNull();
		expect(screen.getByRole("img", { name: /Mountain View Inn/ })).toBeTruthy();
		expect(screen.queryByText(frame.placeName)).toBeNull();
	});

	it("keeps its framing when the host hands over an equal but new frame object", async () => {
		const bbox = { x: 40, y: 30, width: 20, height: 20 } as DOMRect;
		// jsdom has no getBBox; the framing effect bails without one.
		const proto = SVGElement.prototype as unknown as { getBBox?: () => DOMRect };
		proto.getBBox = () => bbox;
		try {
			const framed = {
				...frame,
				focusNodeId: "n1",
				svg: '<svg viewBox="0 0 100 80"><g data-node-id="n1"><circle class="place" cx="50" cy="40" r="5" /><text class="label" x="50">Room</text></g></svg>',
			};
			const { container, rerender } = render(PlaceMap, { frame: framed, density: "card" });
			const svg = container.querySelector("svg")!;
			await tick();
			const framedBox = svg.getAttribute("viewBox");
			expect(framedBox).not.toBe("0 0 100 80");
			const seen: string[] = [];
			const observer = new MutationObserver((list) => {
				for (const m of list) seen.push(`${(m.target as Element).tagName}@${m.attributeName}`);
			});
			observer.observe(svg, { attributes: true, subtree: true });

			await rerender({ frame: { ...framed }, density: "card" });
			await tick();
			observer.disconnect();
			expect(seen).toEqual([]);
			expect(svg.getAttribute("viewBox")).toBe(framedBox);
		} finally {
			delete proto.getBBox;
		}
	});
});

describe("PlaceMap click-to-travel", () => {
	// A `full` plate with the current place and two neighbours, matching the
	// world's own `<g data-node-id>` / `.place` / `text.label` shape
	// (render-svg.ts).
	const travelFrame = {
		mode: "full" as const,
		placeName: "Common Room",
		caption: "Neighbouring places.",
		focusNodeId: "common-room",
		svg: [
			'<svg viewBox="0 0 120 60">',
			'<g data-node-id="common-room"><circle class="place" cx="20" cy="30" r="7" /><text class="label" x="20" y="46">Common Room</text></g>',
			'<g data-node-id="cellar"><circle class="place" cx="60" cy="30" r="7" /><text class="label" x="60" y="46">Cellar</text></g>',
			'<g data-node-id="foyer"><circle class="place" cx="100" cy="30" r="7" /><text class="label" x="100" y="46">Foyer</text></g>',
			"</svg>",
		].join(""),
	};
	const travelExits = [
		{ handle: "s:exit:cellar", toNodeId: "cellar", label: "Cellar" },
		{ handle: "s:exit:foyer", toNodeId: "foyer", label: "Foyer" },
	];

	it("marks only nodes matching an exit, leaving the current place and unmatched nodes untouched", () => {
		const { container } = render(PlaceMap, {
			frame: travelFrame,
			exits: travelExits,
			onTravel: vi.fn(),
		});
		const current = container.querySelector('[data-node-id="common-room"]');
		const cellar = container.querySelector('[data-node-id="cellar"]');
		const foyer = container.querySelector('[data-node-id="foyer"]');
		expect(current?.classList.contains("sk-play-map-travel")).toBe(false);
		expect(current?.hasAttribute("role")).toBe(false);
		expect(cellar?.getAttribute("role")).toBe("button");
		expect(cellar?.getAttribute("tabindex")).toBe("0");
		expect(cellar?.getAttribute("aria-label")).toBe("Go to Cellar");
		expect(cellar?.getAttribute("data-travel-handle")).toBe("s:exit:cellar");
		expect(foyer?.getAttribute("aria-label")).toBe("Go to Foyer");
	});

	it("uses the first exit when two exits target the same node", () => {
		const duplicate = [
			{ handle: "s:exit:cellar-a", toNodeId: "cellar", label: "Cellar (kitchen side)" },
			{ handle: "s:exit:cellar-b", toNodeId: "cellar", label: "Cellar (stairs side)" },
		];
		const { container } = render(PlaceMap, {
			frame: travelFrame,
			exits: duplicate,
			onTravel: vi.fn(),
		});
		const cellar = container.querySelector('[data-node-id="cellar"]');
		expect(cellar?.getAttribute("data-travel-handle")).toBe("s:exit:cellar-a");
	});

	it("click, Enter, and Space each activate a travel target", async () => {
		const onTravel = vi.fn();
		const { container } = render(PlaceMap, { frame: travelFrame, exits: travelExits, onTravel });
		const cellar = container.querySelector('[data-node-id="cellar"]') as SVGGraphicsElement;
		await fireEvent.click(cellar);
		expect(onTravel).toHaveBeenCalledWith("s:exit:cellar");

		const foyer = container.querySelector('[data-node-id="foyer"]') as SVGGraphicsElement;
		await fireEvent.keyDown(foyer, { key: "Enter" });
		expect(onTravel).toHaveBeenCalledWith("s:exit:foyer");

		onTravel.mockClear();
		await fireEvent.keyDown(foyer, { key: " " });
		expect(onTravel).toHaveBeenCalledWith("s:exit:foyer");
	});

	it("does not select a travel target after dragging the map", async () => {
		const onTravel = vi.fn();
		const { container } = render(PlaceMap, { frame: travelFrame, exits: travelExits, onTravel });
		const map = container.querySelector(".sk-play-map");
		if (!map) throw new Error("map plate");
		const cellar = container.querySelector('[data-node-id="cellar"]') as SVGGraphicsElement;
		await fireEvent(
			cellar,
			pointerLikeEvent("pointerdown", { button: 0, pointerId: 1, clientX: 20, clientY: 20 }),
		);
		await fireEvent(
			map,
			pointerLikeEvent("pointermove", { pointerId: 1, clientX: 40, clientY: 20 }),
		);
		await fireEvent(map, pointerLikeEvent("pointerup", { pointerId: 1, clientX: 40, clientY: 20 }));
		await fireEvent.click(cellar);
		expect(onTravel).not.toHaveBeenCalled();
	});

	it("marks the pending exit's node aria-busy and blocks all activation while pending", async () => {
		const onTravel = vi.fn();
		const { container } = render(PlaceMap, {
			frame: travelFrame,
			exits: travelExits,
			onTravel,
			pendingHandle: "s:exit:cellar",
		});
		const cellar = container.querySelector('[data-node-id="cellar"]');
		const foyer = container.querySelector('[data-node-id="foyer"]') as SVGGraphicsElement;
		expect(cellar?.getAttribute("aria-busy")).toBe("true");
		await fireEvent.click(foyer);
		expect(onTravel).not.toHaveBeenCalled();
	});

	it("keeps nodes visible as targets but blocks activation when disabled", async () => {
		const onTravel = vi.fn();
		const { container } = render(PlaceMap, {
			frame: travelFrame,
			exits: travelExits,
			onTravel,
			disabled: true,
		});
		const cellar = container.querySelector('[data-node-id="cellar"]') as SVGGraphicsElement;
		expect(cellar.getAttribute("role")).toBe("button");
		expect(cellar.getAttribute("aria-disabled")).toBe("true");
		await fireEvent.click(cellar);
		expect(onTravel).not.toHaveBeenCalled();
	});

	it("leaves the plate inert when no onTravel is supplied", () => {
		const { container } = render(PlaceMap, { frame: travelFrame, exits: travelExits });
		const cellar = container.querySelector('[data-node-id="cellar"]');
		expect(cellar?.classList.contains("sk-play-map-travel")).toBe(false);
		expect(cellar?.hasAttribute("role")).toBe(false);
	});

	it("re-marks the plate when exits change", async () => {
		const onTravel = vi.fn();
		const { container, rerender } = render(PlaceMap, {
			frame: travelFrame,
			exits: [travelExits[0]!],
			onTravel,
		});
		expect(container.querySelector('[data-node-id="cellar"]')?.getAttribute("role")).toBe("button");
		expect(container.querySelector('[data-node-id="foyer"]')?.hasAttribute("role")).toBe(false);

		await rerender({ frame: travelFrame, exits: travelExits, onTravel });
		await tick();
		expect(container.querySelector('[data-node-id="foyer"]')?.getAttribute("role")).toBe("button");
	});

	describe("card density hides the print document's chrome", () => {
		const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
		const source = read("./PlaceMap.svelte");
		const fixture = read("./fixtures/sample-place-z0.svg");

		it("targets exactly the ground rect, title bar and legend the renderer emits", () => {
			// Selectors are pinned against a sample in the renderer's output shape.
			expect(fixture).toContain('<rect width="100%" height="100%"');
			expect(fixture).toContain('<g class="title-bar">');
			expect(fixture).toContain('class="map-chrome" data-chrome="legend"');
			const hide =
				source.match(/:global\(\.sk-play-map--dense > svg[^{]*\{\s*display: none;/s)?.[0] ?? "";
			expect(hide).toContain('rect[width="100%"]');
			expect(hide).toContain(".title-bar");
			expect(hide).toContain(".map-chrome");
		});

		it("restyles dense labels from theme tokens", () => {
			expect(source).toMatch(
				/\.sk-play-map--dense > svg \.label\)\s*\{[^}]*fill: var\(--foreground\)[^}]*stroke: var\(--background\)/s,
			);
		});

		it("hides the label's floor suffix at card density only (sk-jay0.4.21)", () => {
			// The renderer wraps the suffix in tspan.label-floor; the card hides it
			// by class, never by parsing label text. The markup is pinned against a
			// sample elevation_band slice at z=-3: the separating space sits in the
			// parent text node, not in the tspan.
			expect(read("./fixtures/sample-place-z-3.svg")).toContain(
				'class="label">Cellar <tspan class="label-floor">(z=-3)</tspan></text>',
			);
			const hide =
				source.match(/:global\(\.sk-play-map--dense > svg[^{]*\{\s*display: none;/s)?.[0] ?? "";
			expect(hide).toContain(":global(.sk-play-map--dense > svg .label-floor)");
			const svg = sanitiseSvg(
				'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120"><g class="node" data-node-id="cellar"><text class="label" x="10" y="20">Cellar <tspan class="label-floor">(z=-3)</tspan></text></g></svg>',
			);
			expect(svg).toContain('Cellar <tspan class="label-floor">(z=-3)</tspan>');
			const drawn = { mode: "full" as const, placeName: "Cellar", caption: "Current place.", svg };
			const card = render(PlaceMap, { frame: drawn, density: "card" });
			expect(card.container.querySelector(".sk-play-map--dense > svg .label-floor")).not.toBeNull();
			card.unmount();
			const stage = render(PlaceMap, { frame: drawn, density: "stage" });
			expect(stage.container.querySelector(".sk-play-map--dense > svg .label-floor")).toBeNull();
			expect(stage.container.querySelector(".label-floor")?.textContent).toBe("(z=-3)");
			expect(stage.container.querySelector(".label")?.textContent).toBe("Cellar (z=-3)");
		});

		it("marks the plate dense at card density only, so the scoped rules apply", () => {
			const drawn = {
				mode: "full" as const,
				placeName: "Advancement Limbo",
				caption: "Current place.",
				svg: fixture,
			};
			const card = render(PlaceMap, { frame: drawn, density: "card" });
			expect(
				card.container.querySelector(".sk-play-map--dense > svg > rect[width='100%']"),
			).not.toBeNull();
			expect(card.container.querySelector(".sk-play-map--dense .title-bar")).not.toBeNull();
			card.unmount();
			const stage = render(PlaceMap, { frame: drawn, density: "stage" });
			expect(stage.container.querySelector(".sk-play-map--dense")).toBeNull();
		});
	});
});
