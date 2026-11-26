/**
 * Shared play host for browser → SpacetimeDB (ADR-0102 D-2 / D-4).
 * One URL, N databases. world.spellkave.com (ADR-0136 D-1) is not wired yet.
 */

export function readPlayUrl(env: Record<string, string | undefined>): string | null {
	const raw = env.VITE_SPELLKAVE_PLAY_URL?.trim() ?? "";
	if (raw === "") return null;
	if (
		!raw.startsWith("https://") &&
		!raw.startsWith("http://") &&
		!raw.startsWith("wss://") &&
		!raw.startsWith("ws://")
	) {
		return null;
	}
	return raw.replace(/\/+$/, "");
}

/** Schema fetch and DbConnection.withUri want http(s); accept ws(s) from env. */
export function playConnectUrl(playUrl: string): string {
	if (playUrl.startsWith("ws://")) return `http://${playUrl.slice("ws://".length)}`;
	if (playUrl.startsWith("wss://")) return `https://${playUrl.slice("wss://".length)}`;
	return playUrl;
}

const REAUTH =
	/\b(401|unauthorized|unauthorised|token expired|jwt expired|expired token|invalid jwt)\b/i;

/** Mid-session JWT death should not dump a raw SDK string. */
export function formatPlayError(cause: unknown): string {
	const message = cause instanceof Error ? cause.message : String(cause);
	if (REAUTH.test(message)) return "Please log in again.";
	return message;
}
