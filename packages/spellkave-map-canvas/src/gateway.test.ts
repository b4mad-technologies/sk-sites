import { describe, expect, it } from "vitest";

import { createTransformRequest, isGatewayUrl, styleUrl } from "./gateway";

describe("createTransformRequest", () => {
	const origin = "https://mcp.spellkave.com";
	const token = "tok-abc";

	it("adds Bearer only for the gateway origin", () => {
		const tr = createTransformRequest(origin, token);
		expect(tr(`${origin}/w/elven-mini/style.json`, "Style")).toEqual({
			url: `${origin}/w/elven-mini/style.json`,
			headers: { Authorization: "Bearer tok-abc" },
		});
		expect(tr(`${origin}/w/elven-mini/tiles/14/1/2.pbf`, "Tile").headers).toEqual({
			Authorization: "Bearer tok-abc",
		});
		expect(tr(`${origin}/w/elven-mini/assets/ccc3-maps/maps/x.jpg`, "Image").headers).toEqual({
			Authorization: "Bearer tok-abc",
		});
		expect(tr(`${origin}/w/elven-mini/fonts/Noto%20Sans/0-255.pbf`, "Glyphs").headers).toEqual({
			Authorization: "Bearer tok-abc",
		});
		// External / non-gateway URLs stay unauthenticated.
		expect(tr("https://example.com/tiles/1/2/3.pbf", "Tile")).toEqual({
			url: "https://example.com/tiles/1/2/3.pbf",
		});
		expect(tr("https://demotiles.maplibre.org/style.json", "Style").headers).toBeUndefined();
	});

	it("skips Authorization when token is empty", () => {
		const tr = createTransformRequest(origin, "  ");
		expect(tr(`${origin}/w/x/style.json`, "Style")).toEqual({
			url: `${origin}/w/x/style.json`,
		});
	});

	it("isGatewayUrl and styleUrl helpers", () => {
		expect(isGatewayUrl("https://mcp.spellkave.com/w/a/style.json", origin)).toBe(true);
		expect(isGatewayUrl("https://evil.example/w/a", origin)).toBe(false);
		expect(styleUrl(origin, "elven-mini")).toBe(`${origin}/w/elven-mini/style.json`);
	});
});
