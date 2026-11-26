import { describe, expect, it } from "vitest";
import { blocked, failed, loading, noArt, noticeText, readLoadedFlag, ready } from "./map-notice";

it("lets a consumer replace copy without hiding failure status or diagnostic detail", () => {
	const notice = failed(new Error("style.json HTTP 503"));
	expect(noticeText(notice, { failed: "Reopen Map to retry." })).toBe("Reopen Map to retry.");
	expect(notice.kind).toBe("failed");
	expect(notice.detail).toBe("style.json HTTP 503");
	expect(noticeText(notice)).toBe(notice.text);
	expect(noticeText(blocked(), { failed: "Retry." })).toBe(blocked().text);
	expect(noticeText(ready("world", "CC-BY attribution"), { blocked: "Reconnect." })).toContain(
		"CC-BY attribution",
	);
});

/** The HTTP shapes the surface used to put in front of a person, verbatim. */
const MACHINE_STRINGS = [
	"style.json HTTP 404",
	"tiles.json HTTP 503",
	"login + world required",
	"map error: Failed to fetch",
];

describe("map notices", () => {
	it("never puts a machine string in the sentence a person reads", () => {
		const sentences = [
			blocked().text,
			loading().text,
			ready("kavemouth-1", "CC BY Spellkave").text,
			noArt("kavemouth-1").text,
			...MACHINE_STRINGS.map((s) => failed(new Error(s)).text),
		];
		for (const text of sentences) {
			expect(text).not.toMatch(/HTTP \d/);
			expect(text).not.toMatch(/\.json/);
			expect(text).not.toMatch(/login \+ world/);
		}
	});

	it("keeps the technical cause for a developer, out of the sentence", () => {
		const notice = failed(new Error("style.json HTTP 404"));
		expect(notice.detail).toBe("style.json HTTP 404");
		expect(notice.text).not.toContain("404");
	});

	it("distinguishes an empty world from a genuine failure", () => {
		expect(noArt("kavemouth-1").kind).toBe("no-art");
		expect(failed(new Error("boom")).kind).toBe("failed");
		// The bead's second acceptance clause: these must not read alike.
		expect(noArt("kavemouth-1").text).not.toEqual(failed(new Error("boom")).text);
		expect(failed(new Error("boom")).text).toMatch(/fault, not an empty world/);
	});

	it("names the world in the empty-world sentence", () => {
		expect(noArt("kavemouth-3").text).toContain("kavemouth-3");
	});

	it("still credits attribution when the world is ready", () => {
		expect(ready("w", "CC BY Spellkave").text).toBe("w · CC BY Spellkave");
		expect(ready("w", "").text).toBe("w");
	});

	describe("readLoadedFlag", () => {
		it("reads the flag the gateway ships", () => {
			expect(readLoadedFlag({ v: "spellkave-backdrops/v1", loaded: true })).toBe(true);
			expect(readLoadedFlag({ v: "spellkave-backdrops/v1", loaded: false })).toBe(false);
		});

		it("treats today's BARE ARRAY response as 'cannot tell', not as 'not loaded'", () => {
			// The live route still answers `[ {...}, {...} ]`. #2681 changes it to
			// `{ v, backdrops, loaded }`. An array is `typeof === "object"`, so the
			// guard below must fall through to the field check and return null
			// rather than reading `.loaded` off an array and getting undefined-as-false.
			expect(readLoadedFlag([{ url: "a.webp" }, { url: "b.webp" }])).toBeNull();
			expect(readLoadedFlag([])).toBeNull();
		});

		it("returns null when the field is absent, so an older gateway is not accused", () => {
			// A deployment from before #2681 omits `loaded`. Treating that as
			// `false` would tell a person their world is empty when we cannot tell.
			expect(readLoadedFlag({ v: "spellkave-backdrops/v1", backdrops: [] })).toBeNull();
			expect(readLoadedFlag({ loaded: "yes" })).toBeNull();
			expect(readLoadedFlag(null)).toBeNull();
			expect(readLoadedFlag("nope")).toBeNull();
		});
	});
});
