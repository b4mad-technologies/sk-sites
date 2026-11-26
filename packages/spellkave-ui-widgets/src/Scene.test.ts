import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Scene from "./Scene.svelte";

describe("Scene", () => {
	const place = {
		id: "loft",
		name: "Loft",
		description: "Rafters slope low over a scatter of straw pallets.",
		exits: [{ id: "loft-north", label: "Stairs", direction: "north" }],
	};
	const twoExitPlace = {
		id: "stairs",
		name: "Stairs",
		description: "Three creaking floors of timber and lantern-light.",
		exits: [
			{ id: "stairs-common", label: "Common Room", direction: "northwest" },
			{ id: "stairs-cellar", label: "Cellar", direction: "southeast" },
		],
	};

	it("renders the place name, description, and exits", () => {
		render(Scene, { place });
		expect(document.querySelector('[data-slot="play-scene"]')).not.toBeNull();
		expect(screen.getByRole("heading", { name: "Loft" })).toBeTruthy();
		expect(screen.getByRole("button", { name: "Stairs (north)" })).toBeTruthy();
	});

	it("renders strip density as a glyph, place name, and a singular exits-count datum", () => {
		render(Scene, { place, density: "strip" });
		expect(document.querySelector('[data-slot="play-scene"]')?.getAttribute("data-density")).toBe(
			"strip",
		);
		expect(screen.getByRole("heading", { name: "Loft" })).toBeTruthy();
		expect(screen.getByText("1 way out")).toBeTruthy();
		expect(screen.queryByRole("button", { name: "Stairs (north)" })).toBeNull();
	});

	it("renders strip density with a pluralised exits-count datum for more than one exit", () => {
		render(Scene, { place: twoExitPlace, density: "strip" });
		expect(screen.getByText("2 ways out")).toBeTruthy();
	});

	it("keeps card-density exits for standalone Scene consumers", () => {
		render(Scene, { place, density: "card" });
		expect(screen.getByRole("button", { name: "Stairs (north)" })).toBeTruthy();
		expect(screen.getByText("Rafters slope low over a scatter of straw pallets.")).toBeTruthy();
	});

	// sk-jay0.1.8.102 s1: the card description was cut to three lines while
	// most of the tile stayed empty. Card density shows the whole text; the
	// Place card sizes it by the space left instead (Place.test.ts).
	it("does not clamp the card-density description to a line count", () => {
		render(Scene, { place, density: "card", chrome: "bare" });
		const description = screen.getByText("Rafters slope low over a scatter of straw pallets.");
		expect(description.className).not.toContain("place-description-card");
		expect(description.className).not.toMatch(/line-clamp/);
	});

	it("marks only the card-density description as a scroll region", () => {
		const card = render(Scene, { place, density: "card", chrome: "bare" });
		const text = "Rafters slope low over a scatter of straw pallets.";
		expect(screen.getByText(text).classList.contains("sk-stream-scroll")).toBe(true);
		card.unmount();
		render(Scene, { place, density: "stage" });
		expect(screen.getByText(text).classList.contains("sk-stream-scroll")).toBe(false);
		expect(screen.getByText(text).classList.contains("scene-description")).toBe(false);
	});

	it("renders stage density with the full description and exits", () => {
		render(Scene, { place, density: "stage" });
		expect(screen.getByText("Rafters slope low over a scatter of straw pallets.")).toBeTruthy();
		expect(screen.getByRole("button", { name: "Stairs (north)" })).toBeTruthy();
	});

	it("says no description is available when the place has none", () => {
		render(Scene, {
			place: { ...place, description: "" },
			density: "stage",
		});
		expect(screen.getByText("No description available.")).toBeTruthy();
	});

	it("treats a failed read as an error, not missing prose", () => {
		render(Scene, { place: { ...place, description: "" }, readState: "failed", density: "stage" });
		expect(screen.getByRole("alert").textContent).toContain(
			"Place description could not be loaded.",
		);
		expect(screen.queryByText("No description available.")).toBeNull();
	});

	it("hides exits when the host owns Ways out", () => {
		render(Scene, { place, showExits: false, density: "card" });
		expect(screen.queryByRole("button", { name: "Stairs (north)" })).toBeNull();
	});

	it("renders bare chrome with no border, keeping the place name as content", () => {
		render(Scene, { place, density: "card", chrome: "bare" });
		const el = document.querySelector('[data-slot="play-scene"]');
		expect(el?.tagName).toBe("DIV");
		expect(el?.hasAttribute("data-play-frame")).toBe(false);
		expect(screen.getByRole("heading", { name: "Loft" })).toBeTruthy();
		expect(screen.getByRole("button", { name: "Stairs (north)" })).toBeTruthy();
	});

	it("sizes a long exit label to shrink and fill its tile at the rest column width (sk-jay0.1.8.14 task b: 'Common Room (Northeast)' clipped at the tile edge)", () => {
		const clippedExit = {
			id: "cellar",
			name: "Cellar",
			description: "Barrels, damp stone.",
			exits: [{ id: "cellar-common", label: "Common Room", direction: "northeast" }],
		};
		render(Scene, { place: clippedExit });
		const button = screen.getByRole("button", { name: "Common Room (northeast)" });
		const classes = button.className.split(/\s+/);
		expect(classes).toContain("shrink");
		expect(classes).not.toContain("shrink-0");
		expect(classes).toContain("min-w-[12rem]");
		expect(classes).toContain("max-w-full");
	});
});
