import { acquireGrantLease, type GrantLease } from "./grant-lease";
import {
	AUTH_CHANGED_EVENT,
	type AuthConfig,
	type AuthSession,
	clearSession,
	readSession,
	refreshSession,
	SESSION_STORAGE_KEY,
	SessionRefreshError,
} from "./index";
import { MARKER_CHECK_INTERVAL_MS, signedOutByMarker } from "./signed-in-marker";

export interface SessionRenewalState {
	session: AuthSession | null;
	status: "ready" | "refreshing" | "retrying" | "signed-out";
}

/**
 * One lifecycle owner per app; credential exchange is shared with other consumers.
 * It also follows the login site's `sk_signed_in` marker (ADR-0161 D-7): on a
 * visible-tab transition and every {@link MARKER_CHECK_INTERVAL_MS} it checks
 * the cookie, and once a tab that saw the marker finds it gone, it clears the
 * stored session and reports "signed-out". Apps drop their world connection
 * on that state. Without `document.cookie` (tests) the marker is not watched.
 */
export function startSessionRenewal(options: {
	config: AuthConfig;
	storage: Storage;
	fetch: typeof fetch;
	window: Pick<Window, "addEventListener" | "removeEventListener" | "dispatchEvent">;
	document: Pick<Document, "addEventListener" | "removeEventListener" | "visibilityState"> & {
		readonly cookie?: string;
	};
	onChange: (state: SessionRenewalState) => void;
	now?: () => number;
	/** Defaults to the browser Web Locks API; injectable for lifecycle tests. */
	locks?: Pick<LockManager, "request">;
	/** Marker check cadence; defaults to {@link MARKER_CHECK_INTERVAL_MS}. */
	markerIntervalMs?: number;
}): {
	ready: Promise<AuthSession | null>;
	check: () => Promise<AuthSession | null>;
	stop: () => void;
} {
	const now = options.now ?? Date.now;
	const locks = options.locks ?? globalThis.navigator?.locks;
	let lease: GrantLease | undefined;
	let stopped = false;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let expiryTimer: ReturnType<typeof setTimeout> | undefined;
	let pending: Promise<AuthSession | null> | undefined;
	let exchanging = false;
	let retryAt = 0;
	let failures = 0;
	let observedStorage = options.storage.getItem(SESSION_STORAGE_KEY);
	let publishedToken = readSession(options.storage, now)?.access_token;

	function publish(status: SessionRenewalState["status"]) {
		const session = readSession(options.storage, now);
		if (expiryTimer !== undefined) clearTimeout(expiryTimer);
		if (!stopped && session && status === "refreshing") {
			expiryTimer = setTimeout(
				() => {
					publish("refreshing");
				},
				Math.max(1, session.expires_at - now()),
			);
		}
		if (!stopped) options.onChange({ session, status });
		if (publishedToken !== session?.access_token) {
			publishedToken = session?.access_token;
			queueMicrotask(() => {
				if (!stopped) options.window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
			});
		}
		return session;
	}

	function hasRefreshToken(): boolean {
		try {
			const stored = JSON.parse(options.storage.getItem(SESSION_STORAGE_KEY) ?? "null");
			return typeof stored?.refresh_token === "string" && stored.refresh_token !== "";
		} catch {
			return false;
		}
	}

	function schedule(delay: number) {
		if (timer !== undefined) clearTimeout(timer);
		if (!stopped)
			timer = setTimeout(
				() => {
					void check();
				},
				Math.min(2_147_483_647, Math.max(1, delay)),
			);
	}

	function markerSignedOut(): boolean {
		if (options.storage.getItem(SESSION_STORAGE_KEY) === null) return false;
		return signedOutByMarker(options.storage, options.document.cookie);
	}

	async function reconcile(): Promise<AuthSession | null> {
		if (stopped) return null;
		if (timer !== undefined) clearTimeout(timer);
		if (markerSignedOut()) {
			// Signed out on the login site (another tab or app): drop this tab's grant.
			clearSession(options.storage);
			observedStorage = null;
			lease?.release();
			lease = undefined;
			return publish("signed-out");
		}
		const stored = options.storage.getItem(SESSION_STORAGE_KEY);
		if (stored !== observedStorage) {
			observedStorage = stored;
			retryAt = 0;
			failures = 0;
		}
		let session = readSession(options.storage, now);
		const renewable = hasRefreshToken();
		if (!renewable) {
			lease?.release();
			lease = undefined;
			publish(session ? "ready" : "signed-out");
			if (session) schedule(session.expires_at - now());
			return session;
		}
		if (locks) {
			try {
				const next = await acquireGrantLease(options.storage, options.config, locks);
				lease?.release();
				lease = next;
				if (stopped) {
					next.release();
					return null;
				}
				if (
					next.status === "changed" ||
					options.storage.getItem(SESSION_STORAGE_KEY) !== next.snapshot
				) {
					next.release();
					schedule(1);
					return null;
				}
				if (next.status === "denied") {
					next.release();
					clearSession(options.storage);
					return publish("signed-out");
				}
				session = readSession(options.storage, now);
				observedStorage = options.storage.getItem(SESSION_STORAGE_KEY);
			} catch {
				// Do not exchange without ownership when the browser exposes locking.
				publish("retrying");
				schedule(1000);
				return null;
			}
		}
		if (retryAt > now()) {
			publish("retrying");
			const untilExpiry = session ? session.expires_at - now() : Infinity;
			schedule(Math.min(retryAt - now(), untilExpiry));
			return session;
		}
		if (session && session.expires_at - now() > 60_000) {
			publish("ready");
			schedule(session.expires_at - now() - 60_000);
			return session;
		}
		exchanging = true;
		publish("refreshing");
		try {
			const next = await refreshSession(options.config, options.storage, options.fetch, now);
			failures = 0;
			retryAt = 0;
			observedStorage = options.storage.getItem(SESSION_STORAGE_KEY);
			publish("ready");
			// Very short token lifetimes must not create a zero-delay renewal loop.
			schedule(
				Math.max(1000, next.expires_at - now() - Math.min(60_000, (next.expires_at - now()) / 2)),
			);
			return next;
		} catch (error) {
			if (
				error instanceof SessionRefreshError &&
				(error.reason === "missing" || error.reason === "rejected")
			) {
				publish("signed-out");
				return null;
			}
			if (error instanceof SessionRefreshError && error.reason === "changed") {
				schedule(1);
				return publish(readSession(options.storage, now) ? "ready" : "signed-out");
			}
			failures++;
			retryAt = now() + Math.min(60_000, 1000 * 2 ** Math.min(failures - 1, 6));
			const current = publish("retrying");
			schedule(Math.min(retryAt - now(), current ? current.expires_at - now() : Infinity));
			return current;
		} finally {
			exchanging = false;
		}
	}

	function check(): Promise<AuthSession | null> {
		if (pending) {
			if (exchanging) publish("refreshing");
			return pending;
		}
		pending = reconcile().finally(() => {
			pending = undefined;
		});
		return pending;
	}
	const wake = () => {
		void check();
	};
	const visible = () => {
		if (options.document.visibilityState === "visible") wake();
	};
	options.window.addEventListener("focus", wake);
	options.window.addEventListener("pageshow", wake);
	options.window.addEventListener(AUTH_CHANGED_EVENT, wake);
	options.document.addEventListener("visibilitychange", visible);
	const markerTimer =
		options.document.cookie === undefined
			? undefined
			: setInterval(() => {
					if (markerSignedOut()) wake();
				}, options.markerIntervalMs ?? MARKER_CHECK_INTERVAL_MS);
	return {
		ready: check(),
		check,
		stop() {
			stopped = true;
			lease?.release();
			if (timer !== undefined) clearTimeout(timer);
			if (expiryTimer !== undefined) clearTimeout(expiryTimer);
			if (markerTimer !== undefined) clearInterval(markerTimer);
			options.window.removeEventListener("focus", wake);
			options.window.removeEventListener("pageshow", wake);
			options.window.removeEventListener(AUTH_CHANGED_EVENT, wake);
			options.document.removeEventListener("visibilitychange", visible);
		},
	};
}
