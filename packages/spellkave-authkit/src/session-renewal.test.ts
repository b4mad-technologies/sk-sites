import { afterEach, describe, expect, it, vi } from "vitest";
import {
	AUTH_CHANGED_EVENT,
	clearSession,
	hasSignedInMarker,
	MARKER_CHECK_INTERVAL_MS,
	MARKER_SEEN_STORAGE_KEY,
	SESSION_STORAGE_KEY,
	type SessionRenewalState,
	startSessionRenewal,
	writeSession,
} from "./index";

function storage(): Storage {
	const values = new Map<string, string>();
	return {
		get length() {
			return values.size;
		},
		clear: () => values.clear(),
		getItem: (key) => values.get(key) ?? null,
		setItem: (key, value) => {
			values.set(key, value);
		},
		removeItem: (key) => {
			values.delete(key);
		},
		key: (index) => [...values.keys()][index] ?? null,
	};
}

describe("browser session renewal lifecycle", () => {
	afterEach(() => {
		vi.useRealTimers();
	});
	function rig(expiresAt = 3_600_000, renewable = true) {
		vi.useFakeTimers();
		vi.setSystemTime(0);
		const store = storage();
		writeSession(store, {
			access_token: "initial",
			id_token: "",
			expires_at: expiresAt,
			display_name: "Ada",
			...(renewable ? { refresh_token: "refresh" } : {}),
		});
		const window = new EventTarget();
		const document = Object.assign(new EventTarget(), {
			visibilityState: "visible" as DocumentVisibilityState,
		});
		const states: SessionRenewalState[] = [];
		const fetch = vi
			.fn<typeof globalThis.fetch>()
			.mockImplementation(
				async () => new Response(JSON.stringify({ access_token: "renewed", expires_in: 3600 })),
			);
		const owner = startSessionRenewal({
			config: { issuer: "https://issuer.example", clientId: "test" },
			storage: store,
			fetch,
			window,
			document,
			onChange: (state) => states.push(state),
		});
		return { owner, store, window, document, states, fetch };
	}

	it("renews one minute before expiry and schedules the rotated token", async () => {
		const r = rig();
		await r.owner.ready;
		await vi.advanceTimersByTimeAsync(3_539_999);
		expect(r.fetch).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(1);
		expect(r.fetch).toHaveBeenCalledTimes(1);
		expect(r.states.at(-1)).toMatchObject({
			status: "ready",
			session: { access_token: "renewed" },
		});
		await vi.advanceTimersByTimeAsync(3_540_000);
		expect(r.fetch).toHaveBeenCalledTimes(2);
		r.owner.stop();
	});

	it("recovers an expired stored access session at startup", async () => {
		const r = rig(-1);
		expect(await r.owner.ready).toMatchObject({ access_token: "renewed" });
		expect(r.fetch).toHaveBeenCalledTimes(1);
		r.owner.stop();
	});

	it("coalesces wake events after sleep without depending on a fired timer", async () => {
		const r = rig();
		await r.owner.ready;
		vi.setSystemTime(4_000_000);
		r.window.dispatchEvent(new Event("focus"));
		r.document.dispatchEvent(new Event("visibilitychange"));
		r.window.dispatchEvent(new Event("pageshow"));
		await r.owner.check();
		expect(r.fetch).toHaveBeenCalledTimes(1);
		expect(r.states.at(-1)?.session?.access_token).toBe("renewed");
		r.owner.stop();
	});

	it("backs off transient failures, keeps the grant and stops exposing an expired access token", async () => {
		const r = rig(65_000);
		r.fetch.mockRejectedValue(new Error("offline"));
		await r.owner.ready;
		await vi.advanceTimersByTimeAsync(5000);
		expect(r.states.at(-1)).toMatchObject({
			status: "retrying",
			session: { access_token: "initial" },
		});
		r.window.dispatchEvent(new Event("focus"));
		await r.owner.check();
		expect(r.fetch).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(60_000);
		expect(r.states.at(-1)).toEqual({ status: "retrying", session: null });
		expect(r.store.getItem(SESSION_STORAGE_KEY)).toContain("refresh");
		expect(r.fetch.mock.calls.length).toBeLessThan(10);
		r.owner.stop();
	});

	it("returns signed-out for a rejected grant and does not keep retrying", async () => {
		const r = rig(65_000);
		r.fetch.mockResolvedValue(
			new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 }),
		);
		await r.owner.ready;
		await vi.advanceTimersByTimeAsync(5000);
		expect(r.states.at(-1)).toEqual({ status: "signed-out", session: null });
		await vi.advanceTimersByTimeAsync(120_000);
		expect(r.fetch).toHaveBeenCalledTimes(1);
		r.owner.stop();
	});

	it("withdraws an expired access token while renewal is still waiting, then times out safely", async () => {
		const r = rig(65_000);
		let resolveLate!: (response: Response) => void;
		r.fetch.mockImplementation(
			() =>
				new Promise((resolve) => {
					resolveLate = resolve;
				}),
		);
		await r.owner.ready;
		// Wake close to expiry, without running the original timer first.
		vi.setSystemTime(64_000);
		r.window.dispatchEvent(new Event("focus"));
		await vi.advanceTimersByTimeAsync(0);
		expect(r.states.at(-1)).toMatchObject({
			status: "refreshing",
			session: { access_token: "initial" },
		});
		await vi.advanceTimersByTimeAsync(1000);
		expect(r.states.at(-1)).toEqual({ status: "refreshing", session: null });
		await vi.advanceTimersByTimeAsync(14_000);
		expect(r.states.at(-1)).toEqual({ status: "retrying", session: null });
		expect(r.fetch.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
		resolveLate(new Response(JSON.stringify({ access_token: "too-late", expires_in: 3600 })));
		await vi.advanceTimersByTimeAsync(0);
		expect(r.store.getItem(SESSION_STORAGE_KEY)).not.toContain("too-late");
		expect(r.store.getItem(SESSION_STORAGE_KEY)).toContain("refresh");
		r.owner.stop();
	});

	it("expires a non-renewable session without calling the token endpoint", async () => {
		const r = rig(5000, false);
		const authChanged = vi.fn();
		r.window.addEventListener(AUTH_CHANGED_EVENT, authChanged);
		await r.owner.ready;
		await vi.advanceTimersByTimeAsync(5000);
		expect(r.states.at(-1)).toEqual({ status: "signed-out", session: null });
		expect(r.fetch).not.toHaveBeenCalled();
		expect(authChanged).toHaveBeenCalledTimes(1);
		r.owner.stop();
	});

	it("observes explicit logout and removes timers/listeners on disposal", async () => {
		const r = rig();
		await r.owner.ready;
		clearSession(r.store);
		r.window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
		await r.owner.check();
		expect(r.states.at(-1)).toEqual({ status: "signed-out", session: null });
		r.owner.stop();
		const count = r.states.length;
		r.window.dispatchEvent(new Event("focus"));
		await vi.advanceTimersByTimeAsync(4_000_000);
		expect(r.states).toHaveLength(count);
		expect(r.fetch).not.toHaveBeenCalled();
	});
});

describe("signed-in marker (ADR-0161 D-7 step 5)", () => {
	afterEach(() => {
		vi.useRealTimers();
	});
	function rig(cookie: string) {
		vi.useFakeTimers();
		vi.setSystemTime(0);
		const store = storage();
		writeSession(store, {
			access_token: "initial",
			id_token: "",
			expires_at: 3_600_000,
			display_name: "Ada",
		});
		const window = new EventTarget();
		const document = Object.assign(new EventTarget(), {
			visibilityState: "visible" as DocumentVisibilityState,
			cookie,
		});
		const states: SessionRenewalState[] = [];
		const owner = startSessionRenewal({
			config: { issuer: "https://issuer.example", clientId: "test" },
			storage: store,
			fetch: vi.fn<typeof globalThis.fetch>(),
			window,
			document,
			onChange: (state) => states.push(state),
		});
		return { owner, store, document, states };
	}

	it("signs the tab out within one 10 s check after the marker disappears", async () => {
		const r = rig("theme=dark; sk_signed_in=1");
		await r.owner.ready;
		expect(r.states.at(-1)?.status).toBe("ready");
		expect(r.store.getItem(MARKER_SEEN_STORAGE_KEY)).toBe("1");
		r.document.cookie = "theme=dark; sk_signed_in=";
		await vi.advanceTimersByTimeAsync(MARKER_CHECK_INTERVAL_MS);
		expect(r.states.at(-1)).toEqual({ session: null, status: "signed-out" });
		expect(r.store.getItem(SESSION_STORAGE_KEY)).toBeNull();
		r.owner.stop();
	});

	it("rechecks on a visible-tab transition before the interval", async () => {
		const r = rig("sk_signed_in=1");
		await r.owner.ready;
		r.document.cookie = "";
		r.document.dispatchEvent(new Event("visibilitychange"));
		await vi.advanceTimersByTimeAsync(0);
		expect(r.states.at(-1)?.status).toBe("signed-out");
		r.owner.stop();
	});

	it("a tab that never saw the marker (loopback dev) is not signed out by its absence", async () => {
		const r = rig("");
		await r.owner.ready;
		await vi.advanceTimersByTimeAsync(MARKER_CHECK_INTERVAL_MS * 3);
		expect(r.states.at(-1)?.status).toBe("ready");
		expect(r.store.getItem(SESSION_STORAGE_KEY)).not.toBeNull();
		r.owner.stop();
	});

	it("a reloaded tab that saw the marker signs out at startup when it is gone", async () => {
		vi.useFakeTimers();
		const r = rig("sk_signed_in=1");
		await r.owner.ready;
		r.owner.stop();
		const again = startSessionRenewal({
			config: { issuer: "https://issuer.example", clientId: "test" },
			storage: r.store,
			fetch: vi.fn<typeof globalThis.fetch>(),
			window: new EventTarget(),
			document: Object.assign(new EventTarget(), {
				visibilityState: "visible" as DocumentVisibilityState,
				cookie: "",
			}),
			onChange: () => {},
		});
		expect(await again.ready).toBeNull();
		expect(r.store.getItem(SESSION_STORAGE_KEY)).toBeNull();
		again.stop();
	});

	it("parses the cookie by name, not by substring", () => {
		expect(hasSignedInMarker("x_sk_signed_in=1")).toBe(false);
		expect(hasSignedInMarker("a=b;  sk_signed_in=1")).toBe(true);
		expect(hasSignedInMarker("sk_signed_in=")).toBe(false);
	});
});
