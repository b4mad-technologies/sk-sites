import { afterEach, describe, expect, it, vi } from "vitest";

import {
	AccountApi,
	formatAccountApiError,
	HELD_HERO_FALLBACK_NAME,
	heldHeroNameFromBoard,
	mapAccountHttpError,
} from "./account-api";

afterEach(() => {
	vi.restoreAllMocks();
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

describe("formatAccountApiError", () => {
	it("prefers the typed message", () => {
		expect(formatAccountApiError(mapAccountHttpError(401, { message: "again" }))).toBe("again");
		expect(formatAccountApiError(new Error("network"))).toBe("network");
	});
});

describe("heldHeroNameFromBoard", () => {
	it("uses the mine row's trimmed name", () => {
		expect(
			heldHeroNameFromBoard([
				{ actor_id: "8", name: "Mara", claimed: true, mine: false },
				{ actor_id: "7", name: "  Renn  ", claimed: true, mine: true },
			]),
		).toBe("Renn");
	});

	it("falls back to 'your hero' and never the actor id", () => {
		expect(heldHeroNameFromBoard([])).toBe(HELD_HERO_FALLBACK_NAME);
		expect(
			heldHeroNameFromBoard([{ actor_id: "7", name: "Renn", claimed: true, mine: false }]),
		).toBe(HELD_HERO_FALLBACK_NAME);
		expect(heldHeroNameFromBoard([{ actor_id: "7", name: "", claimed: true, mine: true }])).toBe(
			HELD_HERO_FALLBACK_NAME,
		);
		expect(heldHeroNameFromBoard([{ actor_id: "7", name: null, claimed: true, mine: true }])).toBe(
			HELD_HERO_FALLBACK_NAME,
		);
		expect(heldHeroNameFromBoard([{ actor_id: 7, claimed: true, mine: true }])).toBe(
			HELD_HERO_FALLBACK_NAME,
		);
		expect(heldHeroNameFromBoard([{ actor_id: "7", claimed: true, mine: true }])).not.toMatch(/7/);
	});
});

describe("AccountApi", () => {
	it("sends bearer auth on the four account paths this page owns", async () => {
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
						capabilities: [],
						worlds: [{ slug: "demo1", display_name: "Demo", role: "owner", capabilities: [] }],
						seat: { slug: "demo1", actor_id: "7", role: "primary" },
					}),
					{ status: 200 },
				);
			}
			if (url.endsWith("/v1/account/tokens") && init?.method === "GET") {
				return new Response(JSON.stringify([{ id: "key_1", name: "ci", created_at: "t0" }]), {
					status: 200,
				});
			}
			if (url.endsWith("/v1/account/tokens") && init?.method === "POST") {
				return new Response(JSON.stringify({ id: "key_2", name: "laptop", secret: "once" }), {
					status: 200,
				});
			}
			if (url.endsWith("/v1/account/tokens/key_1") && init?.method === "DELETE") {
				return new Response(null, { status: 204 });
			}
			return new Response("missing", { status: 404 });
		});
		const api = new AccountApi({ token: "jwt-1", fetchImpl });
		await expect(api.getAccount()).resolves.toMatchObject({
			seat: { slug: "demo1", actor_id: "7" },
		});
		await expect(api.listTokens()).resolves.toEqual([
			{ id: "key_1", name: "ci", created_at: "t0" },
		]);
		await expect(api.createToken("laptop")).resolves.toMatchObject({ id: "key_2", name: "laptop" });
		await expect(api.revokeToken("key_1")).resolves.toBeUndefined();
		expect(fetchImpl).toHaveBeenCalledTimes(4);
	});

	it("reads the seat board on GET /v1/worlds/{slug}/seats", async () => {
		const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			expect(String(input)).toBe("/v1/worlds/demo1/seats");
			expect(init?.method).toBe("GET");
			expect(init?.headers).toMatchObject({
				Authorization: "Bearer jwt-1",
				Accept: "application/json",
			});
			return new Response(
				JSON.stringify([{ actor_id: "7", name: "Renn", claimed: true, mine: true }]),
				{ status: 200 },
			);
		});
		const api = new AccountApi({ token: "jwt-1", fetchImpl });
		await expect(api.getSeats("demo1")).resolves.toEqual([
			{ actor_id: "7", name: "Renn", claimed: true, mine: true },
		]);
	});

	it("reads author observability on GET /v1/author/worlds/{slug}/observability/*", async () => {
		const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			expect(String(input)).toBe("/v1/author/worlds/demo1/observability/cycles?window=6h");
			expect(init?.method).toBe("GET");
			return new Response(
				JSON.stringify({
					slug: "demo1",
					window: "6h",
					dropped_missing_world_slug: 0,
					seats: [],
				}),
				{ status: 200 },
			);
		});
		const api = new AccountApi({ token: "jwt-1", fetchImpl });
		await expect(api.getAuthorCycles("demo1")).resolves.toMatchObject({ slug: "demo1" });
	});

	it("releases the held seat on POST /v1/worlds/{slug}/seats/release", async () => {
		const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			expect(String(input)).toBe("/v1/worlds/demo1/seats/release");
			expect(init?.method).toBe("POST");
			expect(init?.headers).toMatchObject({
				Authorization: "Bearer jwt-1",
				Accept: "application/json",
			});
			return new Response(JSON.stringify({ ok: true }), { status: 200 });
		});
		const api = new AccountApi({ token: "jwt-1", fetchImpl });
		await expect(api.releaseSeat("demo1")).resolves.toBeUndefined();
	});

	it("maps 403 and 409 on release", async () => {
		const fetchImpl = vi.fn(
			async () => new Response(JSON.stringify({ error: "forbidden" }), { status: 403 }),
		);
		const api = new AccountApi({ token: "jwt-1", fetchImpl });
		await expect(api.releaseSeat("demo1")).rejects.toMatchObject({
			code: "forbidden",
			status: 403,
			message: "forbidden",
		});

		const conflict = vi.fn(
			async () =>
				new Response(JSON.stringify({ error_description: "still bound" }), { status: 409 }),
		);
		await expect(
			new AccountApi({ token: "jwt-1", fetchImpl: conflict }).releaseSeat("demo1"),
		).rejects.toMatchObject({
			code: "conflict",
			status: 409,
			message: "still bound",
		});

		const boom = vi.fn(async () => new Response(null, { status: 500 }));
		await expect(
			new AccountApi({ token: "jwt-1", fetchImpl: boom }).releaseSeat("demo1"),
		).rejects.toMatchObject({
			code: "http",
			status: 500,
		});
	});
});

describe("connected apps (ADR-0161 D-7)", () => {
	it("lists and disconnects one or all connectors", async () => {
		const calls: { url: string; method: string; body: unknown }[] = [];
		const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			calls.push({ url: String(input), method: init?.method ?? "GET", body: init?.body });
			const body = String(input).endsWith("/connectors")
				? [{ client_id: "client_c", name: "Claude" }]
				: {};
			return new Response(JSON.stringify(body), { status: 200 });
		});
		const api = new AccountApi({ token: "jwt-1", fetchImpl });
		expect(await api.listConnectors()).toEqual([{ client_id: "client_c", name: "Claude" }]);
		await api.disconnectConnectors("client_c");
		await api.disconnectConnectors();
		expect(calls.map((c) => [c.method, c.url, c.body])).toEqual([
			["GET", "/v1/account/connectors", undefined],
			["POST", "/v1/account/connectors/disconnect", '{"client_id":"client_c"}'],
			["POST", "/v1/account/connectors/disconnect", undefined],
		]);
	});
});
