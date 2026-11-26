import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import Occupants from "./Occupants.svelte";
import { groupOccupants } from "./occupants";

describe("Occupants", () => {
	const occupants = [
		{ id: "mira", name: "Mira", kind: "person" as const, note: "Innkeeper", sceneKind: "actor" },
		{
			id: "hearth",
			name: "Hearth",
			kind: "thing" as const,
			note: "A low fire",
			sceneKind: "entity",
		},
	];

	it("renders occupants and marks the selected one at stage", () => {
		render(Occupants, { selectedId: "mira", occupants, density: "stage" });
		expect(document.querySelector('[data-slot="play-occupants"]')).not.toBeNull();
		expect(screen.getByRole("heading", { name: "Here" })).toBeTruthy();
		expect(screen.getByRole("button", { name: /Mira/ }).getAttribute("aria-pressed")).toBe("true");
	});

	it("renders strip density as a glyph, label, and count datum", () => {
		render(Occupants, { occupants, density: "strip" });
		expect(
			document.querySelector('[data-slot="play-occupants"]')?.getAttribute("data-density"),
		).toBe("strip");
		expect(screen.getByRole("heading", { name: "Here" })).toBeTruthy();
		expect(screen.getByText("2 present")).toBeTruthy();
		expect(screen.queryByRole("button", { name: /Mira/ })).toBeNull();
	});

	it("renders card density as a count and the first three names, not the interactive list (sk-jay0.1.8.5 finding 2)", () => {
		render(Occupants, { occupants, density: "card" });
		expect(screen.getByText("2 here: Mira · Hearth")).toBeTruthy();
		expect(screen.queryByRole("button", { name: /Mira/ })).toBeNull();
	});

	it("renders stage density with grouped authorized scene kinds, not glyph taxonomy", () => {
		render(Occupants, { occupants, density: "stage" });
		expect(screen.getByRole("heading", { name: "Characters" })).toBeTruthy();
		expect(screen.getByRole("heading", { name: "Objects" })).toBeTruthy();
		expect(screen.getByRole("button", { name: /Mira/ })).toBeTruthy();
		expect(screen.queryByText("person")).toBeNull();
		expect(screen.queryByText("thing")).toBeNull();
	});

	it("keeps an unclassified group when scene kind is absent", () => {
		render(Occupants, {
			occupants: [{ id: "odd", name: "Oddity", kind: "thing", note: "Something here" }],
			density: "stage",
		});
		expect(screen.getByRole("heading", { name: "Unknown" })).toBeTruthy();
		expect(screen.getByRole("button", { name: /Oddity/ })).toBeTruthy();
	});

	it("calls onSelect without changing its own selection", async () => {
		const onSelect = vi.fn();
		render(Occupants, { occupants, selectedId: "mira", onSelect, density: "stage" });
		await fireEvent.click(screen.getByRole("button", { name: /Hearth/ }));
		expect(onSelect).toHaveBeenCalledWith("hearth");
		expect(screen.getByRole("button", { name: /Mira/ }).getAttribute("aria-pressed")).toBe("true");
	});

	it("renders bare chrome with no border or title row, the content unchanged", () => {
		render(Occupants, { occupants, density: "stage", chrome: "bare" });
		const el = document.querySelector('[data-slot="play-occupants"]');
		expect(el?.tagName).toBe("DIV");
		expect(el?.hasAttribute("data-play-frame")).toBe(false);
		expect(screen.getByRole("heading", { name: "Here" })).toBeTruthy();
		expect(screen.getByRole("button", { name: /Mira/ })).toBeTruthy();
	});
});

describe("groupOccupants", () => {
	it("groups by authorized scene kind and preserves unknown kinds", () => {
		const groups = groupOccupants([
			{ id: "hearth", name: "Hearth", kind: "thing", note: "Something here", sceneKind: "entity" },
			{ id: "aldwin", name: "Aldwin", kind: "person", note: "Here with you", sceneKind: "actor" },
			{
				id: "rat",
				name: "Cellar Rat",
				kind: "creature",
				note: "Here with you",
				sceneKind: "actor",
			},
			{ id: "mark", name: "Scrape", kind: "thing", note: "Something here", sceneKind: "trace" },
			{ id: "odd", name: "Oddity", kind: "thing", note: "Something here" },
		]);
		expect(groups.map((group) => group.label)).toEqual([
			"Characters",
			"Objects",
			"trace",
			"Unknown",
		]);
		expect(groups[0]?.items.map((item) => item.name)).toEqual(["Aldwin", "Cellar Rat"]);
		expect(groups[1]?.items.map((item) => item.name)).toEqual(["Hearth"]);
		expect(groups[2]?.key).toBe("trace");
		expect(groups[3]?.items.map((item) => item.id)).toEqual(["odd"]);
	});
});
