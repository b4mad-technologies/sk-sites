import { describe, expect, it } from "vitest";

import {
	backdropVisible,
	extentHalfMetersFromTags,
	formatPlaceExtent,
	framePaddingPx,
	geometryArea,
	graphFromPlace,
	hoverCardFromProperties,
	hoverCardHtml,
	indoorGraphFromPlace,
	lngLatBox,
	nextOverlapIndex,
	nodeIdFromProperties,
	placeFromHit,
	placeFromProperties,
	placeRowsFromProperties,
	splitPlaceRows,
	uniqueByNodeIdSmallest,
} from "./place";

describe("place rows", () => {
	it("orders name/description/level then spellkave:* tags", () => {
		const rows = placeRowsFromProperties({
			"spellkave:node_id": "elven_mini/inn/foyer",
			name: "Foyer",
			description: "Warm entry",
			level: "0",
			highway: "path",
			"spellkave:graph": "elven_mini/inn",
		});
		expect(rows.map((r) => r.key)).toEqual([
			"name",
			"description",
			"level",
			"spellkave:graph",
			"spellkave:node_id",
		]);
		expect(nodeIdFromProperties({ "spellkave:node_id": "x" })).toBe("x");
	});
});

describe("place selection", () => {
	it("names a clicked feature by its name, falling back to the node id", () => {
		const named = placeFromProperties({ name: "Foyer", "spellkave:node_id": "a/b" }, 1, 2);
		expect(named).toMatchObject({ name: "Foyer", nodeId: "a/b", lon: 1, lat: 2 });
		const bare = placeFromProperties({ "spellkave:node_id": "a/b" }, 1, 2);
		expect(bare.name).toBe("a/b");
		expect(placeFromProperties({}, 0, 0).name).toBe("Unnamed place");
	});

	it("builds the same shape from a search hit", () => {
		const place = placeFromHit({
			id: "1",
			osmType: "node",
			name: "Crossroads",
			kind: "place",
			graph: "elven_mini/region",
			lon: -122.3,
			lat: 47.5,
			tags: { name: "Crossroads", "spellkave:node_id": "elven_mini/region/crossroads" },
		});
		expect(place.name).toBe("Crossroads");
		expect(place.nodeId).toBe("elven_mini/region/crossroads");
		expect(place.rows.map((r) => r.key)).toEqual(["name", "spellkave:node_id"]);
	});
});

describe("splitPlaceRows", () => {
	it("keeps description and identity visible, tucks grid cells and positions away, drops the name", () => {
		const { primary, extra } = splitPlaceRows([
			{ key: "name", value: "Crossroads" },
			{ key: "description", value: "A rutted crossroads" },
			{ key: "spellkave:cell_res10", value: "622215095455350783" },
			{ key: "spellkave:graph", value: "elven_mini/region" },
			{ key: "spellkave:pos_x", value: "13" },
			{ key: "spellkave:node_id", value: "elven_mini/region/crossroads" },
		]);
		expect(primary.map((r) => r.key)).toEqual([
			"description",
			"spellkave:graph",
			"spellkave:node_id",
		]);
		expect(extra.map((r) => r.key)).toEqual(["spellkave:cell_res10", "spellkave:pos_x"]);
	});
});

describe("hover card", () => {
	it("is a compact name, floor, occupancy, and snippet", () => {
		const card = hoverCardFromProperties(
			{ name: "Lodge Porch", description: "A covered porch.", level: "0" },
			2,
		);
		expect(card).toEqual({
			name: "Lodge Porch",
			meta: "Floor 0 · 2 people",
			snippet: "A covered porch.",
		});
		expect(hoverCardHtml(card!)).toContain("place-hover__name");
		expect(hoverCardHtml(card!)).toContain("Floor 0 · 2 people");
	});

	it("includes entrance indicator in meta", () => {
		const card = hoverCardFromProperties(
			{
				name: "Well Mouth",
				description: "The stone well-mouth in the square.",
				level: "0",
				entrance: "yes",
			},
			0,
		);
		expect(card).toEqual({
			name: "Well Mouth",
			meta: "Entrance · Floor 0",
			snippet: "The stone well-mouth in the square.",
		});
	});

	it("skips unnamed features", () => {
		expect(hoverCardFromProperties({ description: "no" })).toBeNull();
	});
});

describe("place extent", () => {
	it("reads cube half-extents from OSM tags", () => {
		expect(
			extentHalfMetersFromTags({
				"spellkave:extent_shape": "core/area/cube",
				"spellkave:extent_params": '{"extent_m":9}',
			}),
		).toEqual({ x_m: 9, y_m: 9 });
	});

	it("reads sphere radius as half-extent", () => {
		expect(
			extentHalfMetersFromTags({
				"spellkave:extent_shape": "core/area/sphere",
				"spellkave:extent_params": '{"radius_m":2.5}',
			}),
		).toEqual({ x_m: 2.5, y_m: 2.5 });
	});

	it("prints full width from half-extents", () => {
		expect(formatPlaceExtent({ x_m: 9, y_m: 9 })).toBe("18 m across");
		expect(formatPlaceExtent({ x_m: 4, y_m: 2 })).toBe("8 × 4 m");
	});

	it("boxes a metre span around a lon/lat", () => {
		const box = lngLatBox(10, 54, 1, 1);
		expect(box[0][0]).toBeLessThan(10);
		expect(box[1][0]).toBeGreaterThan(10);
		expect(box[1][0] - box[0][0]).toBeGreaterThan(0);
	});
});

describe("overlap picking", () => {
	it("ranks a smaller polygon first", () => {
		const small = geometryArea({
			type: "Polygon",
			coordinates: [
				[
					[0, 0],
					[1, 0],
					[1, 1],
					[0, 1],
					[0, 0],
				],
			],
		});
		const large = geometryArea({
			type: "Polygon",
			coordinates: [
				[
					[0, 0],
					[2, 0],
					[2, 2],
					[0, 2],
					[0, 0],
				],
			],
		});
		expect(small).toBeLessThan(large);
	});

	it("cycles through the stack", () => {
		const ids = ["path", "entrance"];
		expect(nextOverlapIndex(ids, null)).toBe(0);
		expect(nextOverlapIndex(ids, "path")).toBe(1);
		expect(nextOverlapIndex(ids, "entrance")).toBe(0);
	});

	it("keeps the smallest record per node id", () => {
		const ranked = uniqueByNodeIdSmallest([
			{ nodeId: "a", area: 4 },
			{ nodeId: "a", area: 1 },
			{ nodeId: "b", area: 3 },
		]);
		expect(ranked.map((row) => row.nodeId)).toEqual(["a", "b"]);
		expect(ranked[0]?.area).toBe(1);
	});
});

describe("indoorGraphFromPlace", () => {
	it("returns the graph for an indoor room or entrance", () => {
		expect(
			indoorGraphFromPlace({
				name: "Crypt Entrance",
				nodeId: "elven_mini/cursed_crypt/entrance",
				lon: 0,
				lat: 0,
				rows: [
					{ key: "indoor", value: "room" },
					{ key: "spellkave:graph", value: "elven_mini/cursed_crypt" },
				],
			}),
		).toBe("elven_mini/cursed_crypt");
		expect(
			indoorGraphFromPlace({
				name: "Crypt Entrance",
				nodeId: "elven_mini/cursed_crypt/entrance",
				lon: 0,
				lat: 0,
				rows: [
					{ key: "entrance", value: "yes" },
					{ key: "spellkave:graph", value: "elven_mini/cursed_crypt" },
				],
			}),
		).toBe("elven_mini/cursed_crypt");
	});

	it("is outdoor for a hamlet path", () => {
		expect(
			indoorGraphFromPlace({
				name: "Path to Cursed Crypt",
				nodeId: "elven_mini/hamlet/crypt_path",
				lon: 0,
				lat: 0,
				rows: [{ key: "spellkave:graph", value: "elven_mini/hamlet" }],
			}),
		).toBeNull();
	});
});

describe("place rows include indoor tags", () => {
	it("copies indoor and entrance so the map can show a dungeon graph", () => {
		const rows = placeRowsFromProperties({
			name: "Crypt Entrance",
			indoor: "room",
			entrance: "yes",
			"spellkave:graph": "elven_mini/cursed_crypt",
			"spellkave:node_id": "elven_mini/cursed_crypt/entrance",
		});
		expect(rows.map((r) => r.key)).toContain("indoor");
		expect(rows.map((r) => r.key)).toContain("entrance");
		expect(
			indoorGraphFromPlace({
				name: "Crypt Entrance",
				nodeId: "elven_mini/cursed_crypt/entrance",
				lon: 0,
				lat: 0,
				rows,
			}),
		).toBe("elven_mini/cursed_crypt");
	});
});

describe("framePaddingPx", () => {
	it("leaves half the usable map for the feature", () => {
		expect(framePaddingPx(800, 400, 0.5, 0)).toEqual({
			top: 100,
			bottom: 100,
			left: 200,
			right: 200,
		});
		expect(framePaddingPx(800, 400, 0.5, 320)).toEqual({
			top: 100,
			bottom: 100,
			left: 320 + 120,
			right: 120,
		});
	});
});

describe("backdropVisible", () => {
	const hamlet = { layer: "raster-hamlet", graph: "elven_mini/hamlet", indoor: false };
	const crypt = { layer: "raster-crypt", graph: "elven_mini/cursed_crypt", indoor: true };

	it("shows outdoor sheets when nothing is selected", () => {
		expect(backdropVisible(hamlet, null)).toBe(true);
		expect(backdropVisible(crypt, null)).toBe(false);
	});

	it("shows only the selected graph sheet", () => {
		expect(backdropVisible(hamlet, "elven_mini/cursed_crypt")).toBe(false);
		expect(backdropVisible(crypt, "elven_mini/cursed_crypt")).toBe(true);
		expect(backdropVisible(hamlet, "elven_mini/hamlet")).toBe(true);
		expect(backdropVisible(crypt, "elven_mini/hamlet")).toBe(false);
	});
});
