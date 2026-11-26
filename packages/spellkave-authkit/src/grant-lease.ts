import { type AuthConfig, MCP_RESOURCE, SESSION_STORAGE_KEY } from "./index";

export type GrantLease = {
	status: "owned" | "denied" | "changed";
	snapshot?: string | null;
	release: () => void;
};

/** Same-document consumers share ownership; other tabs must obtain their own grant. */
const owners = new WeakMap<Storage, Map<string, { promise: Promise<GrantLease>; users: number }>>();

export async function acquireGrantLease(
	storage: Storage,
	config: AuthConfig,
	locks: Pick<LockManager, "request">,
): Promise<GrantLease> {
	const original = storage.getItem(SESSION_STORAGE_KEY);
	const session = JSON.parse(original ?? "null");
	if (!session?.refresh_token) return { status: "changed", release() {} };
	let id = session.refresh_session_id;
	if (typeof id !== "string" || !id) {
		const digest = await crypto.subtle.digest(
			"SHA-256",
			new TextEncoder().encode(session.refresh_token),
		);
		id = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
		if (storage.getItem(SESSION_STORAGE_KEY) !== original) {
			return { status: "changed", release() {} };
		}
		storage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ ...session, refresh_session_id: id }));
	}
	const claimed = storage.getItem(SESSION_STORAGE_KEY);
	const name = `spellkave:refresh:${JSON.stringify([config.issuer, config.clientId, config.resource ?? MCP_RESOURCE, id])}`;
	let entries = owners.get(storage);
	if (!entries) {
		entries = new Map();
		owners.set(storage, entries);
	}
	let entry = entries.get(name);
	if (!entry) {
		const promise = new Promise<GrantLease>((resolve, reject) => {
			void locks
				.request(name, { ifAvailable: true }, async (lock) => {
					if (!lock) {
						resolve({ status: "denied", release() {} });
						return;
					}
					await new Promise<void>((release) => resolve({ status: "owned", release }));
				})
				.catch(reject);
		});
		entry = { promise, users: 0 };
		entries.set(name, entry);
	}
	entry.users++;
	const shared = entry;
	let lease: GrantLease;
	try {
		lease = await shared.promise;
	} catch (error) {
		shared.users--;
		if (!shared.users) entries.delete(name);
		throw error;
	}
	let released = false;
	return {
		status: storage.getItem(SESSION_STORAGE_KEY) === claimed ? lease.status : "changed",
		snapshot: claimed,
		release() {
			if (released) return;
			released = true;
			if (--shared.users === 0) {
				entries.delete(name);
				lease.release();
			}
		},
	};
}
