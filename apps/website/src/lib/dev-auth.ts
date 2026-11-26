/**
 * DEV-only session helpers for local live proof without WorkOS.
 * Unreachable in production builds (`import.meta.env.DEV` is false after Vite build).
 */

import {
	type AuthSession,
	notifyAuthChanged,
	SESSION_STORAGE_KEY,
	writeSession,
} from "@spellkave/authkit";

const DEV_TOKEN_STORAGE_KEY = "spellkave.dev.token";

/** True only in Vite dev server / vitest — never in production bundles. */
export function isDevAuthEnabled(): boolean {
	return import.meta.env.DEV === true;
}

/**
 * Build a minimal AuthSession from a raw SpacetimeDB / play-stage token.
 * Display name is cosmetic; the JWT (or opaque token) is what the node verifies.
 */
export function sessionFromDevToken(token: string, displayName = "dev-player"): AuthSession | null {
	const trimmed = token.trim();
	if (trimmed === "") return null;
	return {
		access_token: trimmed,
		id_token: "",
		expires_at: Date.now() + 24 * 60 * 60 * 1000,
		display_name: displayName,
	};
}

/** Persist a DEV session into sessionStorage and notify listeners. */
export function applyDevSession(storage: Storage, token: string, displayName?: string): boolean {
	if (!isDevAuthEnabled()) return false;
	const session = sessionFromDevToken(token, displayName);
	if (session === null) return false;
	writeSession(storage, session);
	try {
		storage.setItem(DEV_TOKEN_STORAGE_KEY, session.access_token);
	} catch {
		/* ignore quota */
	}
	notifyAuthChanged();
	return true;
}

/** Clear only the DEV marker (logout uses endAuthSession). */
export function clearDevTokenMarker(storage: Storage): void {
	try {
		storage.removeItem(DEV_TOKEN_STORAGE_KEY);
	} catch {
		/* ignore */
	}
}

/**
 * Optional auto-seed from Vite-injected file contents
 * (`VITE_SPELLKAVE_DEV_TOKEN` set at dev-server start from
 * `VITE_SPELLKAVE_DEV_TOKEN_FILE`). No-ops when already signed in.
 */
export function maybeAutoSeedDevToken(
	storage: Storage,
	env: Record<string, string | undefined>,
	hasSession: boolean,
): boolean {
	if (!isDevAuthEnabled() || hasSession) return false;
	const injected = env.VITE_SPELLKAVE_DEV_TOKEN?.trim() ?? "";
	if (injected === "") return false;
	return applyDevSession(storage, injected, "dev-token-file");
}

export function readDevTokenHint(env: Record<string, string | undefined>): string | null {
	if (!isDevAuthEnabled()) return null;
	const file = env.VITE_SPELLKAVE_DEV_TOKEN_FILE?.trim() ?? "";
	if (file !== "") return file;
	if ((env.VITE_SPELLKAVE_DEV_TOKEN?.trim() ?? "") !== "") return "(injected)";
	return null;
}

/** Expose storage key for tests. */
export const DEV_SESSION_KEY = SESSION_STORAGE_KEY;
