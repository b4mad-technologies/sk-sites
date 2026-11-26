/**
 * Backdrop art handling for the gateway style.
 *
 * The gateway bakes one `image` source + `raster` layer per aligned backdrop
 * into style.json regardless of whether the world's art has been loaded onto
 * the world-assets overlay. Without art every image request 404s; MapLibre
 * still fires `load`, but the surface used to treat the first image error as
 * "the map could not be opened" (sk-jay0.4.1). Two helpers keep that apart:
 * strip the art up front when backdrops.json says it is not loaded, and never
 * let an image error decide the map's fate.
 */

interface StyleSource {
	type?: string;
}

interface StyleLayer {
	id?: string;
	type?: string;
	source?: string;
}

export interface StyleLike {
	sources?: Record<string, StyleSource>;
	layers?: StyleLayer[];
}

/** Style without `image` sources and the layers that draw them. Identity when there are none. */
export function stripBackdrops<T extends StyleLike>(style: T): T {
	const sources = style.sources ?? {};
	const imageIds = new Set(Object.keys(sources).filter((id) => sources[id]?.type === "image"));
	if (imageIds.size === 0) return style;
	const nextSources = Object.fromEntries(
		Object.entries(sources).filter(([id]) => !imageIds.has(id)),
	);
	const nextLayers = (style.layers ?? []).filter(
		(layer) => !(typeof layer.source === "string" && imageIds.has(layer.source)),
	);
	return { ...style, sources: nextSources, layers: nextLayers };
}

/** True for MapLibre errors about a `/w/<slug>/assets/…` backdrop image. */
export function isBackdropAssetError(message: string): boolean {
	return /\/assets\//.test(message);
}
