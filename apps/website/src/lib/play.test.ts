import { describe, expect, it } from "vitest";

import { formatPlayError, playConnectUrl, readPlayUrl } from "./play";

describe("play URL", () => {
	it("treats missing or non-url values as unwired", () => {
		expect(readPlayUrl({})).toBeNull();
		expect(readPlayUrl({ VITE_SPELLKAVE_PLAY_URL: "" })).toBeNull();
		expect(readPlayUrl({ VITE_SPELLKAVE_PLAY_URL: "world.spellkave.com" })).toBeNull();
	});

	it("accepts http(s) and ws(s) and strips a trailing slash", () => {
		expect(readPlayUrl({ VITE_SPELLKAVE_PLAY_URL: "ws://127.0.0.1:3000/" })).toBe(
			"ws://127.0.0.1:3000",
		);
		expect(readPlayUrl({ VITE_SPELLKAVE_PLAY_URL: "https://world.spellkave.com" })).toBe(
			"https://world.spellkave.com",
		);
	});

	it("normalizes ws to http for connect + schema fetch", () => {
		expect(playConnectUrl("ws://127.0.0.1:3000")).toBe("http://127.0.0.1:3000");
		expect(playConnectUrl("wss://world.spellkave.com")).toBe("https://world.spellkave.com");
		expect(playConnectUrl("http://127.0.0.1:3000")).toBe("http://127.0.0.1:3000");
	});
});

describe("play errors", () => {
	it("asks for a fresh login on expired tokens", () => {
		expect(formatPlayError(new Error("401 Unauthorized"))).toBe("Please log in again.");
		expect(formatPlayError("jwt expired")).toBe("Please log in again.");
		expect(formatPlayError(new Error("seat already claimed"))).toBe("seat already claimed");
	});
});
