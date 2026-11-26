/**
 * What a person is told about the map, as data rather than as strings scattered
 * through an effect.
 *
 * Two things this exists to prevent, both of which the surface used to do:
 *  - showing a machine string ("style.json HTTP 404", "login + world required")
 *    in the one field a person actually reads;
 *  - showing NOTHING when a world has no map art, so an empty backdrop with
 *    place names on it looks identical to a world that simply is that empty.
 *
 * A genuine failure stays distinguishable from an empty world: they are
 * different `kind`s, and a failure keeps its technical `detail` for a developer
 * without putting it in the sentence.
 */
/** Not enough context to ask for a map at all. */
type Blocked = { kind: "blocked"; text: string };
/** A request is in flight. */
type Loading = { kind: "loading"; text: string };
/** The map is up and the world has its art. */
type Ready = { kind: "ready"; text: string };
/** The map is up, but nobody has loaded art for this world yet. */
type NoArt = { kind: "no-art"; text: string };
/** Something actually broke. `detail` is for a developer, never for the sentence. */
type Failed = { kind: "failed"; text: string; detail: string };

export type MapNotice = Blocked | Loading | Ready | NoArt | Failed;

/** Consumer wording changes presentation only; status and diagnostic detail survive. */
export type MapNoticeCopy = Partial<Record<MapNotice["kind"], string>>;

export function noticeText(notice: MapNotice, copy: MapNoticeCopy = {}): string {
	return copy[notice.kind] ?? notice.text;
}

export function blocked(): Blocked {
	return { kind: "blocked", text: "Sign in and pick a world to open its map." };
}

export function loading(): Loading {
	return { kind: "loading", text: "Opening the map…" };
}

export function ready(slug: string, attribution: string): Ready {
	return {
		kind: "ready",
		text: attribution === "" ? slug : `${slug} · ${attribution}`,
	};
}

/**
 * The quiet case. The map works and the places are real; only the painted
 * backdrop is absent, because no bundle has been loaded for this world.
 */
export function noArt(slug: string): NoArt {
	return {
		kind: "no-art",
		text: `No map art has been loaded for ${slug} yet. Its places are real — only the painted backdrop is missing.`,
	};
}

/**
 * `cause` is kept out of the sentence and exposed separately, so a person reads
 * plain language and a developer can still see what threw.
 */
export function failed(cause: unknown): Failed {
	const detail = cause instanceof Error ? cause.message : String(cause);
	return {
		kind: "failed",
		text: "The map could not be opened. This is a fault, not an empty world.",
		detail,
	};
}

/**
 * `loaded` is only present once the gateway ships the field (#2681). An older
 * deployment omits it, and an absent field must NOT be read as "not loaded" —
 * claiming a world has no art when we simply cannot tell is worse than saying
 * nothing.
 */
export function readLoadedFlag(body: unknown): boolean | null {
	if (typeof body !== "object" || body === null) return null;
	const value = (body as { loaded?: unknown }).loaded;
	return typeof value === "boolean" ? value : null;
}
