export const DEFAULT_PLAY_APP_URL = "https://play.spellkave.com/";

export function readPlayAppUrl(env: Record<string, string | undefined>): string {
	const raw = env.VITE_SPELLKAVE_PLAY_URL?.trim() ?? "";
	if (raw === "") return DEFAULT_PLAY_APP_URL;
	try {
		const url = new URL(raw);
		if (url.protocol !== "https:" && url.hostname !== "127.0.0.1" && url.hostname !== "localhost") {
			return DEFAULT_PLAY_APP_URL;
		}
		return raw.endsWith("/") ? raw : `${raw}/`;
	} catch {
		return DEFAULT_PLAY_APP_URL;
	}
}

/** Play as one held hero: Play reads `actor` next to `world` (ADR-0161 D-6). */
export function playHrefForSeat(
	slug: string,
	actorId: string,
	playAppUrl = DEFAULT_PLAY_APP_URL,
): string {
	const url = new URL(playHrefForWorld(slug, playAppUrl));
	url.searchParams.set("actor", actorId);
	return url.toString();
}

export function playHrefForWorld(slug: string, playAppUrl = DEFAULT_PLAY_APP_URL): string {
	const url = new URL(playAppUrl);
	url.searchParams.set("world", slug);
	return url.toString();
}
