/**
 * Gateway URL helpers + MapLibre transformRequest that injects Bearer
 * only for the configured gateway origin (style, tiles, glyphs, images, sources).
 */

export type MapLibreResourceType =
	| "Unknown"
	| "Style"
	| "Source"
	| "Tile"
	| "Glyphs"
	| "SpriteImage"
	| "SpriteJSON"
	| "Image";

export interface TransformRequestResult {
	url: string;
	headers?: Record<string, string>;
}

/** True when `url` is same-origin as the gateway (including path under that origin). */
export function isGatewayUrl(url: string, gatewayOrigin: string): boolean {
	try {
		const u = new URL(url, gatewayOrigin);
		const g = new URL(gatewayOrigin);
		return u.origin === g.origin;
	} catch {
		return false;
	}
}

/**
 * MapLibre `transformRequest` callback factory.
 * Adds `Authorization: Bearer <token>` only when the request targets the gateway origin.
 * Covers Style / Tile / Glyphs / Image / Source / Sprite* so image sources (backdrops) auth.
 */
export function createTransformRequest(
	gatewayOrigin: string,
	token: string,
): (url: string, resourceType?: MapLibreResourceType | string) => TransformRequestResult {
	const origin = gatewayOrigin.replace(/\/+$/, "");
	const bearer = token.trim();
	return (url: string, _resourceType?: MapLibreResourceType | string): TransformRequestResult => {
		if (bearer === "" || !isGatewayUrl(url, origin)) {
			return { url };
		}
		return {
			url,
			headers: { Authorization: `Bearer ${bearer}` },
		};
	};
}

export function worldBase(gatewayOrigin: string, slug: string): string {
	return `${gatewayOrigin.replace(/\/+$/, "")}/w/${encodeURIComponent(slug)}`;
}

export function styleUrl(gatewayOrigin: string, slug: string): string {
	return `${worldBase(gatewayOrigin, slug)}/style.json`;
}

export function tilesJsonUrl(gatewayOrigin: string, slug: string): string {
	return `${worldBase(gatewayOrigin, slug)}/tiles.json`;
}

export function backdropsUrl(gatewayOrigin: string, slug: string): string {
	return `${worldBase(gatewayOrigin, slug)}/backdrops.json`;
}

export function interpreterUrl(gatewayOrigin: string, slug: string): string {
	return `${worldBase(gatewayOrigin, slug)}/api/interpreter`;
}

export async function authFetch(
	url: string,
	token: string,
	init: RequestInit = {},
	fetchImpl: typeof fetch = fetch,
): Promise<Response> {
	const headers = new Headers(init.headers);
	if (token.trim() !== "") {
		headers.set("Authorization", `Bearer ${token.trim()}`);
	}
	return fetchImpl(url, { ...init, headers });
}
