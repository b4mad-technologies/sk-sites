import { describe, expect, it } from "vitest";
import {
	buildMapsLocator,
	buildWorldLocator,
	MAPS_LOCATOR_EVENT,
	parseMapsLocator,
	publishMapsLocator,
} from "./locator";

describe("maps locator", () => {
	it("builds path URLs and ignores leftover query", () => {
		expect(
			buildMapsLocator(
				"http://192.0.2.10:5174/?world=stale",
				"kavemouth",
				"place",
				"kavemouth/bramble_crypt/entrance",
			),
		).toBe("http://192.0.2.10:5174/w/kavemouth/place/kavemouth/bramble_crypt/entrance");
		expect(buildWorldLocator("http://localhost:5174/auth/callback", "kavemouth")).toBe(
			"http://localhost:5174/w/kavemouth",
		);
	});

	it("parses world and resource paths only", () => {
		expect(parseMapsLocator("http://localhost:5174/w/kavemouth")).toEqual({
			world: "kavemouth",
			place: null,
			person: null,
			thing: null,
		});
		expect(
			parseMapsLocator("http://localhost:5174/w/kavemouth/place/kavemouth/bramble_crypt/entrance"),
		).toEqual({
			world: "kavemouth",
			place: "kavemouth/bramble_crypt/entrance",
			person: null,
			thing: null,
		});
		expect(parseMapsLocator("http://localhost:5174/?world=kavemouth&place=x")).toEqual({
			world: null,
			place: null,
			person: null,
			thing: null,
		});
	});

	it("publishMapsLocator dispatches event on change or fly, but suppresses duplicate events", () => {
		window.history.replaceState({}, "", "/w/kavemouth");
		const events: unknown[] = [];
		const listener = (e: Event) => events.push((e as CustomEvent).detail);
		window.addEventListener(MAPS_LOCATOR_EVENT, listener);

		try {
			// First publish: URL changes from /w/kavemouth to /w/kavemouth/place/room1
			publishMapsLocator("kavemouth", "place", "room1", false);
			expect(events.length).toBe(1);
			expect(window.location.pathname).toBe("/w/kavemouth/place/room1");

			// Second publish with same resource and fly = false: should not dispatch event
			publishMapsLocator("kavemouth", "place", "room1", false);
			expect(events.length).toBe(1);

			// Third publish with same resource but fly = true: should dispatch event with fly: true
			publishMapsLocator("kavemouth", "place", "room1", true);
			expect(events.length).toBe(2);
			expect(events[1]).toEqual({ fly: true });
		} finally {
			window.removeEventListener(MAPS_LOCATOR_EVENT, listener);
		}
	});
});
