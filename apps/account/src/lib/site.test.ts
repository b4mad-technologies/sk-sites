import { describe, expect, it } from "vitest";

import { DEFAULT_SITE_URL, readSiteUrl } from "./site";

const DATA_FEED_URL = "https://pub-ea8569d32ce14599a073902fa19300fb.r2.dev";

describe("readSiteUrl", () => {
	it("defaults to the public website when VITE_SPELLKAVE_SITE_URL is unset", () => {
		expect(readSiteUrl({})).toBe(DEFAULT_SITE_URL);
		expect(readSiteUrl({ VITE_SPELLKAVE_SITE_URL: undefined })).toBe(DEFAULT_SITE_URL);
	});

	it("treats an empty or blank value as unset, because that is what CI passes", () => {
		// GitHub Actions substitutes an unset repo variable with "", never absent.
		expect(readSiteUrl({ VITE_SPELLKAVE_SITE_URL: "" })).toBe(DEFAULT_SITE_URL);
		expect(readSiteUrl({ VITE_SPELLKAVE_SITE_URL: "   " })).toBe(DEFAULT_SITE_URL);
	});

	it("does not use VITE_SPELLKAVE_PUBLIC_SITE_URL for the link", () => {
		expect(
			readSiteUrl({
				VITE_SPELLKAVE_PUBLIC_SITE_URL: DATA_FEED_URL,
			}),
		).toBe(DEFAULT_SITE_URL);
		expect(
			readSiteUrl({
				VITE_SPELLKAVE_PUBLIC_SITE_URL: DATA_FEED_URL,
				VITE_SPELLKAVE_SITE_URL: "https://example.com",
			}),
		).toBe("https://example.com");
	});
});
