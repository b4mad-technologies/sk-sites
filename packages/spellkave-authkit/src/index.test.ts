import { afterEach, describe, expect, it, vi } from "vitest";
import {
	authorizeUrl,
	clearSession,
	endAuthSession,
	MARKER_SEEN_STORAGE_KEY,
	MCP_RESOURCE,
	PKCE_STORAGE_KEY,
	readAuthConfig,
	readSession,
	refreshSession,
	refreshTokenRequestBody,
	SESSION_STORAGE_KEY,
	startLogin,
	submitForm,
	tokenRequestBody,
	writeSession,
} from "./index.ts";

function memoryStorage(): Storage {
	const map = new Map<string, string>();
	return {
		get length() {
			return map.size;
		},
		clear() {
			map.clear();
		},
		getItem(key) {
			return map.get(key) ?? null;
		},
		key(index) {
			return [...map.keys()][index] ?? null;
		},
		removeItem(key) {
			map.delete(key);
		},
		setItem(key, value) {
			map.set(key, value);
		},
	};
}

function idToken(claims: Record<string, unknown>): string {
	const payload = btoa(JSON.stringify(claims)).replaceAll("+", "-").replaceAll("=", "");
	return `e30.${payload}.sig`;
}

const config = {
	clientId: "client_test",
	issuer: "https://staging-tenant.authkit.app",
};

const callbackPath = "/auth/callback";

describe("session renewal", () => {
	it("bounds body reads and cannot persist a body arriving after timeout", async () => {
		vi.useFakeTimers();
		try {
			const storage = memoryStorage();
			writeSession(storage, {
				access_token: "old",
				refresh_token: "refresh",
				id_token: "",
				display_name: "Ada",
				expires_at: 1,
			});
			const before = storage.getItem(SESSION_STORAGE_KEY);
			const response = new Response(null);
			let finishBody!: (body: unknown) => void;
			vi.spyOn(response, "json").mockImplementation(
				() =>
					new Promise((resolve) => {
						finishBody = resolve;
					}),
			);
			const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response);
			const result = expect(refreshSession(config, storage, fetchImpl)).rejects.toMatchObject({
				reason: "temporary",
			});
			await vi.advanceTimersByTimeAsync(15_000);
			await result;
			expect(fetchImpl.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
			finishBody({ access_token: "late", expires_in: 3600 });
			await vi.advanceTimersByTimeAsync(0);
			expect(storage.getItem(SESSION_STORAGE_KEY)).toBe(before);
		} finally {
			vi.useRealTimers();
		}
	});
	function stored() {
		const storage = memoryStorage();
		writeSession(storage, {
			access_token: "old-access",
			refresh_token: "old-refresh",
			id_token: idToken({ name: "Ada" }),
			display_name: "Ada",
			expires_at: 10,
		});
		return storage;
	}

	it("retains renewal credentials after access expiry, without returning an expired session", () => {
		const storage = stored();
		expect(readSession(storage, () => 11)).toBeNull();
		expect(JSON.parse(storage.getItem(SESSION_STORAGE_KEY) ?? "{}").refresh_token).toBe(
			"old-refresh",
		);
	});

	it("coalesces callers and preserves identity when the response rotates only access and refresh tokens", async () => {
		const storage = stored();
		const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
			new Response(
				JSON.stringify({
					access_token: "new-access",
					refresh_token: "new-refresh",
					expires_in: 3600,
				}),
			),
		);
		const [a, b] = await Promise.all([
			refreshSession(config, storage, fetchImpl, () => 1000),
			refreshSession(config, storage, fetchImpl, () => 1000),
		]);
		expect(fetchImpl).toHaveBeenCalledTimes(1);
		expect(a).toEqual(b);
		expect(a).toMatchObject({
			display_name: "Ada",
			refresh_token: "new-refresh",
			expires_at: 3601000,
		});
	});

	it.each([
		429, 500, 503,
	])("retains the grant after HTTP %s and permits a later retry", async (status) => {
		const storage = stored();
		const before = storage.getItem(SESSION_STORAGE_KEY);
		const fetchImpl = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(new Response("unavailable", { status }))
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ access_token: "renewed", expires_in: 3600 })),
			);
		await expect(refreshSession(config, storage, fetchImpl)).rejects.toMatchObject({
			reason: "temporary",
		});
		expect(storage.getItem(SESSION_STORAGE_KEY)).toBe(before);
		await expect(refreshSession(config, storage, fetchImpl)).resolves.toMatchObject({
			access_token: "renewed",
		});
	});

	it.each([
		"invalid_grant",
		"invalid_refresh_token",
	])("clears %s without exposing provider text", async (error) => {
		const storage = stored();
		const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
			new Response(
				JSON.stringify({
					error,
					error_description: "private provider detail",
				}),
				{ status: 400 },
			),
		);
		await expect(refreshSession(config, storage, fetchImpl)).rejects.toThrow(
			"session refresh rejected",
		);
		expect(storage.getItem(SESSION_STORAGE_KEY)).toBeNull();
	});

	it("retains the grant on network failure and sanitizes the error", async () => {
		const storage = stored();
		const before = storage.getItem(SESSION_STORAGE_KEY);
		const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new Error("private network detail"));
		await expect(refreshSession(config, storage, fetchImpl)).rejects.toThrow(
			"session refresh temporary",
		);
		expect(storage.getItem(SESSION_STORAGE_KEY)).toBe(before);
	});

	it.each([
		"success",
		"rejection",
	])("does not overwrite a new login after a delayed %s", async (outcome) => {
		const storage = stored();
		let respond!: (response: Response) => void;
		const fetchImpl = vi.fn<typeof fetch>().mockImplementation(
			() =>
				new Promise((resolve) => {
					respond = resolve;
				}),
		);
		const pending = refreshSession(config, storage, fetchImpl);
		clearSession(storage);
		writeSession(storage, {
			access_token: "other-login",
			id_token: "",
			display_name: "Other",
			expires_at: 999999,
		});
		respond(
			outcome === "success"
				? new Response(JSON.stringify({ access_token: "stale" }))
				: new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 }),
		);
		await expect(pending).rejects.toMatchObject({ reason: "changed" });
		expect(readSession(storage, () => 1)?.access_token).toBe("other-login");
	});

	it("does not restore a signed-out session", async () => {
		const storage = stored();
		let respond!: (response: Response) => void;
		const fetchImpl = vi.fn<typeof fetch>().mockImplementation(
			() =>
				new Promise((resolve) => {
					respond = resolve;
				}),
		);
		const pending = refreshSession(config, storage, fetchImpl);
		clearSession(storage);
		respond(new Response(JSON.stringify({ access_token: "stale" })));
		await expect(pending).rejects.toMatchObject({ reason: "changed" });
		expect(storage.getItem(SESSION_STORAGE_KEY)).toBeNull();
	});
});

describe("sign-in and sign-out through the login site", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("startLogin never sends prompt (no silent login, ADR-0161 D-9)", async () => {
		const storage = memoryStorage();
		const assigned: string[] = [];
		await startLogin(
			config,
			"http://localhost:5173",
			storage,
			(url) => assigned.push(url),
			callbackPath,
		);
		expect(assigned).toHaveLength(1);
		const url = new URL(assigned[0] ?? "");
		expect(url.searchParams.get("prompt")).toBeNull();
		expect(storage.getItem(PKCE_STORAGE_KEY)).not.toBeNull();
	});

	it("sign-out clears the tab and posts return_to and the stored token, even an expired one", () => {
		const storage = memoryStorage();
		writeSession(storage, {
			access_token: "expired-access",
			id_token: "",
			expires_at: 1,
			display_name: "Ada",
			refresh_token: "refresh",
		});
		storage.setItem(MARKER_SEEN_STORAGE_KEY, "1");
		const submit = vi.fn();
		expect(
			endAuthSession(
				storage,
				{ loginOrigin: "https://login.spellkave.com" },
				"https://admin.spellkave.com/",
				submit,
			),
		).toBe(true);
		expect(submit).toHaveBeenCalledWith("https://login.spellkave.com/logout", {
			return_to: "https://admin.spellkave.com/",
			token: "expired-access",
		});
		expect(storage.getItem(SESSION_STORAGE_KEY)).toBeNull();
		expect(storage.getItem(MARKER_SEEN_STORAGE_KEY)).toBeNull();
	});

	it("sign-out without a stored token still posts the form (the login cookie names the person)", () => {
		const storage = memoryStorage();
		storage.setItem(SESSION_STORAGE_KEY, "not json");
		const submit = vi.fn();
		endAuthSession(
			storage,
			{ loginOrigin: "http://127.0.0.1:18081/" },
			"https://spellkave.com/",
			submit,
		);
		expect(submit).toHaveBeenCalledWith("http://127.0.0.1:18081/logout", {
			return_to: "https://spellkave.com/",
		});
		expect(storage.getItem(SESSION_STORAGE_KEY)).toBeNull();
	});

	it("submitForm posts a hidden-field form as a top-level navigation", () => {
		type Node = Record<string, unknown> & { children: Node[]; append(child: Node): void };
		const make = (tag: string): Node => {
			const node: Node = {
				tag,
				children: [],
				append(child: Node) {
					node.children.push(child);
				},
			};
			return node;
		};
		const body = make("body");
		const submit = vi.fn();
		const doc = {
			body,
			createElement: (tag: string) => {
				const node = make(tag);
				if (tag === "form") node.submit = submit;
				return node;
			},
		} as unknown as Pick<Document, "createElement" | "body">;
		submitForm("https://login.spellkave.com/logout", { return_to: "https://spellkave.com/" }, doc);
		const form = body.children[0] as Node;
		expect(form).toMatchObject({
			tag: "form",
			method: "POST",
			action: "https://login.spellkave.com/logout",
		});
		expect(form.children).toEqual([
			expect.objectContaining({
				type: "hidden",
				name: "return_to",
				value: "https://spellkave.com/",
			}),
		]);
		expect(submit).toHaveBeenCalledOnce();
	});

	it("sign-out without a configured login origin (dev build) signs out only this tab", () => {
		const storage = memoryStorage();
		writeSession(storage, {
			access_token: "a",
			id_token: "",
			expires_at: Date.now() + 1,
			display_name: "x",
		});
		const submit = vi.fn();
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		expect(endAuthSession(storage, {}, "https://spellkave.com/", submit)).toBe(false);
		expect(submit).not.toHaveBeenCalled();
		expect(storage.getItem(SESSION_STORAGE_KEY)).toBeNull();
		expect(warn).toHaveBeenCalledOnce();
	});

	it("readAuthConfig has no default login origin and throws on an invalid one", () => {
		const base = {
			VITE_WORKOS_CLIENT_ID: "client_x",
			VITE_WORKOS_ISSUER: "https://a.authkit.app/",
		};
		expect(readAuthConfig(base)?.loginOrigin).toBeUndefined();
		expect(
			readAuthConfig({ ...base, VITE_SPELLKAVE_LOGIN_ORIGIN: "https://login.example/" })
				?.loginOrigin,
		).toBe("https://login.example");
		expect(
			readAuthConfig({ ...base, VITE_SPELLKAVE_LOGIN_ORIGIN: "http://127.0.0.1:18081" })
				?.loginOrigin,
		).toBe("http://127.0.0.1:18081");
		for (const bad of ["http://evil.example", "login.spellkave.com", "https://login.example/x"])
			expect(() => readAuthConfig({ ...base, VITE_SPELLKAVE_LOGIN_ORIGIN: bad })).toThrow(
				/VITE_SPELLKAVE_LOGIN_ORIGIN/,
			);
	});

	it("authorizeUrl carries no prompt", () => {
		const plain = new URL(
			authorizeUrl(config, "http://localhost:5173/auth/callback", "chal", "st"),
		);
		expect(plain.searchParams.get("prompt")).toBeNull();
	});

	it("binds the default MCP resource when AuthConfig.resource is omitted", () => {
		const url = new URL(authorizeUrl(config, "http://localhost:5173/auth/callback", "chal", "st"));
		expect(url.searchParams.get("resource")).toBe(MCP_RESOURCE);
		expect(tokenRequestBody(config, "code", "http://localhost/cb", "ver").get("resource")).toBe(
			MCP_RESOURCE,
		);
		expect(refreshTokenRequestBody(config, "refresh").get("resource")).toBe(MCP_RESOURCE);
	});

	it("overrides the RFC 8707 resource when AuthConfig.resource is set", () => {
		const local = { ...config, resource: "https://127.0.0.1:8443/mcp" };
		const url = new URL(authorizeUrl(local, "http://localhost:5173/auth/callback", "chal", "st"));
		expect(url.searchParams.get("resource")).toBe("https://127.0.0.1:8443/mcp");
		expect(tokenRequestBody(local, "code", "http://localhost/cb", "ver").get("resource")).toBe(
			"https://127.0.0.1:8443/mcp",
		);
		expect(refreshTokenRequestBody(local, "refresh").get("resource")).toBe(
			"https://127.0.0.1:8443/mcp",
		);
	});
});
