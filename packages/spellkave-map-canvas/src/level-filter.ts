/**
 * Hand-rolled indoor level filter (maps-demo.html parity).
 * MapLibre style layers use a `level` property; client setFilter switches floors.
 */

/** Indoor / node layers that carry a `level` tag in the gateway style. */
export const LEVEL_LAYERS = [
	"room-fill",
	"water-fill",
	"difficult-terrain-fill",
	"hazard-fill",
	"corridor-line",
	"steps-dash",
	"flight-dash",
	"swim-dash",
	"barrier-dash",
	"door-symbol",
	"traversal-label",
	"node-selected-ring",
	"poi-symbol",
	"node-circle",
	"node-label",
] as const;

export type LevelLayerId = (typeof LEVEL_LAYERS)[number];

/** MapLibre filter expression, or null to clear. */
export type MapFilter = unknown[] | null;

/**
 * Build the level predicate used by the demo:
 * show features with no level OR level == selected OR level string contains selected (stairs).
 */
export function levelPredicate(level: string): unknown[] {
	return [
		"any",
		["!", ["has", "level"]],
		["==", ["get", "level"], level],
		["in", level, ["get", "level"]],
	];
}

/**
 * Full setFilter expression for one style layer id at the chosen level.
 * `level === "all"` restores the style's base filter (steps/door keep their tags).
 */

/** Never-matching filter — hide a layer without removing it. */
export const HIDE_LAYER_FILTER: unknown[] = ["==", ["get", "spellkave:node_id"], ""];

export type SubstrateFilter = "all" | "outdoor" | "indoor" | "tactical";

export interface PlaceView {
	level: string;
	indoorGraph: string | null;
	substrate?: SubstrateFilter;
}

function outdoorOrSelectedGraph(indoorGraph: string | null, level: string): unknown[] | null {
	const outdoor: unknown[] = ["!", ["has", "indoor"]];
	if (indoorGraph !== null && indoorGraph !== "") {
		return ["any", outdoor, ["==", ["get", "spellkave:graph"], indoorGraph]];
	}
	if (level === "0") {
		return ["any", outdoor, ["==", ["get", "entrance"], "yes"]];
	}
	return null;
}

function outdoorExtentOrSelectedRooms(indoorGraph: string | null, level: string): unknown[] {
	const outdoorExtent: unknown[] = ["==", ["get", "spellkave:extent"], "yes"];
	if (indoorGraph !== null && indoorGraph !== "") {
		return ["any", outdoorExtent, ["==", ["get", "spellkave:graph"], indoorGraph]];
	}
	if (level === "0") {
		return outdoorExtent;
	}
	return ["any", outdoorExtent, ["==", ["get", "indoor"], "room"]];
}

export function buildSubstratePredicate(
	layerId: string,
	substrate: SubstrateFilter = "all",
): unknown[] | null {
	if (substrate === "all") return null;
	if (substrate === "tactical") {
		return [
			"any",
			["==", ["get", "spellkave:substrate"], "tactical"],
			["==", ["get", "spellkave:tactical"], "cell"],
			["==", ["get", "spellkave:tactical"], "edge"],
			["==", ["get", "spellkave:tactical"], "grid"],
		];
	}
	const isPolygonFill =
		layerId === "room-fill" ||
		layerId === "water-fill" ||
		layerId === "difficult-terrain-fill" ||
		layerId === "hazard-fill";
	if (substrate === "outdoor") {
		if (isPolygonFill) {
			return [
				"all",
				["==", ["get", "spellkave:extent"], "yes"],
				["!", ["has", "indoor"]],
				["!=", ["get", "spellkave:tactical"], "cell"],
			];
		}
		return [
			"all",
			["!", ["has", "indoor"]],
			["!=", ["get", "spellkave:substrate"], "tactical"],
			["!=", ["get", "spellkave:tactical"], "cell"],
			["!=", ["get", "spellkave:tactical"], "edge"],
		];
	}
	if (substrate === "indoor") {
		if (isPolygonFill) {
			return [
				"all",
				["==", ["get", "indoor"], "room"],
				["!=", ["get", "spellkave:tactical"], "cell"],
			];
		}
		return [
			"any",
			["==", ["get", "indoor"], "room"],
			["==", ["get", "spellkave:substrate"], "indoor"],
			["==", ["get", "highway"], "corridor"],
			["==", ["get", "highway"], "steps"],
		];
	}
	return null;
}

/**
 * Hamlet pins, paths, and extent rectangles always. Selecting a dungeon
 * adds that graph's rooms, corridors, and names.
 * Selecting a floor (e.g. -1) shows rooms, corridors, and nodes on that floor across the world.
 */
export function buildPlaceViewFilter(layerId: string, view: PlaceView): MapFilter {
	const levelPart = buildLevelFilter(layerId, view.level);
	const substratePart = buildSubstratePredicate(layerId, view.substrate ?? "all");
	const withLevel = (expr: unknown[] | null): MapFilter => {
		const parts: unknown[] = [];
		const addPart = (p: unknown[] | null) => {
			if (p === null) return;
			if (Array.isArray(p) && p[0] === "all") {
				for (let i = 1; i < p.length; i++) {
					parts.push(p[i]);
				}
			} else {
				parts.push(p);
			}
		};
		addPart(levelPart);
		addPart(substratePart);
		addPart(expr);
		if (parts.length === 0) return null;
		if (parts.length === 1) return parts[0] as MapFilter;
		return ["all", ...parts];
	};
	if (
		layerId === "room-fill" ||
		layerId === "water-fill" ||
		layerId === "difficult-terrain-fill" ||
		layerId === "hazard-fill"
	) {
		return withLevel(outdoorExtentOrSelectedRooms(view.indoorGraph, view.level));
	}
	return withLevel(outdoorOrSelectedGraph(view.indoorGraph, view.level));
}

export interface FloorItemMeta {
	level?: string | null;
	graph?: string | null;
	indoor?: boolean;
	substrate?: string | null;
}

/**
 * Filter occupancy pins, item pins, and seat pins according to active level and selected indoorGraph.
 *
 * Rules:
 * 1. 'all' level: show everything across the entire world (unless filtered by substrate).
 * 2. When an indoorGraph is selected (inspect mode):
 *    - In that graph: show if item level matches activeLevel (defaulting undefined to "0").
 *    - Outside that graph: show outdoor pins if activeLevel is "0".
 * 3. Overview mode (no indoorGraph selected):
 *    - Level "0": show outdoor pins (not indoor) and indoor pins with level "0" (e.g. entrances).
 *    - Non-zero levels (e.g. "-1", "1"): show pins matching that level.
 */
export function shouldShowFloorItem(
	item: FloorItemMeta,
	activeLevel: string,
	indoorGraph: string | null,
	substrate: SubstrateFilter = "all",
): boolean {
	if (substrate === "tactical" && item.substrate !== "tactical") return false;
	if (substrate === "outdoor" && (item.indoor || item.substrate === "tactical")) return false;
	if (substrate === "indoor" && (!item.indoor || item.substrate === "tactical")) return false;

	if (activeLevel === "all") return true;

	const itemLevel =
		item.level !== undefined && item.level !== null && item.level !== ""
			? String(item.level).trim()
			: "0";

	if (indoorGraph !== null && indoorGraph !== "") {
		if (item.graph === indoorGraph) {
			return itemLevel === activeLevel;
		}
		if (!item.indoor && activeLevel === "0") {
			return true;
		}
		return false;
	}

	if (activeLevel === "0") {
		if (!item.indoor) return true;
		return itemLevel === "0";
	}

	return itemLevel === activeLevel;
}

export function buildLevelFilter(layerId: string, level: string): MapFilter {
	if (level === "all") {
		if (layerId === "steps-dash") return ["==", ["get", "highway"], "steps"];
		if (layerId === "door-symbol") return ["==", ["get", "door"], "yes"];
		if (layerId === "flight-dash") return ["==", ["get", "spellkave:traversal_mode"], "fly"];
		if (layerId === "swim-dash") return ["==", ["get", "spellkave:traversal_mode"], "swim"];
		if (layerId === "barrier-dash") return ["has", "spellkave:seal"];
		if (layerId === "water-fill") return ["==", ["get", "natural"], "water"];
		if (layerId === "difficult-terrain-fill")
			return ["==", ["get", "spellkave:terrain"], "difficult"];
		if (layerId === "hazard-fill") return ["has", "spellkave:hazard"];
		if (layerId === "traversal-label") {
			return [
				"any",
				["==", ["get", "spellkave:traversal_mode"], "fly"],
				["==", ["get", "spellkave:traversal_mode"], "swim"],
				["has", "spellkave:seal"],
			];
		}
		if (layerId === "poi-symbol") {
			return ["has", "spellkave:poi_icon"];
		}
		if (layerId === "node-circle" || layerId === "node-label") {
			return ["!", ["has", "spellkave:poi_icon"]];
		}
		return null;
	}
	const predicate = levelPredicate(level);
	if (layerId === "steps-dash") {
		return ["all", predicate, ["==", ["get", "highway"], "steps"]];
	}
	if (layerId === "door-symbol") {
		return ["all", predicate, ["==", ["get", "door"], "yes"]];
	}
	if (layerId === "flight-dash") {
		return ["all", predicate, ["==", ["get", "spellkave:traversal_mode"], "fly"]];
	}
	if (layerId === "swim-dash") {
		return ["all", predicate, ["==", ["get", "spellkave:traversal_mode"], "swim"]];
	}
	if (layerId === "barrier-dash") {
		return ["all", predicate, ["has", "spellkave:seal"]];
	}
	if (layerId === "water-fill") {
		return ["all", predicate, ["==", ["get", "natural"], "water"]];
	}
	if (layerId === "difficult-terrain-fill") {
		return ["all", predicate, ["==", ["get", "spellkave:terrain"], "difficult"]];
	}
	if (layerId === "hazard-fill") {
		return ["all", predicate, ["has", "spellkave:hazard"]];
	}
	if (layerId === "traversal-label") {
		return [
			"all",
			predicate,
			[
				"any",
				["==", ["get", "spellkave:traversal_mode"], "fly"],
				["==", ["get", "spellkave:traversal_mode"], "swim"],
				["has", "spellkave:seal"],
			],
		];
	}
	if (layerId === "poi-symbol") {
		return ["all", predicate, ["has", "spellkave:poi_icon"]];
	}
	if (layerId === "node-circle" || layerId === "node-label") {
		return ["all", predicate, ["!", ["has", "spellkave:poi_icon"]]];
	}
	return predicate;
}

export function parseLevelsFromTileJson(tileJson: unknown): string[] {
	if (typeof tileJson !== "object" || tileJson === null) return [];
	const levels = (tileJson as { levels?: unknown }).levels;
	if (!Array.isArray(levels)) return [];
	return levels.map((l) => String(l));
}

/** Google indoor picker: highest floor at the top of the stack. */
export function sortLevelsHighToLow(levels: readonly string[]): string[] {
	return [...levels].sort((a, b) => {
		const na = Number(a);
		const nb = Number(b);
		if (Number.isFinite(na) && Number.isFinite(nb)) return nb - na;
		return b.localeCompare(a);
	});
}

function levelTagFrom(
	rowsOrTags:
		| ReadonlyArray<{ key: string; value: string }>
		| Record<string, unknown>
		| null
		| undefined,
): string | null {
	if (rowsOrTags === null || rowsOrTags === undefined) return null;
	if (Array.isArray(rowsOrTags)) {
		const row = rowsOrTags.find((entry) => entry.key === "level");
		const value = row?.value.trim() ?? "";
		return value === "" ? null : value;
	}
	const raw = (rowsOrTags as Record<string, unknown>).level;
	if (raw === undefined || raw === null) return null;
	const value = String(raw).trim();
	return value === "" ? null : value;
}

/**
 * Map a place's OSM `level` tag onto a known floor id.
 * Stairs carry `"0;1"`-style values — the first part that is in `levels` wins.
 * `null` when the place has no level, or none of its parts are known floors.
 */
export function floorForPlace(
	rowsOrTags:
		| ReadonlyArray<{ key: string; value: string }>
		| Record<string, unknown>
		| null
		| undefined,
	levels: readonly string[],
): string | null {
	const raw = levelTagFrom(rowsOrTags);
	if (raw === null) return null;
	const known = new Set(levels);
	for (const part of raw.split(";")) {
		const level = part.trim();
		if (level !== "" && known.has(level)) return level;
	}
	return null;
}
