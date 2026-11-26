import { describe, expect, it, vi } from "vitest";
import worker, { accountApiRequest, assetRequest, isProxiedRoute } from "./worker";

const ORIGIN = "https://api.spellkave.com";
const HOST = "https://account.spellkave.com";

function req(path: string, init: RequestInit = {}): Request {
	return new Request(`${HOST}${path}`, init);
}

describe("isProxiedRoute", () => {
	it("accepts each allowed path and method", () => {
		expect(isProxiedRoute("GET", "/v1/account")).toBe(true);
		expect(isProxiedRoute("GET", "/v1/account/tokens")).toBe(true);
		expect(isProxiedRoute("POST", "/v1/account/tokens")).toBe(true);
		expect(isProxiedRoute("DELETE", "/v1/account/tokens/key_1")).toBe(true);
		expect(isProxiedRoute("GET", "/v1/worlds/demo1/seats")).toBe(true);
		expect(isProxiedRoute("POST", "/v1/worlds/demo1/seats/release")).toBe(true);
		expect(isProxiedRoute("GET", "/v1/author/worlds/demo1/observability/cycles")).toBe(true);
		expect(isProxiedRoute("GET", "/v1/author/worlds/demo1/observability/tool-calls")).toBe(true);
		expect(isProxiedRoute("GET", "/v1/author/worlds/demo1/observability/events")).toBe(true);
		expect(isProxiedRoute("GET", "/v1/account/connectors")).toBe(true);
		expect(isProxiedRoute("POST", "/v1/account/connectors/disconnect")).toBe(true);
	});

	it("rejects a wrong method on an otherwise known path", () => {
		expect(isProxiedRoute("POST", "/v1/account")).toBe(false);
		expect(isProxiedRoute("DELETE", "/v1/account/tokens")).toBe(false);
		expect(isProxiedRoute("GET", "/v1/account/tokens/key_1")).toBe(false);
		expect(isProxiedRoute("PATCH", "/v1/account/tokens/key_1")).toBe(false);
		expect(isProxiedRoute("POST", "/v1/worlds/demo1/seats")).toBe(false);
		expect(isProxiedRoute("GET", "/v1/worlds/demo1/seats/release")).toBe(false);
		expect(isProxiedRoute("POST", "/v1/worlds/demo1/seats/7/claim")).toBe(false);
		expect(isProxiedRoute("POST", "/v1/account/connectors")).toBe(false);
		expect(isProxiedRoute("GET", "/v1/account/connectors/disconnect")).toBe(false);
	});

	it("rejects the admin surface and lookalike prefixes", () => {
		expect(isProxiedRoute("POST", "/v1/author/worlds/demo1/observability/cycles")).toBe(false);
		expect(isProxiedRoute("GET", "/v1/admin")).toBe(false);
		expect(isProxiedRoute("GET", "/v1/admin/worlds")).toBe(false);
		expect(isProxiedRoute("POST", "/v1/admin/worlds")).toBe(false);
		expect(isProxiedRoute("GET", "/v1/account/tokens/key_1/extra")).toBe(false);
		expect(isProxiedRoute("DELETE", "/v1/account/tokens/")).toBe(false);
		expect(isProxiedRoute("GET", "/v1/account-extra")).toBe(false);
	});
});

describe("accountApiRequest", () => {
	it("rewrites each allowed call onto the account API origin", () => {
		const getAccount = accountApiRequest(req("/v1/account"), ORIGIN);
		expect(getAccount?.url).toBe(`${ORIGIN}/v1/account`);
		expect(getAccount?.method).toBe("GET");

		const list = accountApiRequest(req("/v1/account/tokens"), ORIGIN);
		expect(list?.url).toBe(`${ORIGIN}/v1/account/tokens`);

		const create = accountApiRequest(
			req("/v1/account/tokens", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ name: "laptop" }),
			}),
			ORIGIN,
		);
		expect(create?.method).toBe("POST");
		expect(create?.headers.get("content-type")).toBe("application/json");

		const revoke = accountApiRequest(req("/v1/account/tokens/key_1", { method: "DELETE" }), ORIGIN);
		expect(revoke?.method).toBe("DELETE");
		expect(revoke?.url).toBe(`${ORIGIN}/v1/account/tokens/key_1`);

		const seats = accountApiRequest(req("/v1/worlds/demo1/seats"), ORIGIN);
		expect(seats?.method).toBe("GET");
		expect(seats?.url).toBe(`${ORIGIN}/v1/worlds/demo1/seats`);

		const release = accountApiRequest(
			req("/v1/worlds/demo1/seats/release", { method: "POST" }),
			ORIGIN,
		);
		expect(release?.method).toBe("POST");
		expect(release?.url).toBe(`${ORIGIN}/v1/worlds/demo1/seats/release`);
	});

	it("forwards the caller's bearer token unchanged and adds none of its own", () => {
		const withToken = accountApiRequest(
			req("/v1/account", { headers: { authorization: "Bearer abc.def" } }),
			ORIGIN,
		);
		expect(withToken?.headers.get("authorization")).toBe("Bearer abc.def");
		const without = accountApiRequest(req("/v1/account"), ORIGIN);
		expect(without?.headers.get("authorization")).toBe("");
	});

	it("preserves the query string and tolerates a trailing slash on the origin", () => {
		const out = accountApiRequest(req("/v1/account/tokens?x=1"), `${ORIGIN}/`);
		expect(out?.url).toBe(`${ORIGIN}/v1/account/tokens?x=1`);
	});

	it("returns null for a wrong method or an admin path", () => {
		expect(accountApiRequest(req("/v1/account", { method: "POST" }), ORIGIN)).toBeNull();
		expect(accountApiRequest(req("/v1/admin/worlds"), ORIGIN)).toBeNull();
	});
});

describe("assetRequest", () => {
	it("never answers an unproxied /v1 path with the SPA shell", () => {
		expect(assetRequest(req("/v1/admin/worlds"))).toBeNull();
		expect(assetRequest(req("/v1/worlds/demo1/seats"))).toBeNull();
		expect(assetRequest(req("/v1/account", { method: "POST" }))).toBeNull();
		expect(assetRequest(req("/"))).not.toBeNull();
		expect(assetRequest(req("/auth/callback"))).not.toBeNull();
	});
});

describe("worker fetch", () => {
	it("does not fall through an unproxied /v1 path to assets", async () => {
		const assets = { fetch: vi.fn(async () => new Response("<html>")) };
		const response = await worker.fetch(req("/v1/admin/worlds"), {
			ASSETS: assets,
			ACCOUNT_API_ORIGIN: ORIGIN,
		});
		expect(response.status).toBe(404);
		expect(assets.fetch).not.toHaveBeenCalled();
	});

	it("rejects a wrong method on a known API path without serving the SPA", async () => {
		const assets = { fetch: vi.fn(async () => new Response("<html>")) };
		const response = await worker.fetch(req("/v1/account", { method: "DELETE" }), {
			ASSETS: assets,
			ACCOUNT_API_ORIGIN: ORIGIN,
		});
		expect(response.status).toBe(404);
		expect(assets.fetch).not.toHaveBeenCalled();
	});
});
