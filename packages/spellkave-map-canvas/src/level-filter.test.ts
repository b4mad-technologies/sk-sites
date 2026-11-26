import { describe, expect, it } from "vitest";

import {
	buildLevelFilter,
	buildPlaceViewFilter,
	floorForPlace,
	levelPredicate,
	parseLevelsFromTileJson,
	shouldShowFloorItem,
	sortLevelsHighToLow,
} from "./level-filter";

describe("level filter", () => {
	it("stacks numeric floors high to low", () => {
		expect(sortLevelsHighToLow(["0", "2", "1"])).toEqual(["2", "1", "0"]);
	});

	it("builds the any/has/eq/in predicate", () => {
		expect(levelPredicate("0")).toEqual([
			"any",
			["!", ["has", "level"]],
			["==", ["get", "level"], "0"],
			["in", "0", ["get", "level"]],
		]);
	});

	it("restores base filters when level is all", () => {
		expect(buildLevelFilter("room-fill", "all")).toBeNull();
		expect(buildLevelFilter("steps-dash", "all")).toEqual(["==", ["get", "highway"], "steps"]);
		expect(buildLevelFilter("door-symbol", "all")).toEqual(["==", ["get", "door"], "yes"]);
		expect(buildLevelFilter("flight-dash", "all")).toEqual([
			"==",
			["get", "spellkave:traversal_mode"],
			"fly",
		]);
		expect(buildLevelFilter("swim-dash", "all")).toEqual([
			"==",
			["get", "spellkave:traversal_mode"],
			"swim",
		]);
		expect(buildLevelFilter("barrier-dash", "all")).toEqual(["has", "spellkave:seal"]);
		expect(buildLevelFilter("water-fill", "all")).toEqual(["==", ["get", "natural"], "water"]);
		expect(buildLevelFilter("difficult-terrain-fill", "all")).toEqual([
			"==",
			["get", "spellkave:terrain"],
			"difficult",
		]);
		expect(buildLevelFilter("hazard-fill", "all")).toEqual(["has", "spellkave:hazard"]);
		expect(buildLevelFilter("traversal-label", "all")).toEqual([
			"any",
			["==", ["get", "spellkave:traversal_mode"], "fly"],
			["==", ["get", "spellkave:traversal_mode"], "swim"],
			["has", "spellkave:seal"],
		]);
		expect(buildLevelFilter("poi-symbol", "all")).toEqual(["has", "spellkave:poi_icon"]);
		expect(buildLevelFilter("node-circle", "all")).toEqual(["!", ["has", "spellkave:poi_icon"]]);
		expect(buildLevelFilter("node-label", "all")).toEqual(["!", ["has", "spellkave:poi_icon"]]);
	});

	it("ANDs level with steps/door/traversal specials", () => {
		const pred = levelPredicate("1");
		expect(buildLevelFilter("room-fill", "1")).toEqual(pred);
		expect(buildLevelFilter("steps-dash", "1")).toEqual([
			"all",
			pred,
			["==", ["get", "highway"], "steps"],
		]);
		expect(buildLevelFilter("door-symbol", "1")).toEqual([
			"all",
			pred,
			["==", ["get", "door"], "yes"],
		]);
		expect(buildLevelFilter("flight-dash", "1")).toEqual([
			"all",
			pred,
			["==", ["get", "spellkave:traversal_mode"], "fly"],
		]);
		expect(buildLevelFilter("swim-dash", "1")).toEqual([
			"all",
			pred,
			["==", ["get", "spellkave:traversal_mode"], "swim"],
		]);
		expect(buildLevelFilter("barrier-dash", "1")).toEqual(["all", pred, ["has", "spellkave:seal"]]);
		expect(buildLevelFilter("water-fill", "1")).toEqual([
			"all",
			pred,
			["==", ["get", "natural"], "water"],
		]);
		expect(buildLevelFilter("difficult-terrain-fill", "1")).toEqual([
			"all",
			pred,
			["==", ["get", "spellkave:terrain"], "difficult"],
		]);
		expect(buildLevelFilter("hazard-fill", "1")).toEqual([
			"all",
			pred,
			["has", "spellkave:hazard"],
		]);
		expect(buildLevelFilter("traversal-label", "1")).toEqual([
			"all",
			pred,
			[
				"any",
				["==", ["get", "spellkave:traversal_mode"], "fly"],
				["==", ["get", "spellkave:traversal_mode"], "swim"],
				["has", "spellkave:seal"],
			],
		]);
		expect(buildLevelFilter("poi-symbol", "1")).toEqual([
			"all",
			pred,
			["has", "spellkave:poi_icon"],
		]);
		expect(buildLevelFilter("node-circle", "1")).toEqual([
			"all",
			pred,
			["!", ["has", "spellkave:poi_icon"]],
		]);
		expect(buildLevelFilter("node-label", "1")).toEqual([
			"all",
			pred,
			["!", ["has", "spellkave:poi_icon"]],
		]);
	});

	it("parses tiles.json levels", () => {
		expect(parseLevelsFromTileJson({ levels: [0, "1", 2] })).toEqual(["0", "1", "2"]);
		expect(parseLevelsFromTileJson({})).toEqual([]);
	});
});

describe("floorForPlace", () => {
	const floors = ["-1", "0", "1"];

	it("returns null when the place has no level or the level is unknown", () => {
		expect(floorForPlace(null, floors)).toBeNull();
		expect(floorForPlace({}, floors)).toBeNull();
		expect(floorForPlace({ level: "" }, floors)).toBeNull();
		expect(floorForPlace({ level: "3" }, floors)).toBeNull();
		expect(floorForPlace([{ key: "name", value: "Crosscut" }], floors)).toBeNull();
	});

	it("maps a single level tag onto a known floor", () => {
		expect(floorForPlace({ level: 0 }, floors)).toBe("0");
		expect(floorForPlace({ level: "1" }, floors)).toBe("1");
		expect(floorForPlace([{ key: "level", value: "-1" }], floors)).toBe("-1");
	});

	it("picks the first known floor from a stairs-style 0;1 tag", () => {
		expect(floorForPlace({ level: "0;1" }, floors)).toBe("0");
		expect(floorForPlace({ level: "1;0" }, floors)).toBe("1");
		expect(floorForPlace({ level: "3;1" }, floors)).toBe("1");
		expect(floorForPlace([{ key: "level", value: " 0 ; 1 " }], floors)).toBe("0");
	});
});

describe("buildPlaceViewFilter", () => {
	it("shows outdoor extents and entrances on level 0", () => {
		expect(buildPlaceViewFilter("room-fill", { level: "0", indoorGraph: null })).toEqual([
			"all",
			levelPredicate("0"),
			["==", ["get", "spellkave:extent"], "yes"],
		]);
		expect(buildPlaceViewFilter("poi-symbol", { level: "0", indoorGraph: null })).toEqual([
			"all",
			levelPredicate("0"),
			["has", "spellkave:poi_icon"],
			["any", ["!", ["has", "indoor"]], ["==", ["get", "entrance"], "yes"]],
		]);
		expect(buildPlaceViewFilter("node-circle", { level: "0", indoorGraph: null })).toEqual([
			"all",
			levelPredicate("0"),
			["!", ["has", "spellkave:poi_icon"]],
			["any", ["!", ["has", "indoor"]], ["==", ["get", "entrance"], "yes"]],
		]);
	});

	it("shows indoor rooms and corridors on level -1 without selecting a dungeon", () => {
		expect(buildPlaceViewFilter("room-fill", { level: "-1", indoorGraph: null })).toEqual([
			"all",
			levelPredicate("-1"),
			["any", ["==", ["get", "spellkave:extent"], "yes"], ["==", ["get", "indoor"], "room"]],
		]);
		expect(buildPlaceViewFilter("node-circle", { level: "-1", indoorGraph: null })).toEqual([
			"all",
			levelPredicate("-1"),
			["!", ["has", "spellkave:poi_icon"]],
		]);
	});

	it("shows all rooms and removes node filter on level all", () => {
		expect(buildPlaceViewFilter("room-fill", { level: "all", indoorGraph: null })).toEqual([
			"any",
			["==", ["get", "spellkave:extent"], "yes"],
			["==", ["get", "indoor"], "room"],
		]);
		expect(buildPlaceViewFilter("node-circle", { level: "all", indoorGraph: null })).toEqual([
			"!",
			["has", "spellkave:poi_icon"],
		]);
	});

	it("adds the selected dungeon rooms and outdoor extents", () => {
		expect(
			buildPlaceViewFilter("room-fill", {
				level: "all",
				indoorGraph: "kavemouth/bramble_crypt",
			}),
		).toEqual([
			"any",
			["==", ["get", "spellkave:extent"], "yes"],
			["==", ["get", "spellkave:graph"], "kavemouth/bramble_crypt"],
		]);
	});

	it("adds the selected dungeon pins and corridors, keeps the hamlet", () => {
		expect(
			buildPlaceViewFilter("node-circle", {
				level: "all",
				indoorGraph: "kavemouth/bramble_crypt",
			}),
		).toEqual([
			"all",
			["!", ["has", "spellkave:poi_icon"]],
			[
				"any",
				["!", ["has", "indoor"]],
				["==", ["get", "spellkave:graph"], "kavemouth/bramble_crypt"],
			],
		]);
	});
});

describe("shouldShowFloorItem", () => {
	const wererat = { level: "-1", graph: "kavemouth/well", indoor: true };
	const villager = { level: undefined, graph: "kavemouth/hamlet", indoor: false };
	const wellGuard = { level: "0", graph: "kavemouth/well", indoor: true };

	it("shows all pins on level all", () => {
		expect(shouldShowFloorItem(wererat, "all", null)).toBe(true);
		expect(shouldShowFloorItem(villager, "all", null)).toBe(true);
		expect(shouldShowFloorItem(wellGuard, "all", null)).toBe(true);
	});

	it("filters subterranean actors on level 0", () => {
		expect(shouldShowFloorItem(wererat, "0", null)).toBe(false);
		expect(shouldShowFloorItem(villager, "0", null)).toBe(true);
		expect(shouldShowFloorItem(wellGuard, "0", null)).toBe(true);
	});

	it("reveals subterranean actors and hides surface actors on level -1", () => {
		expect(shouldShowFloorItem(wererat, "-1", null)).toBe(true);
		expect(shouldShowFloorItem(villager, "-1", null)).toBe(false);
		expect(shouldShowFloorItem(wellGuard, "-1", null)).toBe(false);
	});

	it("filters items by substrate (outdoor / indoor / tactical)", () => {
		const tacticalFighter = {
			level: "0",
			graph: "session_grid_1",
			indoor: false,
			substrate: "tactical",
		};
		expect(shouldShowFloorItem(tacticalFighter, "all", null, "tactical")).toBe(true);
		expect(shouldShowFloorItem(villager, "all", null, "tactical")).toBe(false);
		expect(shouldShowFloorItem(wererat, "all", null, "tactical")).toBe(false);

		expect(shouldShowFloorItem(tacticalFighter, "all", null, "outdoor")).toBe(false);
		expect(shouldShowFloorItem(villager, "all", null, "outdoor")).toBe(true);
		expect(shouldShowFloorItem(wererat, "all", null, "outdoor")).toBe(false);

		expect(shouldShowFloorItem(tacticalFighter, "all", null, "indoor")).toBe(false);
		expect(shouldShowFloorItem(villager, "all", null, "indoor")).toBe(false);
		expect(shouldShowFloorItem(wererat, "-1", null, "indoor")).toBe(true);
	});
});
