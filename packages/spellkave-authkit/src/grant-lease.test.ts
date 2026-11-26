import { describe, expect, it, vi } from "vitest";
import { acquireGrantLease } from "./grant-lease";
import {
	readSession,
	refreshSession,
	SESSION_STORAGE_KEY,
	startSessionRenewal,
	writeSession,
} from "./index";

const config = { issuer: "https://issuer.example", clientId: "test" };

function store(): Storage {
	const values = new Map<string, string>();
	return {
		get length() {
			return values.size;
		},
		getItem: (key) => values.get(key) ?? null,
		setItem: (key, value) => {
			values.set(key, value);
		},
		removeItem: (key) => {
			values.delete(key);
		},
		clear: () => values.clear(),
		key: (index) => [...values.keys()][index] ?? null,
	};
}

function lockManager() {
	const held = new Set<string>();
	const request = async (
		name: string,
		_options: unknown,
		callback: (lock: object | null) => Promise<void>,
	) => {
		if (held.has(name)) return callback(null);
		held.add(name);
		try {
			await callback({ name });
		} finally {
			held.delete(name);
		}
	};
	return { locks: { request } as Pick<LockManager, "request">, held };
}

function session(storage: Storage) {
	writeSession(storage, {
		access_token: "access",
		id_token: "",
		refresh_token: "secret-grant",
		expires_at: Date.now() + 3_600_000,
		display_name: "Ada",
	});
}

describe("local refresh grant ownership", () => {
	function lifecycle(storage: Storage, locks: Pick<LockManager, "request">) {
		const fetch = vi.fn<typeof globalThis.fetch>();
		const onChange = vi.fn();
		const owner = startSessionRenewal({
			config,
			storage,
			locks,
			fetch,
			onChange,
			window: new EventTarget(),
			document: Object.assign(new EventTarget(), { visibilityState: "visible" as const }),
		});
		return { owner, fetch, onChange };
	}

	it("signs out only the copied tab before it can exchange the shared grant", async () => {
		const { locks } = lockManager();
		const first = store();
		session(first);
		const initial = lifecycle(first, locks);
		await initial.owner.ready;
		const second = store();
		second.setItem(SESSION_STORAGE_KEY, first.getItem(SESSION_STORAGE_KEY)!);
		const duplicate = lifecycle(second, locks);
		expect(await duplicate.owner.ready).toBeNull();
		expect(duplicate.onChange).toHaveBeenLastCalledWith({ session: null, status: "signed-out" });
		expect(duplicate.fetch).not.toHaveBeenCalled();
		expect(second.getItem(SESSION_STORAGE_KEY)).toBeNull();
		expect(readSession(first)?.access_token).toBe("access");
		duplicate.owner.stop();
		initial.owner.stop();
	});

	it("disposal during lock acquisition does not erase copied credentials", async () => {
		const storage = store();
		session(storage);
		let decide!: () => void;
		const request = async (
			_name: string,
			_options: unknown,
			callback: (lock: null) => Promise<void>,
		) => {
			await new Promise<void>((resolve) => {
				decide = resolve;
			});
			await callback(null);
		};
		const r = lifecycle(storage, { request } as Pick<LockManager, "request">);
		await expect.poll(() => typeof decide).toBe("function");
		r.owner.stop();
		decide();
		await r.owner.ready;
		expect(readSession(storage)?.access_token).toBe("access");
		expect(r.onChange).not.toHaveBeenCalled();
		expect(r.fetch).not.toHaveBeenCalled();
	});

	it("a new login wins over a pending denied ownership claim", async () => {
		const storage = store();
		session(storage);
		let decide!: () => void;
		const request = async (
			_name: string,
			_options: unknown,
			callback: (lock: null) => Promise<void>,
		) => {
			await new Promise<void>((resolve) => {
				decide = resolve;
			});
			await callback(null);
		};
		const r = lifecycle(storage, { request } as Pick<LockManager, "request">);
		await expect.poll(() => typeof decide).toBe("function");
		writeSession(storage, {
			access_token: "new-login",
			id_token: "",
			refresh_token: "new-grant",
			expires_at: Date.now() + 3_600_000,
			display_name: "Ada",
		});
		decide();
		await r.owner.ready;
		r.owner.stop();
		expect(readSession(storage)?.access_token).toBe("new-login");
		expect(r.fetch).not.toHaveBeenCalled();
	});

	it("rejects a copied grant without exposing the credential in the lock name", async () => {
		const { locks, held } = lockManager();
		const first = store();
		session(first);
		const second = store();
		second.setItem(SESSION_STORAGE_KEY, first.getItem(SESSION_STORAGE_KEY)!);
		const owner = await acquireGrantLease(first, config, locks);
		const copied = await acquireGrantLease(second, config, locks);
		expect(owner.status).toBe("owned");
		expect(copied.status).toBe("denied");
		expect([...held].join()).not.toContain("secret-grant");
		copied.release();
		owner.release();
		await expect.poll(() => held.size).toBe(0);
	});

	it("shares a same-document lease until its last consumer releases it", async () => {
		const { locks, held } = lockManager();
		const storage = store();
		session(storage);
		const first = await acquireGrantLease(storage, config, locks);
		const second = await acquireGrantLease(storage, config, locks);
		expect(second.status).toBe("owned");
		first.release();
		first.release();
		await Promise.resolve();
		expect(held.size).toBe(1);
		second.release();
		await expect.poll(() => held.size).toBe(0);
	});

	it("keeps the ownership identity across provider rotation", async () => {
		const { locks } = lockManager();
		const storage = store();
		session(storage);
		const owner = await acquireGrantLease(storage, config, locks);
		const before = readSession(storage)?.refresh_session_id;
		await refreshSession(
			config,
			storage,
			async () =>
				new Response(
					JSON.stringify({ access_token: "next", refresh_token: "rotated", expires_in: 3600 }),
				),
		);
		expect(readSession(storage)?.refresh_session_id).toBe(before);
		expect(readSession(storage)?.refresh_token).toBe("rotated");
		const copied = store();
		copied.setItem(SESSION_STORAGE_KEY, storage.getItem(SESSION_STORAGE_KEY)!);
		const denied = await acquireGrantLease(copied, config, locks);
		expect(denied.status).toBe("denied");
		denied.release();
		owner.release();
	});

	it("does not restore a session cleared while deriving its legacy identity", async () => {
		const { locks, held } = lockManager();
		const storage = store();
		session(storage);
		const pending = acquireGrantLease(storage, config, locks);
		storage.clear();
		expect((await pending).status).toBe("changed");
		expect(storage.length).toBe(0);
		expect(held.size).toBe(0);
	});
});
