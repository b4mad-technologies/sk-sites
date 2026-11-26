import type * as maplibregl from "maplibre-gl";

export const SATELLITE_LAYER_ID = "spellkave-satellite";

export interface SatelliteDescriptor {
	available: true;
	archive: string;
	source: string;
	layer: string;
}

interface StyleWithMetadata {
	metadata?: Record<string, unknown>;
}

let protocolPromise: Promise<import("pmtiles").Protocol> | null = null;
let protocolRegistered = false;

export function satelliteDescriptor(style: unknown): SatelliteDescriptor | null {
	if (typeof style !== "object" || style === null) return null;
	const typed = style as StyleWithMetadata;
	const value = typed.metadata?.["spellkave:satellite"];
	if (typeof value !== "object" || value === null) return null;
	const row = value as Record<string, unknown>;
	if (
		row.available !== true ||
		typeof row.archive !== "string" ||
		typeof row.source !== "string" ||
		typeof row.layer !== "string"
	)
		return null;
	return { available: true, archive: row.archive, source: row.source, layer: row.layer };
}

/** Register the authenticated archive before MapLibre evaluates the style. */
export async function prepareSatellite(
	MapLibre: typeof maplibregl,
	style: unknown,
	token: string,
): Promise<SatelliteDescriptor | null> {
	const descriptor = satelliteDescriptor(style);
	if (descriptor === null) return null;
	protocolPromise ??= import("pmtiles").then(({ Protocol }) => new Protocol());
	const protocol = await protocolPromise;
	if (!protocolRegistered) {
		MapLibre.addProtocol("pmtiles", protocol.tile as never);
		protocolRegistered = true;
	}
	const { FetchSource, PMTiles } = await import("pmtiles");
	const headers = new Headers();
	if (token.trim() !== "") headers.set("authorization", `Bearer ${token.trim()}`);
	protocol.add(new PMTiles(new FetchSource(descriptor.archive, headers)));
	return descriptor;
}

export function setSatelliteVisibility(
	map: Pick<maplibregl.Map, "getLayer" | "setLayoutProperty"> | null,
	visible: boolean,
	layerId = SATELLITE_LAYER_ID,
): boolean {
	if (map === null) return false;
	if (!map.getLayer(layerId)) return false;
	map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
	return true;
}
