import { readFileSync } from "node:fs";
import { fireEvent, render, screen, within } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import Place from "./Place.svelte";

const place = {
	id: "common",
	name: "Common Room",
	description: "Long trestle tables share the room with a low fire.",
	exits: [
		{ id: "s:exit:1", label: "Stairs", direction: "southeast" },
		{ id: "s:exit:2", label: "Foyer", direction: "west", gated: true },
	],
};

const occupants = [
	{
		id: "4",
		name: "Aldwin",
		kind: "person" as const,
		note: "Here with you",
		noteIsPresence: true,
		sceneKind: "actor",
	},
	{
		id: "9",
		name: "Brother Caddoc",
		kind: "person" as const,
		note: "Here with you",
		noteIsPresence: true,
		sceneKind: "actor",
	},
	{
		id: "31",
		name: "Hearth",
		kind: "thing" as const,
		note: "Something here",
		noteIsPresence: true,
		sceneKind: "entity",
	},
];

describe("Place", () => {
	it("orders communication, authored groups, other syntax and checks without label inference and shows short prose once", () => {
		render(Place, {
			place,
			occupants,
			selectedId: "4",
			density: "stage",
			isSecondaryVerb: (action) => action.id === "check",
			secondaryVerbsLabel: "Checks",
			detail: {
				id: "4",
				description: "One supplied short description.",
				facts: [],
				verbs: [
					{ id: "other", label: "Communicate by name only", verb: "manipulate" },
					{ id: "check", label: "A check", verb: "manipulate", group: "AAA" },
					{ id: "z", label: "Zed", verb: "manipulate", group: "Zeta" },
					{ id: "b", label: "Beta action", verb: "manipulate", groups: ["Beta"] },
					{ id: "a", label: "Alpha action", verb: "manipulate", group: "Alpha" },
					{ id: "say", label: "Speak", verb: "communicate" },
				],
			},
		});
		const list = document.querySelector(".place-action-results") as HTMLElement;
		expect(
			within(list)
				.getAllByRole("button")
				.map((row) => row.textContent?.trim()),
		).toEqual([
			"Speak",
			"Alpha action",
			"Beta action",
			"Zed",
			"Communicate by name only",
			"A check",
		]);
		expect(
			within(list)
				.getAllByRole("heading")
				.map((row) => row.textContent),
		).toEqual(["Communicate", "Alpha", "Beta", "Zeta", "Other", "Checks"]);
		expect(screen.getAllByText("One supplied short description.")).toHaveLength(1);
		expect(
			within(screen.getByRole("region", { name: "Reading pane" })).queryByText(
				"One supplied short description.",
			),
		).toBeNull();
	});

	it("marks sorted actions without inserting, reads the entry again, and inserts with Enter", async () => {
		const onAct = vi.fn();
		render(Place, {
			place,
			occupants,
			selectedId: "4",
			density: "stage",
			selectionOnly: true,
			onAct,
			detail: {
				id: "4",
				description: "Keeper.",
				facts: [],
				verbs: [
					{ id: "z", label: "Zed", verb: "manipulate", description: "Last action." },
					{ id: "a", label: "Alpha", verb: "manipulate", description: "First action." },
				],
			},
		});
		const filter = screen.getByRole("textbox", { name: "Filter things to try" });
		expect(screen.getByRole("heading", { name: "Things to try (2)" })).toBeTruthy();
		await fireEvent.click(screen.getByRole("button", { name: "Alpha" }));
		expect(onAct).not.toHaveBeenCalled();
		expect(screen.getByText("First action.")).toBeTruthy();
		await fireEvent.click(screen.getByRole("button", { name: "Read about Aldwin" }));
		expect(screen.queryByText("First action.")).toBeNull();
		await fireEvent.keyDown(filter, { key: "ArrowDown" });
		await fireEvent.keyDown(filter, { key: "Enter" });
		expect(onAct).toHaveBeenCalledWith("a");
		await fireEvent.input(filter, { target: { value: "Zed" } });
		await fireEvent.keyDown(filter, { key: "ArrowDown" });
		await fireEvent.keyDown(filter, { key: "Escape" });
		expect((filter as HTMLInputElement).value).toBe("Zed");
		await fireEvent.keyDown(filter, { key: "Escape" });
		expect((filter as HTMLInputElement).value).toBe("");
	});

	it("browses one counted list with arrows and shows the place when unmarked", async () => {
		const onSelect = vi.fn();
		const onSelectExit = vi.fn();
		render(Place, {
			place,
			occupants,
			density: "stage",
			selectionOnly: true,
			onSelect,
			onSelectExit,
		});
		expect(screen.getByRole("heading", { name: "Here (3)" })).toBeTruthy();
		expect(screen.getByRole("heading", { name: "Ways out (2)" })).toBeTruthy();
		expect(screen.getByText(place.description)).toBeTruthy();
		await fireEvent.keyDown(screen.getByRole("button", { name: "Hearth" }), { key: "ArrowDown" });
		expect(onSelectExit).toHaveBeenCalledWith("s:exit:1");
		expect(screen.queryByText("Here with you")).toBeNull();
	});

	it("select-only mode discloses detail verbs without moving on selection", async () => {
		const onSelectExit = vi.fn();
		const onAct = vi.fn();
		const onMove = vi.fn();
		render(Place, {
			place,
			occupants,
			density: "stage",
			selectionOnly: true,
			selectedId: "4",
			onSelectExit,
			onAct,
			onMove,
			detail: {
				id: "4",
				description: "Keeper.",
				facts: [],
				verbs: [{ id: "look", label: "Look", verb: "sensing" }],
			},
			environmentActions: [{ id: "around", label: "Look around", verb: "sensing" }],
		});
		expect(
			within(screen.getByRole("region", { name: "Selected entity details" })).getByText("Keeper."),
		).toBeTruthy();
		expect(screen.getByRole("heading", { name: "Things to try (1)" })).toBeTruthy();
		expect(screen.queryByText("What you can do")).toBeNull();
		expect(screen.getByRole("button", { name: "Look" })).toBeTruthy();
		expect(screen.queryByRole("button", { name: "Look around" })).toBeNull();
		await fireEvent.click(screen.getByRole("button", { name: "Stairs (southeast)" }));
		expect(onSelectExit).toHaveBeenCalledWith("s:exit:1");
		expect(onAct).not.toHaveBeenCalled();
		expect(onMove).not.toHaveBeenCalled();
	});
	it("a way-out row click that marks also inserts its movement; unmarking and arrows do not", async () => {
		const onSelectExit = vi.fn();
		const onInsertMove = vi.fn();
		const view = render(Place, {
			place,
			occupants,
			density: "stage",
			selectionOnly: true,
			onSelectExit,
			onInsertMove,
		});
		await fireEvent.keyDown(screen.getByRole("button", { name: "Hearth" }), { key: "ArrowDown" });
		expect(onInsertMove).not.toHaveBeenCalled();
		await fireEvent.click(screen.getByRole("button", { name: "Stairs (southeast)" }));
		expect(onSelectExit).toHaveBeenLastCalledWith("s:exit:1");
		expect(onInsertMove).toHaveBeenCalledTimes(1);
		expect(onInsertMove).toHaveBeenCalledWith("s:exit:1");
		await view.rerender({ selectedExitId: "s:exit:1" });
		await fireEvent.click(screen.getByRole("button", { name: "Stairs (southeast)" }));
		expect(onInsertMove).toHaveBeenCalledTimes(1);
	});
	it("lets visible card occupants select, without offering local movement", async () => {
		const onSelect = vi.fn();
		render(Place, {
			place,
			occupants,
			density: "card",
			onSelect,
			infoRefFor: (occupant) => `occupant:${occupant.id}`,
		});
		expect(screen.getByText("Long trestle tables share the room with a low fire.")).toBeTruthy();
		expect(document.querySelector('[data-slot="play-occupants"]')?.textContent).toContain(
			"3 here: Aldwin · Brother Caddoc · Hearth",
		);
		expect(screen.getByText("2 ways out")).toBeTruthy();
		expect(screen.queryByRole("button", { name: /Go to Stairs/ })).toBeNull();
		const aldwin = screen.getByRole("button", { name: "Aldwin" });
		expect(aldwin.className).toContain("info-link");
		await fireEvent.click(aldwin);
		expect(onSelect).toHaveBeenCalledWith("4");
	});

	// sk-jay0.1.8.102 s1: the card root is the column that fills the tile, so
	// the description takes the space left while the occupants line and the
	// ways-out line stay direct children that keep their own size.
	it("lays the card out as one column with the scene, occupants and ways-out line as direct children", () => {
		const { container } = render(Place, { place, occupants, density: "card", chrome: "bare" });
		const root = container.querySelector('[data-slot="play-place"]');
		expect(root?.classList.contains("place-card")).toBe(true);
		const children = Array.from(root?.children ?? []);
		expect(children[0]?.getAttribute("data-slot")).toBe("play-scene");
		expect(children[1]?.getAttribute("data-slot")).toBe("play-occupants");
		expect(children.at(-1)?.textContent).toBe("2 ways out");
		expect(root?.querySelector(".place-description-card")).toBeNull();
	});

	// sk-jay0.1.8.102 follow-up (browser, 1312x700): the whole Scene part was
	// the scroll container, so a short tile cut the text mid-line right above
	// the occupants row and scrolled the place name away with it. Only the
	// description is the scroll region now; the name stays outside it.
	it("makes only the card description the scroll region, with the shared stream-scroll utility", () => {
		const { container } = render(Place, { place, occupants, density: "card", chrome: "bare" });
		const scene = container.querySelector('[data-slot="play-place"] > [data-slot="play-scene"]');
		const description = screen.getByText(place.description);
		expect(description.parentElement).toBe(scene);
		expect(description.classList.contains("scene-description")).toBe(true);
		expect(description.classList.contains("sk-stream-scroll")).toBe(true);
		expect(container.querySelectorAll(".scene-description")).toHaveLength(1);
		const name = within(scene as HTMLElement).getByRole("heading", { name: place.name });
		expect(name.closest(".scene-description")).toBeNull();
		expect(container.querySelector('[data-slot="play-occupants"] .scene-description')).toBeNull();
	});

	// jsdom has no layout, so the sizing rules are pinned in the source: the
	// Scene part is a non-scrolling column, the description is its one
	// flexible, shrinking child, and every other card row keeps its size.
	it("pins the card sizing: description flexes and shrinks, the Scene part and other rows do not scroll", () => {
		const source = readFileSync(`${import.meta.dirname}/Place.svelte`, "utf8");
		const rule = (selector: string) => {
			const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			return source.match(new RegExp(`:global\\(${escaped}\\)\\s*\\{([^}]*)\\}`))?.[1] ?? "";
		};
		const scenePart = rule('.place-card > [data-slot="play-scene"]');
		expect(scenePart).toContain("flex-direction: column");
		expect(scenePart).toContain("min-height: 0");
		expect(scenePart).not.toMatch(/overflow-y:\s*auto/);
		expect(rule('.place-card > [data-slot="play-scene"] > :not(.scene-description)')).toContain(
			"flex: none",
		);
		const text = rule(".place-card .scene-description");
		expect(text).toContain("flex: 1 1 auto");
		expect(text).toContain("min-height: 0");
		// The fade is exactly the stream-scroll end inset (0.5rem), so text
		// that fits is never faded.
		expect(text).toContain("calc(100% - 0.5rem)");
		expect(rule('.place-card > :not([data-slot="play-scene"])')).toContain("flex: none");
	});

	// sk-jay0.1.8.99 s3: the card names each way out with its direction; a row
	// click only reports the exit to the host's insert callback.
	it("lists card ways out by name and direction and reports a click through onInsertMove", async () => {
		const onInsertMove = vi.fn();
		const onMove = vi.fn();
		const onSelectExit = vi.fn();
		render(Place, { place, occupants, density: "card", onInsertMove, onMove, onSelectExit });
		const list = screen.getByRole("list", { name: "Ways out" });
		expect(
			within(list)
				.getAllByRole("listitem")
				.map((row) => row.textContent?.trim()),
		).toEqual(["Stairs (southeast)", "Foyer (west)may be blocked"]);
		// The gated way (Foyer) says so in the row itself, as the stage list
		// does: a hover title alone is invisible on touch and keyboard.
		const gatedRow = within(list).getByRole("button", { name: /^Foyer \(west\)/ });
		expect(within(gatedRow).getByText("may be blocked")).toBeTruthy();
		expect(
			within(within(list).getByRole("button", { name: /^Stairs/ })).queryByText("may be blocked"),
		).toBeNull();
		await fireEvent.click(gatedRow);
		expect(onInsertMove).toHaveBeenCalledExactlyOnceWith("s:exit:2");
		expect(onMove).not.toHaveBeenCalled();
		expect(onSelectExit).not.toHaveBeenCalled();
		expect(screen.getByText("2 ways out")).toBeTruthy();
	});

	it("shows card way-out names as text when the host gives no insert callback", () => {
		render(Place, { place, occupants, density: "card" });
		const list = screen.getByRole("list", { name: "Ways out" });
		expect(within(list).getByText("Stairs (southeast)")).toBeTruthy();
		expect(within(list).queryByRole("button")).toBeNull();
		// The text variant shows the gate fact too.
		expect(within(list).getAllByText("may be blocked")).toHaveLength(1);
	});

	it("cuts more than five card ways out to four with a +N more note and keeps the full count", () => {
		const many = {
			...place,
			exits: Array.from({ length: 7 }, (_, index) => ({
				id: `s:exit:${index}`,
				label: `Way ${index}`,
				direction: index < 2 ? "north" : "",
			})),
		};
		render(Place, { place: many, occupants, density: "card", onInsertMove: vi.fn() });
		const list = screen.getByRole("list", { name: "Ways out" });
		expect(
			within(list)
				.getAllByRole("listitem")
				.map((row) => row.textContent?.trim()),
		).toEqual(["Way 0 (north)", "Way 1 (north)", "Way 2", "Way 3", "+3 more"]);
		expect(within(list).getAllByRole("button")).toHaveLength(4);
		expect(screen.getByText("7 ways out")).toBeTruthy();
	});

	it("shows five card ways out whole rather than a +1 more note", () => {
		const five = {
			...place,
			exits: Array.from({ length: 5 }, (_, index) => ({
				id: `s:exit:${index}`,
				label: `Way ${index}`,
				direction: "",
			})),
		};
		render(Place, { place: five, occupants, density: "card" });
		const list = screen.getByRole("list", { name: "Ways out" });
		expect(within(list).getAllByRole("listitem")).toHaveLength(5);
		expect(within(list).queryByText(/more/)).toBeNull();
	});

	it("groups mixed occupants and opens a non-mutating detail panel at stage", async () => {
		const onSelect = vi.fn();
		const onAct = vi.fn();
		const onMove = vi.fn();
		render(Place, {
			place,
			occupants,
			selectedId: "4",
			onSelect,
			onAct,
			onMove,
			density: "stage",
			detail: {
				id: "4",
				description: "Keeper of the hearth-ledger.",
				facts: [{ id: "faction", label: "Faction", value: "inn" }],
				verbs: [{ id: "h:look-aldwin", label: "Look", verb: "sensing" }],
			},
		});
		expect(screen.getByRole("heading", { name: "People (2)" })).toBeTruthy();
		expect(screen.getByRole("heading", { name: "Things (1)" })).toBeTruthy();
		expect(screen.getByText("Person")).toBeTruthy();
		expect(screen.getByRole("heading", { name: "Aldwin" })).toBeTruthy();
		expect(
			within(screen.getByRole("region", { name: "Selected entity details" })).getByText(
				"Keeper of the hearth-ledger.",
			),
		).toBeTruthy();
		expect(screen.getByText("Faction:")).toBeTruthy();
		expect(screen.getByText("inn")).toBeTruthy();
		await fireEvent.click(screen.getByRole("button", { name: /Hearth/ }));
		expect(onSelect).toHaveBeenCalledWith("31");
		expect(onAct).not.toHaveBeenCalled();
		expect(onMove).not.toHaveBeenCalled();
		await fireEvent.click(screen.getByRole("button", { name: "Look" }));
		expect(onAct).not.toHaveBeenCalled();
		await fireEvent.click(screen.getByRole("button", { name: "Insert" }));
		expect(onAct).toHaveBeenCalledWith("h:look-aldwin");
	});

	it("offers Go to exits without disabling a gated way", async () => {
		const onMove = vi.fn();
		render(Place, { place, occupants, onMove, density: "stage" });
		const stairs = screen.getByRole("button", { name: "Go to Stairs (southeast)" });
		const foyer = screen.getByRole("button", { name: /Go to Foyer \(west\)/ });
		expect(foyer.hasAttribute("disabled")).toBe(false);
		expect(foyer.getAttribute("title")).toContain("the world decides the attempt");
		await fireEvent.click(stairs);
		expect(onMove).toHaveBeenCalledWith("s:exit:1");
	});

	it("keeps loading, failed, missing and stale detail states distinct", () => {
		const { rerender } = render(Place, {
			place,
			occupants,
			selectedId: "4",
			density: "stage",
			detail: null,
		});
		expect(screen.getByText("Loading actions on this entity…")).toBeTruthy();
		void rerender({
			place,
			occupants,
			selectedId: "4",
			density: "stage",
			detail: { id: "4", facts: [], verbs: [], failed: true },
		});
		expect(screen.getByText("Could not load actions on this entity.")).toBeTruthy();
		expect(screen.queryByText("Loading actions on this entity…")).toBeNull();
		void rerender({
			place,
			occupants,
			selectedId: "31",
			density: "stage",
			detail: { id: "4", description: "stale Aldwin", facts: [], verbs: [] },
		});
		expect(screen.getByText("Loading actions on this entity…")).toBeTruthy();
		expect(screen.queryByText("stale Aldwin")).toBeNull();
		void rerender({
			place: null,
			placeState: "missing",
			occupants: [],
			density: "stage",
		});
		expect(screen.getByText("Between places.")).toBeTruthy();
	});

	it("shows a failed scene read as an error when place is null, not as missing", () => {
		render(Place, { place: null, placeState: "failed", occupants: [], density: "stage" });
		expect(screen.getByRole("alert").textContent).toContain("Place could not be loaded.");
		expect(screen.queryByText("Between places.")).toBeNull();
		expect(screen.queryByText("No description available.")).toBeNull();
	});

	it("shows a pending place read as loading, not as missing or failed", () => {
		render(Place, { place: null, placeState: "loading", occupants: [], density: "card" });
		expect(screen.getByRole("status").textContent).toContain("Loading place…");
		expect(screen.queryByText("Between places.")).toBeNull();
		expect(screen.queryByRole("alert")).toBeNull();
		expect(screen.queryByText("No description available.")).toBeNull();
	});

	it("offers a Talk shortcut that does not execute an action", async () => {
		const onAct = vi.fn();
		const onOpen = vi.fn();
		render(Place, {
			place,
			occupants,
			selectedId: "4",
			onAct,
			otherActions: { label: "Talk at the table", onOpen },
			density: "stage",
			detail: { id: "4", facts: [], verbs: [] },
		});
		await fireEvent.click(screen.getByRole("button", { name: "Talk at the table" }));
		expect(onOpen).toHaveBeenCalledOnce();
		expect(onAct).not.toHaveBeenCalled();
	});

	// sk-jay0.1.8.63.9: the Place tile's inline pane shares EntityDetail with
	// EntityReaderDialog — the host's own secondary-verb classification must
	// reach it the same way.
	it("forwards the host's secondary-verb classification to the selected occupant's detail pane", async () => {
		render(Place, {
			place,
			occupants,
			selectedId: "4",
			density: "stage",
			detail: {
				id: "4",
				facts: [],
				verbs: [
					{ id: "act:attack", label: "Attack", verb: "manipulate" },
					{ id: "act:check-acrobatics", label: "Acrobatics", verb: "manipulate" },
				],
			},
			isSecondaryVerb: (verb) => verb.id.startsWith("act:check-"),
			secondaryVerbsLabel: "Checks",
		});
		expect(screen.getByRole("button", { name: "Attack" })).toBeTruthy();
		expect(screen.getByRole("heading", { name: "Checks" })).toBeTruthy();
		expect(screen.getByRole("button", { name: "Acrobatics" })).toBeTruthy();
	});

	it("keeps Ways out in the shared list beside the scrolling detail pane", () => {
		render(Place, { place, occupants, selectedId: "4", density: "stage", chrome: "bare" });
		const root = document.querySelector('[data-slot="play-place"]') as HTMLElement;
		const panes = document.querySelector(".place-panes") as HTMLElement;
		const ways = document.querySelector(".place-ways") as HTMLElement;
		const detail = screen.getByRole("region", { name: "Selected entity details" });
		expect(root.className).toContain("place-stage");
		expect(panes.contains(detail)).toBe(true);
		expect(panes.contains(ways)).toBe(true);
		expect(root.contains(ways)).toBe(true);
		expect(ways.closest(".place-lists")).toBeTruthy();
		expect(screen.getByRole("heading", { name: "Ways out (2)" })).toBeTruthy();
	});
});
