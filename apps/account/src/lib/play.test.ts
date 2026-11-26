import { describe, expect, it } from "vitest";

import { DEFAULT_PLAY_APP_URL, playHrefForSeat, playHrefForWorld, readPlayAppUrl } from "./play";

describe("playHrefForWorld", () => {
	it("points Play at the claimed world", () => {
		expect(playHrefForWorld("demo1")).toBe(`${DEFAULT_PLAY_APP_URL}?world=demo1`);
	});
});

describe("playHrefForSeat", () => {
	it("names the world and the hero", () => {
		expect(playHrefForSeat("demo1", "9")).toBe(`${DEFAULT_PLAY_APP_URL}?world=demo1&actor=9`);
	});
});

describe("readPlayAppUrl", () => {
	it("defaults to the hosted Play room", () => {
		expect(readPlayAppUrl({})).toBe(DEFAULT_PLAY_APP_URL);
	});

	it("rejects a non-http scheme", () => {
		expect(readPlayAppUrl({ VITE_SPELLKAVE_PLAY_URL: "javascript:alert(1)" })).toBe(
			DEFAULT_PLAY_APP_URL,
		);
	});
});
