/**
 * Resolve a claimed seat's place node → WGS84 via Overpass node["spellkave:node_id"=…].
 */

import { buildNodeIdQuery, parseOverpassHits, runOverpass, type SearchHit } from "./search";

export interface ActorPlace {
	entityId: string;
	placeNodeId: string;
}

/** Occupancy pin for observer overlay. `mine` restyles the existing seat marker. */
export interface OccupancyPlace extends ActorPlace {
	name: string;
	mine?: boolean;
}

export function uniqueOccupancyPlaceIds(places: readonly OccupancyPlace[]): string[] {
	const out: string[] = [];
	const seen = new Set<string>();
	for (const place of places) {
		if (place.placeNodeId === "" || seen.has(place.placeNodeId)) continue;
		seen.add(place.placeNodeId);
		out.push(place.placeNodeId);
	}
	return out;
}

export interface SeatFlyTarget {
	placeNodeId: string;
	lon: number;
	lat: number;
	name: string;
	level?: string;
	graph?: string;
	indoor?: boolean;
}

/** Pick the place node for the first of `mineEntityIds` present in occupancy rows. */
export function placeNodeForEntities(
	occupancy: ActorPlace[],
	mineEntityIds: Iterable<string>,
): string | null {
	const mine = new Set([...mineEntityIds].map(String));
	for (const row of occupancy) {
		if (mine.has(String(row.entityId)) && row.placeNodeId !== "") {
			return row.placeNodeId;
		}
	}
	return null;
}

export function flyTargetFromHits(placeNodeId: string, hits: SearchHit[]): SeatFlyTarget | null {
	const hit = hits.find((h) => h.tags["spellkave:node_id"] === placeNodeId) ?? hits[0] ?? null;
	if (hit === null) return null;
	const level = hit.tags.level;
	const graph = hit.tags["spellkave:graph"] ?? (hit.graph?.trim() !== "" ? hit.graph : undefined);
	const indoor = hit.tags.indoor === "room" || hit.tags.indoor === "yes";
	return {
		placeNodeId,
		lon: hit.lon,
		lat: hit.lat,
		name: hit.name,
		...(level !== undefined ? { level } : {}),
		...(graph !== undefined ? { graph } : {}),
		...(indoor ? { indoor: true } : {}),
	};
}

export async function resolveSeatFlyTarget(
	interpreter: string,
	token: string,
	placeNodeId: string,
	fetchImpl: typeof fetch = fetch,
): Promise<SeatFlyTarget | null> {
	const hits = await runOverpass(interpreter, buildNodeIdQuery(placeNodeId), token, fetchImpl);
	return flyTargetFromHits(placeNodeId, hits);
}

/** Re-export for tests that assert the Overpass query shape. */
export { buildNodeIdQuery, parseOverpassHits };
