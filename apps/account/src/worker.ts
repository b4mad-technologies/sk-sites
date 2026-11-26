/**
 * account.spellkave.com — personal account Worker.
 *
 * Two jobs, in this order:
 *  1. Proxy the Account API paths this page needs, same-origin, so the browser
 *     makes no cross-origin call (this hostname is not on the API CORS
 *     allowlist; a direct call would fail with an opaque CORS error).
 *  2. Serve the SPA for everything else.
 *
 * Security shape (ADR-0110 D-2): this Worker is a transport, never a principal.
 * It forwards the caller's `Authorization` header unchanged and holds no
 * credential of its own, so a request without a bearer token reaches the
 * Account API without one and is rejected there.
 *
 * Proxied paths are an explicit allowlist, not a prefix catch-all. This origin
 * can issue writes (create / revoke keys), so an open proxy would let it reach
 * unrelated Account API routes — including `/v1/admin/`.
 *
 * An unproxied `/v1/...` path must never fall through to the SPA shell:
 * answering 200 text/html to a JSON caller is the live outage Play hit on
 * 2026-08-26 (`apps/play/src/worker.ts`).
 */

interface Env {
	ASSETS: { fetch(request: Request): Promise<Response> };
	ACCOUNT_API_ORIGIN: string;
}

/**
 * Every Account API path this page is allowed to reach, and the method it may
 * use. ADDING AN API CALL TO THIS APP MEANS ADDING ITS PATH HERE, IN THE SAME
 * CHANGE.
 */
const PROXY_ROUTES: { method: string; pattern: RegExp }[] = [
	{ method: "GET", pattern: /^\/v1\/account$/ },
	{ method: "GET", pattern: /^\/v1\/account\/tokens$/ },
	{ method: "POST", pattern: /^\/v1\/account\/tokens$/ },
	{ method: "DELETE", pattern: /^\/v1\/account\/tokens\/[^/]+$/ },
	{ method: "GET", pattern: /^\/v1\/account\/connectors$/ },
	{ method: "POST", pattern: /^\/v1\/account\/connectors\/disconnect$/ },
	{ method: "GET", pattern: /^\/v1\/worlds\/[^/]+\/seats$/ },
	{ method: "POST", pattern: /^\/v1\/worlds\/[^/]+\/seats\/release$/ },
	{ method: "GET", pattern: /^\/v1\/author\/worlds\/[^/]+\/observability\/cycles$/ },
	{ method: "GET", pattern: /^\/v1\/author\/worlds\/[^/]+\/observability\/tool-calls$/ },
	{ method: "GET", pattern: /^\/v1\/author\/worlds\/[^/]+\/observability\/events$/ },
];

export function isAccountApiPath(pathname: string): boolean {
	return pathname === "/v1" || pathname.startsWith("/v1/");
}

export function isProxiedRoute(method: string, pathname: string): boolean {
	return PROXY_ROUTES.some((route) => route.method === method && route.pattern.test(pathname));
}

/**
 * Build the upstream request, or null when this request is not a proxied call.
 */
export function accountApiRequest(request: Request, origin: string): Request | null {
	const url = new URL(request.url);
	if (!isProxiedRoute(request.method, url.pathname)) return null;
	const upstream = new URL(`${url.pathname}${url.search}`, `${origin.replace(/\/+$/, "")}/`);
	const headers = new Headers({
		accept: "application/json",
		authorization: request.headers.get("authorization") ?? "",
	});
	const contentType = request.headers.get("content-type");
	if (contentType !== null) headers.set("content-type", contentType);
	const hasBody = request.method !== "GET" && request.method !== "HEAD";
	return new Request(upstream, {
		method: request.method,
		headers,
		body: hasBody ? request.body : null,
		// Required by the Workers runtime when a stream body is forwarded.
		...(hasBody ? { duplex: "half" } : {}),
	} as RequestInit);
}

/**
 * Map a browser request onto static assets, or null when it must not fall
 * through (API path, or a method assets cannot serve).
 */
export function assetRequest(request: Request): Request | null {
	if (request.method !== "GET" && request.method !== "HEAD") return null;
	const url = new URL(request.url);
	if (isAccountApiPath(url.pathname)) return null;
	return request;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const upstream = accountApiRequest(request, env.ACCOUNT_API_ORIGIN);
		if (upstream !== null) return fetch(upstream);
		const assets = assetRequest(request);
		if (assets === null) {
			const status = isAccountApiPath(new URL(request.url).pathname) ? 404 : 405;
			return new Response(null, { status });
		}
		return env.ASSETS.fetch(assets);
	},
};
