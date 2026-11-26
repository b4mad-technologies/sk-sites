import {
	AUTH_SCOPES,
	authorizeUrl,
	clearSession,
	completeLogin,
	createPkce,
	displayNameFromIdToken,
	MCP_RESOURCE,
	PKCE_STORAGE_KEY,
	readAuthConfig,
	readSession,
	refreshSession,
	refreshTokenRequestBody,
	SESSION_STORAGE_KEY,
	startLogin,
	tokenRequestBody,
	writeSession,
} from "@spellkave/authkit";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CALLBACK_PATH } from "./auth-routes";

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

// Concrete AuthKit issuer string for unit tests only (staging demo tenant).
// Production builds never default to this — VITE_WORKOS_ISSUER must be set
// explicitly (see apps/website/.env.example). Identity = BLAKE3(iss|sub).
const config = {
	clientId: "client_test",
	issuer: "https://staging-tenant.authkit.app",
};

describe("AuthKit-domain Connect SPA (same iss as MCP)", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("requires issuer + client id over https", () => {
		expect(readAuthConfig({})).toBeNull();
		expect(
			readAuthConfig({ VITE_WORKOS_CLIENT_ID: "c", VITE_WORKOS_ISSUER: "http://insecure" }),
		).toBe(null);
		expect(
			readAuthConfig({
				VITE_WORKOS_CLIENT_ID: "c",
				VITE_WORKOS_ISSUER: "https://staging-tenant.authkit.app/",
			}),
		).toEqual({
			clientId: "c",
			issuer: "https://staging-tenant.authkit.app",
		});
	});

	it("builds the AuthKit-domain authorize URL with PKCE S256 and offline_access", () => {
		const url = new URL(authorizeUrl(config, "http://localhost:5173/auth/callback", "chal", "st"));
		expect(url.origin + url.pathname).toBe(`${config.issuer}/oauth2/authorize`);
		expect(url.searchParams.get("client_id")).toBe("client_test");
		expect(url.searchParams.get("response_type")).toBe("code");
		expect(url.searchParams.get("scope")).toBe(AUTH_SCOPES);
		expect(url.searchParams.get("code_challenge")).toBe("chal");
		expect(url.searchParams.get("code_challenge_method")).toBe("S256");
		expect(url.searchParams.get("state")).toBe("st");
		expect(url.searchParams.has("client_secret")).toBe(false);
		expect(url.href).not.toContain("user_management");
	});

	it("token body is form-urlencoded for a public client (no secret)", () => {
		const body = tokenRequestBody(config, "code-1", "http://localhost:5173/auth/callback", "ver");
		expect(body.get("grant_type")).toBe("authorization_code");
		expect(body.get("client_id")).toBe("client_test");
		expect(body.get("code")).toBe("code-1");
		expect(body.get("code_verifier")).toBe("ver");
		expect(body.get("redirect_uri")).toBe("http://localhost:5173/auth/callback");
		expect(body.has("client_secret")).toBe(false);
	});

	it("stores the session in sessionStorage and logout clears it", () => {
		const storage = memoryStorage();
		writeSession(storage, {
			access_token: "tok",
			id_token: "id",
			expires_at: Date.now() + 60_000,
			display_name: "Ada",
		});
		expect(readSession(storage)?.display_name).toBe("Ada");
		expect(storage.getItem(SESSION_STORAGE_KEY)).toContain("tok");
		clearSession(storage);
		expect(readSession(storage)).toBeNull();
		expect(storage.getItem(PKCE_STORAGE_KEY)).toBeNull();
	});

	it("reads a display name from id_token claims", () => {
		expect(displayNameFromIdToken(idToken({ name: "Ada Lovelace", email: "ada@example" }))).toBe(
			"Ada Lovelace",
		);
		expect(displayNameFromIdToken(idToken({ email: "renn@example" }))).toBe("renn@example");
		expect(displayNameFromIdToken(idToken({ sub: "user_abcdefghijklmnopqrst" }))).toBe(
			"user_abcdefg",
		);
	});

	it("exchanges the code at {issuer}/oauth2/token and never sends a secret", async () => {
		const storage = memoryStorage();
		storage.setItem(
			PKCE_STORAGE_KEY,
			JSON.stringify({
				verifier: "ver-1",
				state: "st-1",
				redirect_uri: "http://localhost:5173/auth/callback",
			}),
		);
		const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
			expect(init?.headers).toEqual({ "content-type": "application/x-www-form-urlencoded" });
			const body = String(init?.body ?? "");
			expect(body.includes("client_secret")).toBe(false);
			expect(body.includes("code_verifier=ver-1")).toBe(true);
			expect(body.includes("grant_type=authorization_code")).toBe(true);
			return new Response(
				JSON.stringify({
					access_token: "access",
					id_token: idToken({ email: "renn@example" }),
					refresh_token: "refresh",
					expires_in: 300,
				}),
				{ status: 200 },
			);
		}) as unknown as typeof fetch;
		const session = await completeLogin(
			config,
			`http://localhost:5173${CALLBACK_PATH}?code=abc&state=st-1`,
			storage,
			fetchImpl,
			() => 1_000_000,
		);
		expect(session.access_token).toBe("access");
		expect(session.display_name).toBe("renn@example");
		expect(session.refresh_token).toBe("refresh");
		expect(session.expires_at).toBe(1_000_000 + 300_000);
		expect(storage.getItem(PKCE_STORAGE_KEY)).toBeNull();
		expect(fetchImpl).toHaveBeenCalledWith(
			`${config.issuer}/oauth2/token`,
			expect.objectContaining({ method: "POST" }),
		);
	});

	it("refreshes with grant_type=refresh_token and no secret", async () => {
		const storage = memoryStorage();
		writeSession(storage, {
			access_token: "old",
			id_token: idToken({ email: "old@example" }),
			expires_at: 1_000_000 + 60_000,
			display_name: "old",
			refresh_token: "rt-1",
		});
		const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
			const body = String(init?.body ?? "");
			expect(body.includes("grant_type=refresh_token")).toBe(true);
			expect(body.includes("refresh_token=rt-1")).toBe(true);
			expect(body.includes("client_secret")).toBe(false);
			return new Response(
				JSON.stringify({
					access_token: "new",
					id_token: idToken({ name: "Renn Voss" }),
					expires_in: 300,
				}),
				{ status: 200 },
			);
		}) as unknown as typeof fetch;
		const session = await refreshSession(config, storage, fetchImpl, () => 1_000_000);
		expect(session.access_token).toBe("new");
		expect(session.display_name).toBe("Renn Voss");
		expect(session.refresh_token).toBe("rt-1");
		expect(refreshTokenRequestBody(config, "rt-1").get("grant_type")).toBe("refresh_token");
	});

	it("rejects a state mismatch before calling the token endpoint", async () => {
		const storage = memoryStorage();
		storage.setItem(
			PKCE_STORAGE_KEY,
			JSON.stringify({
				verifier: "ver-1",
				state: "expected",
				redirect_uri: "http://localhost:5173/auth/callback",
			}),
		);
		const fetchImpl = vi.fn() as unknown as typeof fetch;
		await expect(
			completeLogin(
				config,
				`http://localhost:5173${CALLBACK_PATH}?code=abc&state=other`,
				storage,
				fetchImpl,
			),
		).rejects.toThrow("state mismatch");
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it("S256 challenge matches SHA-256 of a known verifier", async () => {
		const verifierBytes = new Uint8Array(32).fill(7);
		const stateBytes = new Uint8Array(16).fill(9);
		const queue = [verifierBytes, stateBytes];
		const { verifier, challenge } = await createPkce(crypto.subtle, () => {
			const next = queue.shift();
			if (next === undefined) throw new Error("pkce rng exhausted");
			return next;
		});
		const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
		const expected = btoa(String.fromCharCode(...new Uint8Array(digest)))
			.replaceAll("+", "-")
			.replaceAll("/", "_")
			.replaceAll("=", "");
		expect(challenge).toBe(expected);
	});

	it("error callback clears PKCE and does not call the token endpoint", async () => {
		const storage = memoryStorage();
		storage.setItem(
			PKCE_STORAGE_KEY,
			JSON.stringify({ verifier: "v", state: "s", redirect_uri: "x" }),
		);
		const fetchImpl = vi.fn() as unknown as typeof fetch;
		await expect(
			completeLogin(
				config,
				`http://localhost:5173${CALLBACK_PATH}?error=access_denied&error_description=nope`,
				storage,
				fetchImpl,
			),
		).rejects.toThrow("nope");
		expect(fetchImpl).not.toHaveBeenCalled();
		expect(storage.getItem(PKCE_STORAGE_KEY)).toBeNull();
	});

	it("expired session is treated as logged out", () => {
		const storage = memoryStorage();
		writeSession(storage, {
			access_token: "tok",
			id_token: "id",
			expires_at: 10,
			display_name: "Ada",
		});
		expect(readSession(storage, () => 11)).toBeNull();
		expect(storage.getItem(SESSION_STORAGE_KEY)).toBeNull();
	});

	it("clears a corrupt session blob", () => {
		const storage = memoryStorage();
		storage.setItem(SESSION_STORAGE_KEY, "{not-json");
		expect(readSession(storage)).toBeNull();
		expect(storage.getItem(SESSION_STORAGE_KEY)).toBeNull();
	});

	it("clears a session blob whose access_token is missing", () => {
		const storage = memoryStorage();
		storage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ display_name: "Ada" }));
		expect(readSession(storage)).toBeNull();
		expect(storage.getItem(SESSION_STORAGE_KEY)).toBeNull();
	});

	it("startLogin parks the verifier and redirects to {issuer}/oauth2/authorize", async () => {
		const storage = memoryStorage();
		const assigned: string[] = [];
		await startLogin(
			config,
			"http://localhost:5173",
			storage,
			(url) => assigned.push(url),
			CALLBACK_PATH,
		);
		const pending = JSON.parse(storage.getItem(PKCE_STORAGE_KEY) ?? "{}") as { verifier: string };
		expect(pending.verifier.length).toBeGreaterThan(10);
		expect(assigned[0]).toContain(`${config.issuer}/oauth2/authorize`);
		expect(assigned[0]).toContain("code_challenge_method=S256");
		expect(assigned[0]).not.toContain("user_management");
	});
});

describe("mcp resource binding (RFC 8707)", () => {
	const config = { clientId: "client_x", issuer: "https://issuer.example" };
	it("authorize URL, code exchange, and refresh all carry the MCP resource", () => {
		const url = new URL(authorizeUrl(config, "https://spellkave.com/auth/callback", "chal", "st"));
		expect(url.searchParams.get("resource")).toBe(MCP_RESOURCE);
		expect(
			tokenRequestBody(config, "code", "https://spellkave.com/auth/callback", "ver").get(
				"resource",
			),
		).toBe(MCP_RESOURCE);
		expect(refreshTokenRequestBody(config, "rt").get("resource")).toBe(MCP_RESOURCE);
	});
});
