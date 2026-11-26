// The hero's own place on the zoomed map (sk-jay0.1.8.100 s6/s8): the seat
// marker in every mode, one owner of the camera flight, a reactive
// placeNodeId, and the opt-in Substrate control. A `.svelte.test.ts` file so
// props can change one at a time through runes, the way a parent binds them.

import { fireEvent, render, waitFor } from "@testing-library/svelte";
import { flushSync } from "svelte";
import { describe, expect, it, vi } from "vitest";
import MapCanvas from "./MapCanvas.svelte";
import type { ActorPlace } from "./seat-location";

type Recorded = {
	flights: Array<{ center?: unknown; zoom?: number }>;
	markers: Array<{ element: HTMLElement | null; lngLat: unknown }>;
	reset(): void;
};

async function recorded(): Promise<Recorded> {
	const mod = (await import("maplibre-gl")) as unknown as { __recorded: Recorded };
	return mod.__recorded;
}

/** Overpass answers by node id: each known place sits at its own coordinates. */
const PLACES: Record<string, { lon: number; lat: number; name: string; level: string }> = {
	"inn/common_room": { lon: 10, lat: 20, name: "Common room", level: "0" },
	"inn/cellar": { lon: 11, lat: 21, name: "Cellar", level: "-1" },
	"inn/yard": { lon: 12, lat: 22, name: "Yard", level: "0" },
};

/**
 * `hold` names node ids whose lookup waits until the returned release
 * function is called, so a test can let a later lookup answer first.
 */
function stubGateway(hold: string[] = []): (nodeId: string) => void {
	const waiting = new Map<string, Array<() => void>>();
	const release = (nodeId: string): void => {
		const at = hold.indexOf(nodeId);
		if (at >= 0) hold.splice(at, 1);
		for (const go of waiting.get(nodeId) ?? []) go();
		waiting.delete(nodeId);
	};
	vi.stubGlobal(
		"fetch",
		vi.fn(async (url: string, init?: RequestInit) => {
			if (url.includes("interpreter")) {
				const query = init?.body instanceof URLSearchParams ? (init.body.get("data") ?? "") : "";
				const held = hold.find((id) => query.includes(`"spellkave:node_id"="${id}"`));
				if (held !== undefined) {
					await new Promise<void>((resolve) => {
						waiting.set(held, [...(waiting.get(held) ?? []), resolve]);
					});
				}
				const elements = Object.entries(PLACES)
					.filter(
						([id, row]) =>
							query.includes(`"spellkave:node_id"="${id}"`) ||
							query.includes(`["name"~"${row.name}"`),
					)
					.map(([id, row], i) => ({
						type: "node",
						id: i + 1,
						lat: row.lat,
						lon: row.lon,
						tags: { name: row.name, "spellkave:node_id": id, indoor: "yes", level: row.level },
					}));
				return new Response(JSON.stringify({ elements }));
			}
			if (url.includes("style.json")) {
				return new Response(JSON.stringify({ version: 8, sources: {}, layers: [] }));
			}
			if (url.includes("tiles.json")) {
				return new Response(JSON.stringify({ tiles: [], levels: ["-1", "0"] }));
			}
			return new Response(JSON.stringify({ loaded: true }));
		}),
	);
	return release;
}

function seatMarker(rec: Recorded): { element: HTMLElement | null; lngLat: unknown } | undefined {
	return rec.markers.find((row) => row.element?.dataset.testid === "seat-marker");
}

function seatMarkerCount(rec: Recorded): number {
	return rec.markers.filter((row) => row.element?.dataset.testid === "seat-marker").length;
}

/** Let any trailing (async) seat flight land before counting flights. */
function settle(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, 30));
}

const HERO = "hero-1";
const base = { gatewayOrigin: "https://gw.example", slug: "inn", token: "tok" } as const;

describe("MapCanvas — the hero's own place and the camera (sk-jay0.1.8.100)", () => {
	it("hides the Substrate control unless the caller opts in", () => {
		const off = render(MapCanvas, { ...base, mode: "full" });
		try {
			expect(off.queryByTestId("substrate-control")).toBeNull();
		} finally {
			off.unmount();
		}
		const on = render(MapCanvas, { ...base, mode: "full", substrateControl: true });
		try {
			expect(on.getByTestId("substrate-control")).toBeTruthy();
		} finally {
			on.unmount();
		}
	});

	it.each(["medium", "full"] as const)("%s: draws the caller's own seat marker", async (mode) => {
		stubGateway();
		const rec = await recorded();
		rec.reset();
		const rendered = render(MapCanvas, {
			...base,
			mode,
			minePlaces: [{ entityId: HERO, placeNodeId: "inn/cellar" }],
			mineEntityIds: [HERO],
		});
		try {
			await waitFor(() => expect(seatMarker(rec)?.lngLat).toEqual([11, 21]));
			expect(seatMarkerCount(rec)).toBe(1);
		} finally {
			rendered.unmount();
			vi.unstubAllGlobals();
		}
	});

	it("opens at the linked place with one flight when the seat is the same place", async () => {
		stubGateway();
		const rec = await recorded();
		rec.reset();
		const rendered = render(MapCanvas, {
			...base,
			mode: "medium",
			followPlace: true,
			placeNodeId: "inn/cellar",
			minePlaces: [{ entityId: HERO, placeNodeId: "inn/cellar" }],
			mineEntityIds: [HERO],
		});
		try {
			await waitFor(() => expect(seatMarker(rec)?.lngLat).toEqual([11, 21]));
			await waitFor(() => expect(rec.flights.length).toBeGreaterThan(0));
			await settle();
			expect(rec.flights).toHaveLength(1);
			expect(rec.flights[0]?.center).toEqual([11, 21]);
		} finally {
			rendered.unmount();
			vi.unstubAllGlobals();
		}
	});

	it("follows a changed placeNodeId with exactly one new flight", async () => {
		stubGateway();
		const rec = await recorded();
		rec.reset();
		// The hero moves: the parent changes the place and the seat together,
		// prop by prop (getters over runes), not by remounting the canvas.
		let linked = $state("inn/common_room");
		let mine = $state.raw<ActorPlace[]>([{ entityId: HERO, placeNodeId: "inn/common_room" }]);
		const onPlaceClick = vi.fn();
		const rendered = render(MapCanvas, {
			...base,
			mode: "medium" as const,
			followPlace: true,
			onPlaceClick,
			get placeNodeId() {
				return linked;
			},
			get minePlaces() {
				return mine;
			},
			mineEntityIds: [HERO],
		});
		try {
			await waitFor(() => expect(seatMarker(rec)?.lngLat).toEqual([10, 20]));
			await waitFor(() => expect(rec.flights).toHaveLength(1));
			await settle();
			// The selection the canvas makes when it boots is reported, as before.
			expect(onPlaceClick.mock.calls.map(([row]) => row.nodeId)).toEqual(["inn/common_room"]);
			linked = "inn/cellar";
			mine = [{ entityId: HERO, placeNodeId: "inn/cellar" }];
			flushSync();
			await waitFor(() => expect(seatMarker(rec)?.lngLat).toEqual([11, 21]));
			await waitFor(() => expect(rec.flights).toHaveLength(2));
			await settle();
			// Still one map and one seat marker: the canvas followed, not remounted.
			expect(seatMarkerCount(rec)).toBe(1);
			expect(rec.flights).toHaveLength(2);
			expect(rec.flights[1]?.center).toEqual([11, 21]);
			// A follow is the hero arriving, not a pick: no report for it.
			expect(onPlaceClick.mock.calls.map(([row]) => row.nodeId)).toEqual(["inn/common_room"]);
		} finally {
			rendered.unmount();
			vi.unstubAllGlobals();
		}
	});

	it("without a linked place the seat marker still flies to the seat", async () => {
		stubGateway();
		const rec = await recorded();
		rec.reset();
		const rendered = render(MapCanvas, {
			...base,
			mode: "full",
			minePlaces: [{ entityId: HERO, placeNodeId: "inn/common_room" }],
			mineEntityIds: [HERO],
		});
		try {
			await waitFor(() => expect(rec.flights).toHaveLength(1));
			await settle();
			expect(rec.flights).toHaveLength(1);
			expect(rec.flights[0]?.center).toEqual([10, 20]);
		} finally {
			rendered.unmount();
			vi.unstubAllGlobals();
		}
	});

	it("follows the hero back to a place after the player picked the destination on the map", async () => {
		stubGateway();
		const rec = await recorded();
		rec.reset();
		let linked = $state("inn/common_room");
		const rendered = render(MapCanvas, {
			...base,
			mode: "full" as const,
			followPlace: true,
			get placeNodeId() {
				return linked;
			},
		});
		try {
			await waitFor(() => expect(rec.flights).toHaveLength(1));
			// The player picks the cellar on the canvas (a search result): a
			// selection that is no link lookup.
			await fireEvent.input(rendered.getByPlaceholderText("Search maps…"), {
				target: { value: "Cellar" },
			});
			await fireEvent.click(await rendered.findByRole("button", { name: "Back to results" }));
			const hit = await waitFor(() => {
				const found = document.getElementById("search-hit-0");
				expect(found).toBeTruthy();
				return found as HTMLElement;
			});
			await fireEvent.click(hit);
			await waitFor(() => expect(rec.flights).toHaveLength(2));
			await settle();
			// The hero arrives at the place already selected: no new flight.
			linked = "inn/cellar";
			flushSync();
			await settle();
			expect(rec.flights).toHaveLength(2);
			// The hero walks back: the canvas follows, although the common room is
			// the last place it looked up as a link.
			linked = "inn/common_room";
			flushSync();
			await waitFor(() => expect(rec.flights).toHaveLength(3));
			expect(rec.flights[2]?.center).toEqual([10, 20]);
		} finally {
			rendered.unmount();
			vi.unstubAllGlobals();
		}
	});

	it("keeps a search pick when a follow lookup answers after it", async () => {
		const hold: string[] = [];
		const releaseHeld = stubGateway(hold);
		const rec = await recorded();
		rec.reset();
		let linked = $state("inn/common_room");
		const rendered = render(MapCanvas, {
			...base,
			mode: "full" as const,
			followPlace: true,
			get placeNodeId() {
				return linked;
			},
		});
		try {
			await waitFor(() => expect(rec.flights).toHaveLength(1));
			await fireEvent.input(rendered.getByPlaceholderText("Search maps…"), {
				target: { value: "Cellar" },
			});
			await fireEvent.click(await rendered.findByRole("button", { name: "Back to results" }));
			const hit = await waitFor(() => {
				const found = document.getElementById("search-hit-0");
				expect(found).toBeTruthy();
				return found as HTMLElement;
			});
			// The hero arrives in the yard; its lookup is still on the way when
			// the player picks the cellar from the results.
			hold.push("inn/yard");
			linked = "inn/yard";
			flushSync();
			await fireEvent.click(hit);
			await waitFor(() => expect(rec.flights).toHaveLength(2));
			releaseHeld("inn/yard");
			await settle();
			expect(rec.flights).toHaveLength(2);
			expect(rec.flights[1]?.center).toEqual([11, 21]);
			expect((rendered.getByPlaceholderText("Search maps…") as HTMLInputElement).value).toBe(
				"Cellar",
			);
		} finally {
			rendered.unmount();
			vi.unstubAllGlobals();
		}
	});

	it("drops the late answer for a place the hero already left", async () => {
		const hold: string[] = [];
		const releaseHeld = stubGateway(hold);
		const rec = await recorded();
		rec.reset();
		let linked = $state("inn/common_room");
		let mine = $state.raw<ActorPlace[]>([{ entityId: HERO, placeNodeId: "inn/common_room" }]);
		const onPlaceClick = vi.fn();
		const rendered = render(MapCanvas, {
			...base,
			mode: "medium" as const,
			followPlace: true,
			onPlaceClick,
			get placeNodeId() {
				return linked;
			},
			get minePlaces() {
				return mine;
			},
			mineEntityIds: [HERO],
		});
		try {
			await waitFor(() => expect(rec.flights).toHaveLength(1));
			await waitFor(() => expect(seatMarker(rec)?.lngLat).toEqual([10, 20]));
			await settle();
			hold.push("inn/cellar");
			// Two moves inside one lookup round trip: the cellar answers last.
			linked = "inn/cellar";
			mine = [{ entityId: HERO, placeNodeId: "inn/cellar" }];
			flushSync();
			linked = "inn/yard";
			mine = [{ entityId: HERO, placeNodeId: "inn/yard" }];
			flushSync();
			await waitFor(() => expect(rec.flights).toHaveLength(2));
			await waitFor(() => expect(seatMarker(rec)?.lngLat).toEqual([12, 22]));
			releaseHeld("inn/cellar");
			await settle();
			expect(rec.flights).toHaveLength(2);
			expect(rec.flights[1]?.center).toEqual([12, 22]);
			expect(seatMarker(rec)?.lngLat).toEqual([12, 22]);
			expect(onPlaceClick.mock.calls.map(([row]) => row.nodeId)).toEqual(["inn/common_room"]);
		} finally {
			rendered.unmount();
			vi.unstubAllGlobals();
		}
	});

	it("flies once when the seat updates before placeNodeId", async () => {
		stubGateway();
		const rec = await recorded();
		rec.reset();
		let linked = $state("inn/common_room");
		let mine = $state.raw<ActorPlace[]>([{ entityId: HERO, placeNodeId: "inn/common_room" }]);
		const rendered = render(MapCanvas, {
			...base,
			mode: "medium" as const,
			followPlace: true,
			get placeNodeId() {
				return linked;
			},
			get minePlaces() {
				return mine;
			},
			mineEntityIds: [HERO],
		});
		try {
			await waitFor(() => expect(rec.flights).toHaveLength(1));
			await waitFor(() => expect(seatMarker(rec)?.lngLat).toEqual([10, 20]));
			await settle();
			// The watch delivers the new seat first; the scene refresh follows.
			mine = [{ entityId: HERO, placeNodeId: "inn/cellar" }];
			flushSync();
			await waitFor(() => expect(seatMarker(rec)?.lngLat).toEqual([11, 21]));
			await settle();
			expect(rec.flights).toHaveLength(1);
			linked = "inn/cellar";
			flushSync();
			await waitFor(() => expect(rec.flights).toHaveLength(2));
			await settle();
			expect(rec.flights).toHaveLength(2);
			expect(rec.flights[1]?.center).toEqual([11, 21]);
		} finally {
			rendered.unmount();
			vi.unstubAllGlobals();
		}
	});

	it("keeps the hero's marker visible when a place on another floor is selected", async () => {
		stubGateway();
		const rec = await recorded();
		rec.reset();
		let linked = $state("inn/common_room");
		const rendered = render(MapCanvas, {
			...base,
			// Floors are only loaded in `full` (Play's stage map filling the viewport).
			mode: "full" as const,
			followPlace: true,
			get placeNodeId() {
				return linked;
			},
			// The seat stays in the common room (floor 0) ...
			minePlaces: [{ entityId: HERO, placeNodeId: "inn/common_room" }],
			mineEntityIds: [HERO],
		});
		try {
			await waitFor(() => expect(seatMarker(rec)?.lngLat).toEqual([10, 20]));
			await waitFor(() => expect(rec.flights).toHaveLength(1));
			await settle();
			// ... while the canvas selects the cellar (floor -1).
			linked = "inn/cellar";
			flushSync();
			await waitFor(() => expect(rec.flights).toHaveLength(2));
			await settle();
			expect(seatMarker(rec)?.element?.style.display).not.toBe("none");
		} finally {
			rendered.unmount();
			vi.unstubAllGlobals();
		}
	});

	it("without followPlace the link is boot-only and the seat keeps its own flight (apps/maps)", async () => {
		stubGateway();
		const rec = await recorded();
		rec.reset();
		let linked = $state("inn/common_room");
		let mine = $state.raw<ActorPlace[]>([{ entityId: HERO, placeNodeId: "inn/cellar" }]);
		const rendered = render(MapCanvas, {
			...base,
			mode: "full" as const,
			get placeNodeId() {
				return linked;
			},
			get minePlaces() {
				return mine;
			},
			mineEntityIds: [HERO],
		});
		try {
			// Boot: the deep link flies, then the seat flies (the seat ends on top).
			await waitFor(() => expect(rec.flights).toHaveLength(2));
			await settle();
			expect(rec.flights.map((row) => row.center)).toEqual([
				[10, 20],
				[11, 21],
			]);
			// A later prop change is not followed.
			linked = "inn/yard";
			flushSync();
			await settle();
			expect(rec.flights).toHaveLength(2);
			// A seat move flies on its own, linked place or not.
			mine = [{ entityId: HERO, placeNodeId: "inn/yard" }];
			flushSync();
			await waitFor(() => expect(rec.flights).toHaveLength(3));
			expect(rec.flights[2]?.center).toEqual([12, 22]);
		} finally {
			rendered.unmount();
			vi.unstubAllGlobals();
		}
	});
});
