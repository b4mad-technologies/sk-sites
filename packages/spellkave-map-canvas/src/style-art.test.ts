import { describe, expect, it } from "vitest";

import { isBackdropAssetError, stripBackdrops } from "./style-art";

const style = {
	version: 8,
	sources: {
		spellkave: { type: "vector", url: "https://gw/w/x/tiles.json" },
		"bd-a": { type: "image", url: "https://gw/w/x/assets/m/a.jpg", coordinates: [] },
	},
	layers: [
		{ id: "background", type: "background" },
		{ id: "raster-a", type: "raster", source: "bd-a" },
		{ id: "node-circle", type: "circle", source: "spellkave", "source-layer": "spellkave_node" },
	],
};

describe("stripBackdrops", () => {
	it("drops image sources and the layers drawing them, keeps everything else", () => {
		const next = stripBackdrops(style);
		expect(Object.keys(next.sources)).toEqual(["spellkave"]);
		expect(next.layers.map((l) => l.id)).toEqual(["background", "node-circle"]);
		expect(next.version).toBe(8);
	});

	it("returns the same object when there is no art to strip", () => {
		const plain = { sources: { spellkave: { type: "vector" } }, layers: [] };
		expect(stripBackdrops(plain)).toBe(plain);
	});
});

describe("isBackdropAssetError", () => {
	it("recognises a 404 on a backdrop image and nothing else", () => {
		expect(
			isBackdropAssetError(
				"AJAXError:  (404): https://mcp.spellkave.com/w/kavemouth-1/assets/kavemouth-maps/maps/hamlet.png",
			),
		).toBe(true);
		expect(isBackdropAssetError("style.json HTTP 503")).toBe(false);
	});
});
