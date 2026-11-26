/**
 * A selected place on the map — from a clicked feature or a search hit —
 * shaped for the side panel (name first, then the rows a person reads).
 */

import type { SearchHit } from "./search";

export interface PlaceRow {
	key: string;
	value: string;
}

export interface Place {
	name: string;
	nodeId: string | null;
	rows: PlaceRow[];
	lon: number;
	lat: number;
}

const PRIMARY_KEYS = ["name", "description", "level", "indoor", "entrance"] as const;

/** Prefer name/description/level, then every spellkave:* tag, stable key order. */
export function placeRowsFromProperties(
	properties: Record<string, unknown> | null | undefined,
): PlaceRow[] {
	if (properties === null || properties === undefined) return [];
	const rows: PlaceRow[] = [];
	const seen = new Set<string>();

	for (const key of PRIMARY_KEYS) {
		const raw = properties[key];
		if (raw === undefined || raw === null || raw === "") continue;
		rows.push({ key, value: String(raw) });
		seen.add(key);
	}

	const spellkaveKeys = Object.keys(properties)
		.filter((k) => k.startsWith("spellkave:") && !seen.has(k))
		.sort();
	for (const key of spellkaveKeys) {
		const raw = properties[key];
		if (raw === undefined || raw === null || raw === "") continue;
		rows.push({ key, value: String(raw) });
		seen.add(key);
	}

	return rows;
}

export function nodeIdFromProperties(
	properties: Record<string, unknown> | null | undefined,
): string | null {
	if (properties === null || properties === undefined) return null;
	const id = properties["spellkave:node_id"];
	if (typeof id === "string" && id.trim() !== "") return id.trim();
	return null;
}

export function placeFromProperties(
	properties: Record<string, unknown> | null | undefined,
	lon: number,
	lat: number,
): Place {
	const nodeId = nodeIdFromProperties(properties);
	const rawName = properties?.name;
	const name =
		typeof rawName === "string" && rawName.trim() !== ""
			? rawName.trim()
			: (nodeId ?? "Unnamed place");
	return { name, nodeId, rows: placeRowsFromProperties(properties), lon, lat };
}

export function placeFromHit(hit: SearchHit): Place {
	return placeFromProperties(hit.tags, hit.lon, hit.lat);
}

/** Tags a person rarely wants in front of the description: grid cells, raw positions, authoring flags. */
const EXTRA_KEY = /^spellkave:(cell_res\d+|pos_[xy]|anchor|bundle|elevation_m|extent_shape)$/;

export interface SplitPlaceRows {
	/** Description, level and the identifying spellkave tags — always visible. */
	primary: PlaceRow[];
	/** Everything else, behind a "more" disclosure. */
	extra: PlaceRow[];
}

/** The name is the panel heading, so it is in neither list. */
export function splitPlaceRows(rows: readonly PlaceRow[]): SplitPlaceRows {
	const primary: PlaceRow[] = [];
	const extra: PlaceRow[] = [];
	for (const row of rows) {
		if (row.key === "name") continue;
		(EXTRA_KEY.test(row.key) ? extra : primary).push(row);
	}
	return { primary, extra };
}

export interface HoverCard {
	name: string;
	meta: string | null;
	snippet: string | null;
}

function escapeHoverHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

/** Compact pointer card — not the click/search rail. */
export function hoverCardFromProperties(
	properties: Record<string, unknown> | null | undefined,
	occupancyCount = 0,
): HoverCard | null {
	if (properties === null || properties === undefined) return null;
	const rawName = properties.name;
	const name = typeof rawName === "string" ? rawName.trim() : "";
	if (name === "") return null;
	const rawDescription = properties.description;
	const description = typeof rawDescription === "string" ? rawDescription.trim() : "";
	const snippet =
		description === ""
			? null
			: description.length > 110
				? `${description.slice(0, 107)}…`
				: description;
	const metaParts: string[] = [];
	if (properties.entrance === "yes") {
		metaParts.push("Entrance");
	}
	const rawLevel = properties.level;
	if (typeof rawLevel === "string" && rawLevel.trim() !== "") {
		metaParts.push(`Floor ${rawLevel.trim()}`);
	} else if (typeof rawLevel === "number") {
		metaParts.push(`Floor ${rawLevel}`);
	}
	if (occupancyCount === 1) metaParts.push("1 person");
	else if (occupancyCount > 1) metaParts.push(`${occupancyCount} people`);
	return {
		name,
		meta: metaParts.length > 0 ? metaParts.join(" · ") : null,
		snippet,
	};
}

/** Half-extent in metres when the place has no authored size. */
export const DEFAULT_PLACE_HALF_M = 1;

export type PlaceHalfExtent = { x_m: number; y_m: number };

function numParam(params: Record<string, unknown>, key: string): number | undefined {
	const value = params[key];
	return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

/** Sphere radius / cube half-extent from OSM `spellkave:extent_params`. */
export function extentHalfMetersFromTags(
	tags: Record<string, unknown> | null | undefined,
): PlaceHalfExtent | null {
	if (tags === null || tags === undefined) return null;
	const raw = tags["spellkave:extent_params"];
	if (typeof raw !== "string" || raw.trim() === "") return null;
	let params: Record<string, unknown> = {};
	try {
		params = JSON.parse(raw) as Record<string, unknown>;
	} catch {
		return null;
	}
	const shape = String(tags["spellkave:extent_shape"] ?? "");
	if (shape.includes("sphere")) {
		const rx = numParam(params, "radius_x_m") ?? numParam(params, "radius_m");
		if (rx === undefined) return null;
		const ry = numParam(params, "radius_y_m") ?? rx;
		return { x_m: rx, y_m: ry };
	}
	const ex = numParam(params, "extent_x_m") ?? numParam(params, "extent_m");
	if (ex === undefined) return null;
	const ey = numParam(params, "extent_y_m") ?? ex;
	return { x_m: ex, y_m: ey };
}

export function extentHalfMetersFromRows(rows: readonly PlaceRow[]): PlaceHalfExtent | null {
	const tags: Record<string, unknown> = {};
	for (const row of rows) tags[row.key] = row.value;
	return extentHalfMetersFromTags(tags);
}

/** Southwest / northeast corners around a WGS84 point. */
export function formatPlaceExtent(half: PlaceHalfExtent | null): string | null {
	if (half === null) return null;
	const width = half.x_m * 2;
	const height = half.y_m * 2;
	const n = (value: number): string =>
		Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
	if (Math.abs(width - height) < 0.05) return `${n(width)} m across`;
	return `${n(width)} × ${n(height)} m`;
}

export function humanizePlaceRef(id: string): string {
	const leaf = id.split("/").pop() ?? id;
	return leaf.replaceAll("_", " ");
}

/** Maps chrome left rail: w-80 + left-3. */
export const MAPS_RAIL_LEFT_PX = 332;

/**
 * Zoom level used when focusing on a place node or selecting an entry from navigation.
 * Zoom 18.5 is right in the 10 m scale display range, just before switching to 5 m (at ~18.7).
 */
export const PLACE_FOCUS_ZOOM = 18.5;

/**
 * Padding so the fitted box fills `fill` of the usable map (default 50%).
 * `leftChromePx` keeps the feature out from under the inspect rail.
 */
export function framePaddingPx(
	width: number,
	height: number,
	fill = 0.5,
	leftChromePx = 0,
): { top: number; bottom: number; left: number; right: number } {
	const usableW = Math.max(width - leftChromePx, 1);
	const usableH = Math.max(height, 1);
	const frac = Math.min(Math.max(fill, 0.1), 0.9);
	const padX = (usableW * (1 - frac)) / 2;
	const padY = (usableH * (1 - frac)) / 2;
	return {
		top: padY,
		bottom: padY,
		left: leftChromePx + padX,
		right: padX,
	};
}

export function lngLatBox(
	lon: number,
	lat: number,
	halfX: number,
	halfY: number,
): [[number, number], [number, number]] {
	const dLat = halfY / 111_320;
	const cos = Math.cos((lat * Math.PI) / 180);
	const dLon = halfX / (111_320 * (Math.abs(cos) < 1e-12 ? 1e-12 : cos));
	return [
		[lon - dLon, lat - dLat],
		[lon + dLon, lat + dLat],
	];
}

export function boundsFromGeometry(geometry: {
	type: string;
	coordinates: unknown;
}): [[number, number], [number, number]] | null {
	const pts: [number, number][] = [];
	const walk = (value: unknown): void => {
		if (!Array.isArray(value)) return;
		if (typeof value[0] === "number" && typeof value[1] === "number") {
			pts.push([value[0], value[1]]);
			return;
		}
		for (const item of value) walk(item);
	};
	walk(geometry.coordinates);
	if (pts.length < 2) return null;
	let west = pts[0]![0];
	let south = pts[0]![1];
	let east = west;
	let north = south;
	for (const [x, y] of pts) {
		if (x < west) west = x;
		if (y < south) south = y;
		if (x > east) east = x;
		if (y > north) north = y;
	}
	if (west === east || south === north) return null;
	return [
		[west, south],
		[east, north],
	];
}

function shoelace(ring: unknown): number {
	if (!Array.isArray(ring) || ring.length < 3) return 0;
	let sum = 0;
	for (let i = 0; i < ring.length; i++) {
		const a = ring[i];
		const b = ring[(i + 1) % ring.length];
		if (!Array.isArray(a) || !Array.isArray(b)) continue;
		const x1 = Number(a[0]);
		const y1 = Number(a[1]);
		const x2 = Number(b[0]);
		const y2 = Number(b[1]);
		if (![x1, y1, x2, y2].every(Number.isFinite)) continue;
		sum += x1 * y2 - x2 * y1;
	}
	return sum / 2;
}

/** Relative area for overlap picking. Points are 0; unknown geometry sorts last. */
export function geometryArea(geometry: { type: string; coordinates: unknown }): number {
	if (geometry.type === "Point") return 0;
	if (geometry.type === "Polygon" && Array.isArray(geometry.coordinates)) {
		return Math.abs(shoelace(geometry.coordinates[0]));
	}
	if (geometry.type === "MultiPolygon" && Array.isArray(geometry.coordinates)) {
		let total = 0;
		for (const poly of geometry.coordinates) {
			if (Array.isArray(poly)) total += Math.abs(shoelace(poly[0]));
		}
		return total;
	}
	return Number.POSITIVE_INFINITY;
}

export function uniqueByNodeIdSmallest<T extends { nodeId: string; area: number }>(
	items: T[],
): T[] {
	const best = new Map<string, T>();
	for (const item of items) {
		const prev = best.get(item.nodeId);
		if (prev === undefined || item.area < prev.area) best.set(item.nodeId, item);
	}
	return [...best.values()].sort((a, b) => a.area - b.area || a.nodeId.localeCompare(b.nodeId));
}

/** Smallest first; a repeat click on the same stack advances. */
export function nextOverlapIndex(nodeIds: readonly string[], current: string | null): number {
	if (nodeIds.length === 0) return -1;
	if (current === null) return 0;
	const i = nodeIds.indexOf(current);
	if (i < 0) return 0;
	return (i + 1) % nodeIds.length;
}

export function hoverCardHtml(card: HoverCard): string {
	const meta =
		card.meta === null ? "" : `<p class="place-hover__meta">${escapeHoverHtml(card.meta)}</p>`;
	const snippet =
		card.snippet === null
			? ""
			: `<p class="place-hover__snippet">${escapeHoverHtml(card.snippet)}</p>`;
	return `<div class="place-hover__card"><p class="place-hover__name">${escapeHoverHtml(card.name)}</p>${meta}${snippet}</div>`;
}

/** Indoor place_graph_id when this place is a room/entrance; otherwise outdoor. */
export function indoorGraphFromPlace(place: Place | null | undefined): string | null {
	if (place === null || place === undefined) return null;
	const graph = place.rows.find((row) => row.key === "spellkave:graph")?.value?.trim() ?? "";
	if (graph === "") return null;
	const indoor = place.rows.some((row) => row.key === "indoor" && row.value === "room");
	const entrance = place.rows.some((row) => row.key === "entrance" && row.value === "yes");
	return indoor || entrance ? graph : null;
}

export function graphFromPlace(place: Place | null | undefined): string | null {
	if (place === null || place === undefined) return null;
	const graph = place.rows.find((row) => row.key === "spellkave:graph")?.value?.trim() ?? "";
	return graph === "" ? null : graph;
}

export type BackdropRef = { layer: string; graph: string; indoor: boolean };

/** No place: outdoor sheets. A selected place: that graph sheet only. */
export function backdropVisible(row: BackdropRef, graph: string | null): boolean {
	if (graph === null || graph === "") return !row.indoor;
	return row.graph === graph;
}
