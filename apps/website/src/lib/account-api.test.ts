import { afterEach, describe, expect, it, vi } from "vitest";

import {
	AccountApi,
	AccountApiError,
	DEFAULT_ACCOUNT_API_URL,
	DEV_ACCOUNT_API_URL,
	formatAccountApiError,
	mapAccountHttpError,
	readAccountApiUrl,
} from "./account-api";

afterEach(() => {
	vi.restoreAllMocks();
});

describe("readAccountApiUrl", () => {
	it("prefers an explicit https base and strips trailing slashes", () => {
		expect(readAccountApiUrl({ VITE_SPELLKAVE_API_URL: "https://api.example.com/v1/" })).toBe(
			"https://api.example.com/v1",
		);
	});

	it("defaults to api.spellkave.com in production and mcp alias in dev", () => {
		expect(readAccountApiUrl({})).toBe(DEFAULT_ACCOUNT_API_URL);
		expect(readAccountApiUrl({}, { dev: true })).toBe(DEV_ACCOUNT_API_URL);
	});

	it("rejects non-http schemes and falls back", () => {
		expect(readAccountApiUrl({ VITE_SPELLKAVE_API_URL: "ws://localhost" })).toBe(
			DEFAULT_ACCOUNT_API_URL,
		);
	});
});

describe("mapAccountHttpError", () => {
	it("maps 401/403/409 to typed codes with body messages", () => {
		expect(mapAccountHttpError(401, { error_description: "expired" })).toMatchObject({
			code: "unauthorized",
			status: 401,
			message: "expired",
		});
		expect(mapAccountHttpError(403, { error: "forbidden" })).toMatchObject({
			code: "forbidden",
			status: 403,
			message: "forbidden",
		});
		expect(mapAccountHttpError(409, { error_description: "taken" })).toMatchObject({
			code: "conflict",
			status: 409,
			message: "taken",
		});
		expect(mapAccountHttpError(500, null).code).toBe("http");
	});
});

describe("AccountApi", () => {
	it("sends bearer auth and parses account + seats", async () => {
		const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			expect(init?.headers).toMatchObject({
				Authorization: "Bearer jwt-1",
				Accept: "application/json",
			});
			if (url.endsWith("/v1/account")) {
				return new Response(
					JSON.stringify({
						sub: "user_a",
						worlds: [{ slug: "demo1", display_name: "Demo", role: "owner" }],
						seat: null,
					}),
					{ status: 200 },
				);
			}
			if (url.endsWith("/v1/worlds/demo1/seats")) {
				return new Response(
					JSON.stringify([{ actor_id: "1", name: "Renn", claimed: false, mine: false }]),
					{ status: 200 },
				);
			}
			return new Response("", { status: 404 });
		});
		const api = new AccountApi({
			baseUrl: "https://api.spellkave.com",
			token: "jwt-1",
			fetchImpl: fetchImpl as unknown as typeof fetch,
		});
		await expect(api.getAccount()).resolves.toMatchObject({
			sub: "user_a",
			worlds: [{ slug: "demo1", role: "owner" }],
		});
		await expect(api.listSeats("demo1")).resolves.toEqual([
			{ actor_id: "1", name: "Renn", claimed: false, mine: false },
		]);
	});

	it("POSTs claim/release/members/reset and PATCHes join_policy", async () => {
		const calls: Array<{ url: string; method: string; body: string | null }> = [];
		const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			const method = init?.method ?? "GET";
			const body = typeof init?.body === "string" ? init.body : null;
			calls.push({ url, method, body });
			if (url.endsWith("/claim")) {
				return new Response(
					JSON.stringify({ seat: { slug: "demo1", actor_id: "1", role: "primary" } }),
					{ status: 200 },
				);
			}
			if (url.endsWith("/release")) {
				return new Response(JSON.stringify({ ok: true }), { status: 200 });
			}
			if (url.endsWith("/members") && method === "POST") {
				return new Response(JSON.stringify({ members: ["user_b"] }), { status: 200 });
			}
			if (url.includes("/members/") && method === "DELETE") {
				return new Response(JSON.stringify({ members: [] }), { status: 200 });
			}
			if (method === "PATCH") {
				return new Response(JSON.stringify({ join_policy: "open" }), { status: 200 });
			}
			if (url.endsWith("/reset") && method === "POST") {
				return new Response(JSON.stringify({ job_id: "job-1" }), { status: 202 });
			}
			if (url.endsWith("/reset/job-1")) {
				return new Response(JSON.stringify({ state: "done" }), { status: 200 });
			}
			return new Response("", { status: 404 });
		});
		const api = new AccountApi({
			baseUrl: "https://mcp.spellkave.com/",
			token: "jwt",
			fetchImpl: fetchImpl as unknown as typeof fetch,
		});
		await expect(api.claimSeat("demo1", "1")).resolves.toMatchObject({
			seat: { actor_id: "1" },
		});
		await expect(api.releaseSeat("demo1")).resolves.toEqual({ ok: true });
		await expect(api.addMember("demo1", "user_b")).resolves.toEqual({ members: ["user_b"] });
		await expect(api.removeMember("demo1", "user_b")).resolves.toEqual({ members: [] });
		await expect(api.patchWorld("demo1", { join_policy: "open" })).resolves.toEqual({
			join_policy: "open",
		});
		await expect(api.requestReset("demo1")).resolves.toEqual({ job_id: "job-1" });
		await expect(api.getResetStatus("demo1", "job-1")).resolves.toEqual({ state: "done" });
		expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
			"POST https://mcp.spellkave.com/v1/worlds/demo1/seats/1/claim",
			"POST https://mcp.spellkave.com/v1/worlds/demo1/seats/release",
			"POST https://mcp.spellkave.com/v1/worlds/demo1/members",
			"DELETE https://mcp.spellkave.com/v1/worlds/demo1/members/user_b",
			"PATCH https://mcp.spellkave.com/v1/worlds/demo1",
			"POST https://mcp.spellkave.com/v1/worlds/demo1/reset",
			"GET https://mcp.spellkave.com/v1/worlds/demo1/reset/job-1",
		]);
		expect(calls[2]?.body).toBe(JSON.stringify({ sub: "user_b" }));
		expect(calls[4]?.body).toBe(JSON.stringify({ join_policy: "open" }));
	});

	it("throws typed AccountApiError on 409", async () => {
		const fetchImpl = vi.fn(
			async () =>
				new Response(JSON.stringify({ error_description: "already claimed" }), {
					status: 409,
				}),
		);
		const api = new AccountApi({
			baseUrl: "https://api.spellkave.com",
			token: "jwt",
			fetchImpl: fetchImpl as unknown as typeof fetch,
		});
		await expect(api.claimSeat("demo1", "1")).rejects.toBeInstanceOf(AccountApiError);
		await expect(api.claimSeat("demo1", "1")).rejects.toMatchObject({
			code: "conflict",
			message: "already claimed",
		});
		expect(formatAccountApiError(new AccountApiError("forbidden", 403, "nope"))).toBe("nope");
	});

	it("lists, creates, and revokes API tokens", async () => {
		const calls: Array<{ url: string; method: string; body: string | null }> = [];
		const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			const method = init?.method ?? "GET";
			const body = typeof init?.body === "string" ? init.body : null;
			calls.push({ url, method, body });
			if (url.endsWith("/v1/account/tokens") && method === "GET") {
				return new Response(
					JSON.stringify([{ id: "key_1", name: "ci", created_at: "2026-08-24T00:00:00.000Z" }]),
					{ status: 200 },
				);
			}
			if (url.endsWith("/v1/account/tokens") && method === "POST") {
				return new Response(JSON.stringify({ id: "key_2", name: "laptop", secret: "sk_once" }), {
					status: 201,
				});
			}
			if (url.endsWith("/v1/account/tokens/key_1") && method === "DELETE") {
				return new Response(null, { status: 204 });
			}
			return new Response("", { status: 404 });
		});
		const api = new AccountApi({
			baseUrl: "https://api.spellkave.com",
			token: "jwt",
			fetchImpl: fetchImpl as unknown as typeof fetch,
		});
		await expect(api.listTokens()).resolves.toEqual([
			{ id: "key_1", name: "ci", created_at: "2026-08-24T00:00:00.000Z" },
		]);
		await expect(api.createToken("laptop")).resolves.toEqual({
			id: "key_2",
			name: "laptop",
			secret: "sk_once",
		});
		await expect(api.revokeToken("key_1")).resolves.toBeUndefined();
		expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
			"GET https://api.spellkave.com/v1/account/tokens",
			"POST https://api.spellkave.com/v1/account/tokens",
			"DELETE https://api.spellkave.com/v1/account/tokens/key_1",
		]);
		expect(calls[1]?.body).toBe(JSON.stringify({ name: "laptop" }));
	});
});
