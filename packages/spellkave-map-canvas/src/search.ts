/**
 * Overpass search against GET|POST /w/<slug>/api/interpreter,
 * plus in-memory occupancy name matches for the maps autocomplete.
 */

export interface BBox {
	west: number;
	south: number;
	east: number;
	north: number;
}

export type SearchKind = "place" | "person" | "thing";

export interface SearchHit {
	id: string;
	osmType: string;
	name: string;
	graph: string;
	lon: number;
	lat: number;
	tags: Record<string, string>;
	kind: SearchKind;
	/** Named place the person occupies, when known. */
	placeName?: string;
	entityId?: string;
	/** True when this hit's place node has no map coordinates — the actor
	 * stands in a place graph the map deliberately does not draw; selecting
	 * the hit must not fly the viewport anywhere. */
	offMap?: boolean;
}

export function searchKindLabel(kind: SearchKind): string {
	if (kind === "person") return "Person";
	if (kind === "thing") return "Thing";
	return "Place";
}

/** Google-style second line: "Place · inn graph" / "Person · Stonehill Inn". */
export function searchHitMeta(hit: SearchHit): string {
	const kind = searchKindLabel(hit.kind);
	if (hit.kind === "person") {
		const place = hit.placeName?.trim() ?? "";
		const parts = place === "" ? [kind] : [kind, place];
		if (hit.offMap === true) parts.push("off map");
		return parts.join(" · ");
	}
	if (hit.kind === "thing") {
		const holder = hit.placeName?.trim() ?? "";
		return holder === "" ? kind : `${kind} · ${holder}`;
	}
	const graph = hit.graph.trim();
	return graph === "" ? kind : `${kind} · ${graph}`;
}

/** Escape a user string for Overpass regex (double-quoted). */
export function escapeOverpassRegex(text: string): string {
	return text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Build `nwr["name"~"<text>",i]({{bbox}}); out center;`
 * bbox order is south,west,north,east (Overpass).
 */
export function buildNameSearchQuery(text: string, bbox: BBox): string {
	const q = escapeOverpassRegex(text.trim());
	const box = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
	return `[out:json][timeout:25];nwr["name"~"${q}",i](${box});out center;`;
}

/** Roving index for search-result ArrowUp/ArrowDown. Wraps; out-of-range current starts at an end. */
export function nextResultIndex(current: number, delta: number, length: number): number {
	if (length <= 0) return 0;
	if (current < 0 || current >= length) {
		return delta < 0 ? length - 1 : 0;
	}
	return (current + delta + length) % length;
}

export function buildNodeIdQuery(nodeId: string): string {
	const id = escapeOverpassRegex(nodeId.trim());
	return `[out:json][timeout:25];nwr["spellkave:node_id"="${id}"];out center;`;
}

/** Query all nodes carrying a schema-driven POI icon metadata tag. */
export function buildPoiQuery(): string {
	return `[out:json][timeout:25];node["spellkave:poi_icon"];out body;`;
}

/** Ways touching this node, then their nodes — neighbors + extent corners. */
export function buildPlaceNeighborhoodQuery(nodeId: string): string {
	const id = escapeOverpassRegex(nodeId.trim());
	return `[out:json][timeout:25];node["spellkave:node_id"="${id}"];<;>;out body;`;
}

export type PlaceExit = {
	nodeId: string;
	name: string;
	outdoor: boolean;
	traversalMode?: string;
	seal?: string;
	locked?: boolean;
};

export function placeExitsFromHits(hits: readonly SearchHit[], selfId: string): PlaceExit[] {
	const edgeInfoByNeighbor = new Map<
		string,
		{ traversalMode?: string; seal?: string; locked?: boolean }
	>();

	for (const hit of hits) {
		if (hit.osmType !== "way") continue;
		const from = hit.tags["spellkave:from_node"];
		const to = hit.tags["spellkave:to_node"];
		if (!from || !to) continue;
		let neighbor: string | undefined;
		if (from === selfId) {
			neighbor = to;
		} else if (to === selfId) {
			neighbor = from;
		}
		if (!neighbor) continue;

		const existing = edgeInfoByNeighbor.get(neighbor) ?? {};
		const mode = hit.tags["spellkave:traversal_mode"];
		const seal = hit.tags["spellkave:seal"];
		const lockedStr = hit.tags["spellkave:locked"];
		const locked = lockedStr === "yes" ? true : lockedStr === "no" ? false : undefined;

		if (from === selfId || !edgeInfoByNeighbor.has(neighbor)) {
			edgeInfoByNeighbor.set(neighbor, {
				traversalMode: mode ?? existing.traversalMode,
				seal: seal ?? existing.seal,
				locked: locked !== undefined ? locked : existing.locked,
			});
		}
	}

	const out: PlaceExit[] = [];
	const seen = new Set<string>();
	for (const hit of hits) {
		if (hit.osmType !== "node") continue;
		const id = hit.tags["spellkave:node_id"]?.trim() ?? "";
		if (id === "" || id === selfId || seen.has(id)) continue;
		if (!edgeInfoByNeighbor.has(id)) continue;
		seen.add(id);
		const substrate = (hit.tags["spellkave:substrate"] ?? "").toLowerCase();
		const edgeInfo = edgeInfoByNeighbor.get(id);
		out.push({
			nodeId: id,
			name: hit.name || id,
			outdoor: substrate === "outdoor",
			...(edgeInfo?.traversalMode ? { traversalMode: edgeInfo.traversalMode } : {}),
			...(edgeInfo?.seal ? { seal: edgeInfo.seal } : {}),
			...(edgeInfo?.locked !== undefined ? { locked: edgeInfo.locked } : {}),
		});
	}
	out.sort((a, b) => a.name.localeCompare(b.name));
	return out;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function tagsOf(el: Record<string, unknown>): Record<string, string> {
	const raw = el.tags;
	if (!isRecord(raw)) return {};
	const out: Record<string, string> = {};
	for (const [k, v] of Object.entries(raw)) {
		if (typeof v === "string") out[k] = v;
	}
	return out;
}

function centerOf(el: Record<string, unknown>): { lon: number; lat: number } | null {
	if (typeof el.lon === "number" && typeof el.lat === "number") {
		return { lon: el.lon, lat: el.lat };
	}
	const center = el.center;
	if (isRecord(center) && typeof center.lon === "number" && typeof center.lat === "number") {
		return { lon: center.lon, lat: center.lat };
	}
	return null;
}

/** Parse Overpass JSON `elements` into fly-to hits. */
export function parseOverpassHits(body: unknown): SearchHit[] {
	if (!isRecord(body) || !Array.isArray(body.elements)) return [];
	const hits: SearchHit[] = [];
	for (const el of body.elements) {
		if (!isRecord(el)) continue;
		const pos = centerOf(el);
		const type = typeof el.type === "string" ? el.type : "node";
		if (pos === null && type === "node") continue;
		const tags = tagsOf(el);
		const name = tags.name ?? tags["spellkave:node_id"] ?? String(el.id ?? "");
		hits.push({
			id: String(el.id ?? name),
			osmType: type,
			name,
			graph: tags["spellkave:graph"] ?? "",
			lon: pos?.lon ?? 0,
			lat: pos?.lat ?? 0,
			tags,
			kind: "place",
		});
	}
	return hits;
}

/** Node description + way extent: one hit for the rail. */
export function mergeOsmPlaceHits(hits: readonly SearchHit[]): SearchHit | undefined {
	if (hits.length === 0) return undefined;
	const node = hits.find((hit) => hit.osmType === "node");
	const way = hits.find((hit) => hit.osmType === "way");
	const base = node ?? way ?? hits[0];
	if (base === undefined) return undefined;
	const tags = { ...(way?.tags ?? {}), ...(node?.tags ?? {}) };
	if (
		tags["spellkave:extent_params"] === undefined &&
		way?.tags["spellkave:extent_params"] !== undefined
	) {
		tags["spellkave:extent_params"] = way.tags["spellkave:extent_params"];
	}
	if (
		tags["spellkave:extent_shape"] === undefined &&
		way?.tags["spellkave:extent_shape"] !== undefined
	) {
		tags["spellkave:extent_shape"] = way.tags["spellkave:extent_shape"];
	}
	const name = tags.name ?? base.name;
	return {
		...base,
		name,
		osmType: node?.osmType ?? base.osmType,
		lon: node?.lon ?? base.lon,
		lat: node?.lat ?? base.lat,
		graph: tags["spellkave:graph"] ?? base.graph,
		tags,
	};
}

export async function runOverpass(
	interpreter: string,
	query: string,
	token: string,
	fetchImpl: typeof fetch = fetch,
): Promise<SearchHit[]> {
	const response = await fetchImpl(interpreter, {
		method: "POST",
		headers: {
			"content-type": "application/x-www-form-urlencoded",
			...(token.trim() !== "" ? { Authorization: `Bearer ${token.trim()}` } : {}),
		},
		body: new URLSearchParams({ data: query }),
	});
	if (!response.ok) {
		throw new Error(`Overpass HTTP ${response.status}`);
	}
	return parseOverpassHits(await response.json());
}

export function occupancyNameHits(
	text: string,
	occupancy: readonly { entityId: string; placeNodeId: string; name: string }[],
	coords: ReadonlyMap<string, { lon: number; lat: number }>,
	placeNameByNode: ReadonlyMap<string, string>,
	browse = false,
): SearchHit[] {
	const q = text.trim().toLowerCase();
	if (q.length < 2 && !browse) return [];
	const out: SearchHit[] = [];
	for (const row of occupancy) {
		if (q.length >= 2 && !row.name.toLowerCase().includes(q)) continue;
		const drawable = coords.has(row.placeNodeId);
		const pos = coords.get(row.placeNodeId) ?? { lon: 0, lat: 0 };
		out.push({
			id: `person:${row.entityId}`,
			osmType: "actor",
			name: row.name,
			graph: row.placeNodeId,
			lon: pos.lon,
			lat: pos.lat,
			tags: { name: row.name, "spellkave:node_id": row.placeNodeId },
			kind: "person",
			placeName: placeNameByNode.get(row.placeNodeId) ?? "",
			entityId: row.entityId,
			...(drawable ? {} : { offMap: true }),
		});
	}
	return out;
}

export function thingNameHits(
	text: string,
	things: readonly {
		entityId: string;
		placeNodeId: string;
		name: string;
		holderName?: string | null;
		holderEntityId?: string | null;
	}[],
	coords: ReadonlyMap<string, { lon: number; lat: number }>,
	browse = false,
): SearchHit[] {
	const q = text.trim().toLowerCase();
	if (q.length < 2 && !browse) return [];
	const out: SearchHit[] = [];
	for (const row of things) {
		if (q.length >= 2 && !row.name.toLowerCase().includes(q)) continue;
		const pos = coords.get(row.placeNodeId) ?? { lon: 0, lat: 0 };
		const holder = row.holderName?.trim() ?? "";
		out.push({
			id: `thing:${row.entityId}`,
			osmType: "item",
			name: row.name,
			graph: row.placeNodeId,
			lon: pos.lon,
			lat: pos.lat,
			tags: {
				name: row.name,
				"spellkave:node_id": row.placeNodeId,
				...(row.holderEntityId ? { "spellkave:holder_id": row.holderEntityId } : {}),
			},
			kind: "thing",
			placeName: holder === "" ? "" : `carried by ${holder}`,
			entityId: row.entityId,
		});
	}
	return out;
}

export function mergeSearchHits(
	people: readonly SearchHit[],
	places: readonly SearchHit[],
	limit = 20,
	things: readonly SearchHit[] = [],
): SearchHit[] {
	const seen = new Set<string>();
	const out: SearchHit[] = [];
	for (const hit of [...people, ...things, ...places]) {
		const key = `${hit.kind}:${hit.id}`;
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(hit);
		if (out.length >= limit) break;
	}
	return out;
}
