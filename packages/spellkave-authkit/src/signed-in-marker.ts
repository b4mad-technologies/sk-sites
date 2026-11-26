/**
 * The login site's non-secret `sk_signed_in` marker cookie (ADR-0161 D-7
 * step 5). The login site sets it on the parent domain at every sign-in and
 * clears it at sign-out everywhere. Every app checks it on visibility changes
 * and every {@link MARKER_CHECK_INTERVAL_MS}; once this tab has seen it, its
 * disappearance signs the tab out. UX only: the server-side `iat` cutoff and
 * the token lifetime are the security boundary.
 *
 * A tab that never saw the marker (a loopback dev origin, where the login
 * site sets none) never signs out by it.
 */

export const SIGNED_IN_MARKER_COOKIE = "sk_signed_in";
/** Set in sessionStorage once this tab held a session while the marker was present. */
export const MARKER_SEEN_STORAGE_KEY = "spellkave.workos.marker-seen";
export const MARKER_CHECK_INTERVAL_MS = 10_000;

/** True when the cookie string carries a non-empty `sk_signed_in`. */
export function hasSignedInMarker(cookie: string): boolean {
	for (const part of cookie.split(";")) {
		const eq = part.indexOf("=");
		if (eq === -1) continue;
		if (part.slice(0, eq).trim() === SIGNED_IN_MARKER_COOKIE && part.slice(eq + 1).trim() !== "")
			return true;
	}
	return false;
}

/**
 * One marker check for a tab that holds a stored session. Records that the
 * marker was seen; returns true when the marker was seen before and is gone
 * now (the person signed out on another tab or app).
 */
export function signedOutByMarker(storage: Storage, cookie: string | undefined): boolean {
	if (cookie === undefined) return false;
	if (hasSignedInMarker(cookie)) {
		if (storage.getItem(MARKER_SEEN_STORAGE_KEY) === null) {
			try {
				storage.setItem(MARKER_SEEN_STORAGE_KEY, "1");
			} catch {
				// Storage full or blocked: this tab cannot follow the marker.
			}
		}
		return false;
	}
	return storage.getItem(MARKER_SEEN_STORAGE_KEY) !== null;
}
