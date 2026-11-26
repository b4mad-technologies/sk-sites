import { describe, expect, it } from "vitest";

import {
	buildNameSearchQuery,
	escapeOverpassRegex,
	mergeOsmPlaceHits,
	mergeSearchHits,
	nextResultIndex,
	occupancyNameHits,
	parseOverpassHits,
	placeExitsFromHits,
	searchHitMeta,
	thingNameHits,
} from "./search";

describe("search query builder", () => {
	it("builds case-insensitive name regex over bbox", () => {
		const q = buildNameSearchQuery("Inn", {
			west: -122.3,
			south: 47.49,
			east: -122.29,
			north: 47.5,
		});
		expect(q).toContain('nwr["name"~"Inn",i](47.49,-122.3,47.5,-122.29)');
		expect(q).toContain("out center");
	});

	it("escapes regex metacharacters in user text", () => {
		expect(escapeOverpassRegex('a"b\\c')).toBe('a\\"b\\\\c');
		expect(buildNameSearchQuery('foo"bar', { west: 0, south: 0, east: 1, north: 1 })).toContain(
			'name"~"foo\\"bar"',
		);
	});

	it("parses Overpass elements with center", () => {
		const hits = parseOverpassHits({
			elements: [
				{
					type: "way",
					id: 1,
					center: { lon: -122.3, lat: 47.5 },
					tags: { name: "Foyer", "spellkave:graph": "elven_mini/inn" },
				},
				{ type: "node", id: 2, lon: -122.31, lat: 47.51, tags: { name: "Crossroads" } },
			],
		});
		expect(hits).toHaveLength(2);
		expect(hits[0]).toMatchObject({
			name: "Foyer",
			graph: "elven_mini/inn",
			lon: -122.3,
			lat: 47.5,
		});
		expect(hits[1]?.name).toBe("Crossroads");
		expect(hits[0]?.kind).toBe("place");
		expect(hits[0] && searchHitMeta(hits[0])).toBe("Place · elven_mini/inn");
		expect(hits[1] && searchHitMeta(hits[1])).toBe("Place");
	});
});

describe("occupancy name search", () => {
	it("matches people by name and labels them Person", () => {
		const coords = new Map([["inn/hall", { lon: 1, lat: 2 }]]);
		const places = new Map([["inn/hall", "Stonehill Inn"]]);
		const hits = occupancyNameHits(
			"ald",
			[{ entityId: "9", placeNodeId: "inn/hall", name: "Aldwin" }],
			coords,
			places,
		);
		expect(hits).toHaveLength(1);
		expect(hits[0]).toMatchObject({
			kind: "person",
			name: "Aldwin",
			entityId: "9",
			lon: 1,
			lat: 2,
		});
		expect(hits[0] && searchHitMeta(hits[0])).toBe("Person · Stonehill Inn");
	});

	it("flags a person whose node has no coordinates as off map", () => {
		const coords = new Map([["inn/hall", { lon: 1, lat: 2 }]]);
		const places = new Map([
			["inn/hall", "Stonehill Inn"],
			["limbo/station", "Creation limbo · Station"],
		]);
		const hits = occupancyNameHits(
			"ald",
			[
				{ entityId: "9", placeNodeId: "inn/hall", name: "Aldwin" },
				{ entityId: "4", placeNodeId: "limbo/station", name: "Aldwin (off map)" },
			],
			coords,
			places,
		);
		expect(hits[0]?.offMap).toBeFalsy();
		expect(hits[0] && searchHitMeta(hits[0])).toBe("Person · Stonehill Inn");
		expect(hits[1]?.offMap).toBe(true);
		expect(hits[1]?.lon).toBe(0);
		expect(hits[1] && searchHitMeta(hits[1])).toBe("Person · Creation limbo · Station · off map");
	});

	it("merges people ahead of places and caps the list", () => {
		const people = occupancyNameHits(
			"an",
			[{ entityId: "1", placeNodeId: "a", name: "Ann" }],
			new Map(),
			new Map(),
		);
		const places = parseOverpassHits({
			elements: [{ type: "node", id: 2, lon: 0, lat: 0, tags: { name: "Anvil" } }],
		});
		const merged = mergeSearchHits(people, places, 1);
		expect(merged).toHaveLength(1);
		expect(merged[0]?.kind).toBe("person");
	});

	it("browses every person when asked with an empty query", () => {
		const hits = occupancyNameHits(
			"",
			[{ entityId: "9", placeNodeId: "inn/hall", name: "Aldwin" }],
			new Map(),
			new Map(),
			true,
		);
		expect(hits).toHaveLength(1);
		expect(hits[0]?.name).toBe("Aldwin");
	});

	it("labels carried things with their holder", () => {
		const hits = thingNameHits(
			"long",
			[
				{
					entityId: "155",
					placeNodeId: "mill/altar",
					name: "Longsword (+1)",
					holderName: "Sister Maelis",
					holderEntityId: "41",
				},
			],
			new Map([["mill/altar", { lon: 3, lat: 4 }]]),
		);
		expect(hits[0]?.kind).toBe("thing");
		expect(hits[0] && searchHitMeta(hits[0])).toBe("Thing · carried by Sister Maelis");
	});
});

describe("nextResultIndex", () => {
	it("starts at an end when nothing is focused", () => {
		expect(nextResultIndex(-1, 1, 3)).toBe(0);
		expect(nextResultIndex(-1, -1, 3)).toBe(2);
	});

	it("moves and wraps within the list", () => {
		expect(nextResultIndex(0, 1, 3)).toBe(1);
		expect(nextResultIndex(2, 1, 3)).toBe(0);
		expect(nextResultIndex(0, -1, 3)).toBe(2);
	});

	it("is a no-op on an empty list", () => {
		expect(nextResultIndex(0, 1, 0)).toBe(0);
	});
});

describe("mergeOsmPlaceHits", () => {
	it("keeps node description and way extent", () => {
		const merged = mergeOsmPlaceHits([
			{
				id: "1",
				osmType: "way",
				name: "Crypt Entrance",
				graph: "elven_mini/cursed_crypt",
				lon: 1,
				lat: 2,
				tags: {
					name: "Crypt Entrance",
					level: "0",
					"spellkave:extent_params": '{"extent_m":9}',
					"spellkave:extent_shape": "core/area/cube",
				},
				kind: "place",
			},
			{
				id: "2",
				osmType: "node",
				name: "Crypt Entrance",
				graph: "elven_mini/cursed_crypt",
				lon: 1,
				lat: 2,
				tags: {
					name: "Crypt Entrance",
					description: "A low stone lintel.",
					"spellkave:graph": "elven_mini/cursed_crypt",
				},
				kind: "place",
			},
		]);
		expect(merged?.tags.description).toBe("A low stone lintel.");
		expect(merged?.tags["spellkave:extent_params"]).toContain("extent_m");
	});
});

describe("placeExitsFromHits", () => {
	it("lists other named nodes and marks outdoor ones", () => {
		const exits = placeExitsFromHits(
			[
				{
					id: "1",
					osmType: "node",
					name: "Crypt Entrance",
					graph: "c",
					lon: 0,
					lat: 0,
					tags: { "spellkave:node_id": "elven_mini/cursed_crypt/entrance" },
					kind: "place",
				},
				{
					id: "2",
					osmType: "node",
					name: "Vestibule",
					graph: "c",
					lon: 0,
					lat: 0,
					tags: {
						"spellkave:node_id": "elven_mini/cursed_crypt/vestibule",
						"spellkave:substrate": "indoor",
					},
					kind: "place",
				},
				{
					id: "3",
					osmType: "node",
					name: "Path to Cursed Crypt",
					graph: "h",
					lon: 0,
					lat: 0,
					tags: {
						"spellkave:node_id": "elven_mini/hamlet/crypt_path",
						"spellkave:substrate": "outdoor",
					},
					kind: "place",
				},
				{
					id: "4",
					osmType: "node",
					name: "Unconnected Place",
					graph: "h",
					lon: 0,
					lat: 0,
					tags: {
						"spellkave:node_id": "elven_mini/hamlet/unconnected",
						"spellkave:substrate": "outdoor",
					},
					kind: "place",
				},
				{
					id: "w1",
					osmType: "way",
					name: "Edge to Vestibule",
					graph: "c",
					lon: 0,
					lat: 0,
					tags: {
						"spellkave:from_node": "elven_mini/cursed_crypt/entrance",
						"spellkave:to_node": "elven_mini/cursed_crypt/vestibule",
					},
					kind: "place",
				},
				{
					id: "w2",
					osmType: "way",
					name: "Edge to Crypt Path",
					graph: "h",
					lon: 0,
					lat: 0,
					tags: {
						"spellkave:from_node": "elven_mini/hamlet/crypt_path",
						"spellkave:to_node": "elven_mini/cursed_crypt/entrance",
					},
					kind: "place",
				},
			],
			"elven_mini/cursed_crypt/entrance",
		);
		expect(exits.map((e) => e.name)).toEqual(["Path to Cursed Crypt", "Vestibule"]);
		expect(exits.find((e) => e.name === "Path to Cursed Crypt")?.outdoor).toBe(true);
	});

	it("populates traversalMode, seal, and locked from connecting way tags", () => {
		const exits = placeExitsFromHits(
			[
				{
					id: "1",
					osmType: "node",
					name: "Cliff Edge",
					graph: "g",
					lon: 0,
					lat: 0,
					tags: { "spellkave:node_id": "world/cliff" },
					kind: "place",
				},
				{
					id: "2",
					osmType: "node",
					name: "Eagle Peak",
					graph: "g",
					lon: 0,
					lat: 0,
					tags: { "spellkave:node_id": "world/peak" },
					kind: "place",
				},
				{
					id: "3",
					osmType: "node",
					name: "Iron Vault",
					graph: "g",
					lon: 0,
					lat: 0,
					tags: { "spellkave:node_id": "world/vault" },
					kind: "place",
				},
				{
					id: "w1",
					osmType: "way",
					name: "Fly Way",
					graph: "g",
					lon: 0,
					lat: 0,
					tags: {
						"spellkave:from_node": "world/cliff",
						"spellkave:to_node": "world/peak",
						"spellkave:traversal_mode": "fly",
					},
					kind: "place",
				},
				{
					id: "w2",
					osmType: "way",
					name: "Vault Gate",
					graph: "g",
					lon: 0,
					lat: 0,
					tags: {
						"spellkave:from_node": "world/cliff",
						"spellkave:to_node": "world/vault",
						barrier: "gate",
						"spellkave:seal": "mod/ironfold_seal",
						"spellkave:locked": "yes",
					},
					kind: "place",
				},
			],
			"world/cliff",
		);

		const peak = exits.find((e) => e.nodeId === "world/peak");
		expect(peak?.traversalMode).toBe("fly");

		const vault = exits.find((e) => e.nodeId === "world/vault");
		expect(vault?.seal).toBe("mod/ironfold_seal");
		expect(vault?.locked).toBe(true);
	});
});
