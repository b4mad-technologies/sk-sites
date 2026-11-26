/**
 * WorkOS AuthKit public SPA (authorization code + PKCE S256).
 * Uses the AuthKit-domain Connect app (`{issuer}/oauth2/*`) so the JWT `iss`
 * matches MCP clients. Identity in the world is BLAKE3(iss|sub) (ADR-0102 D-2);
 * User Management tokens (`iss=https://api.workos.com/user_management/<id>`)
 * hash to a different SpacetimeDB identity and cannot see a seat claimed here.
 * token_endpoint_auth_method=none — no client secret, no Worker exchange.
 * Tokens live in sessionStorage only.
 *
 * Authentication runs on the Spellkave login site (ADR-0161 D-1/D-2): AuthKit
 * sends every authorization there. While the login site's session lives, a
 * sign-in is one "Continue" click; there is no `prompt=none` silent login
 * (D-9). Sign-out posts to the login site (D-7), which ends the session for
 * every app; open tabs notice through the `sk_signed_in` marker cookie
 * (`signed-in-marker.ts`, watched by `startSessionRenewal`).
 *
 * Per-app route constants (`CALLBACK_PATH`, `LOGIN_PATH`, `CONSOLE_PATH`,
 * `PLAY_PATH`) are inputs, never baked in. Play-only pending-world helpers
 * stay in `apps/play`.
 */

export const AUTH_SCOPES = "openid profile email offline_access";

import { LOGIN_ORIGIN_ENV, parseLoginOrigin } from "./login-origin";
import { MARKER_SEEN_STORAGE_KEY } from "./signed-in-marker";

export { LOGIN_ORIGIN_ENV, parseLoginOrigin } from "./login-origin";

export { type SessionRenewalState, startSessionRenewal } from "./session-renewal";
export {
	hasSignedInMarker,
	MARKER_CHECK_INTERVAL_MS,
	MARKER_SEEN_STORAGE_KEY,
	SIGNED_IN_MARKER_COOKIE,
	signedOutByMarker,
} from "./signed-in-marker";

/**
 * RFC 8707 resource indicator: bind the access token's `aud` to the MCP
 * gateway so the login-gated transcript endpoint (same verifier as /mcp)
 * accepts website sessions. Without it AuthKit mints a token the gateway
 * rejects with 401 aud-mismatch.
 */
export const MCP_RESOURCE = "https://mcp.spellkave.com/mcp";
export const SESSION_STORAGE_KEY = "spellkave.workos.session";
export const PKCE_STORAGE_KEY = "spellkave.workos.pkce";
export const AUTH_CHANGED_EVENT = "spellkave-auth";

export function notifyAuthChanged(): void {
	if (typeof window === "undefined") return;
	window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export interface AuthConfig {
	clientId: string;
	issuer: string;
	/** RFC 8707 resource indicator. Defaults to {@link MCP_RESOURCE}. */
	resource?: string;
	/** Login site origin for sign-out ({@link LOGIN_ORIGIN_ENV}); unset only in dev. */
	loginOrigin?: string;
}

export interface AuthSession {
	access_token: string;
	id_token: string;
	expires_at: number;
	display_name: string;
	refresh_token?: string;
	/** Opaque local grant identity retained across refresh-token rotation. */
	refresh_session_id?: string;
}

export interface PkcePending {
	verifier: string;
	state: string;
	redirect_uri: string;
}

export function readAuthConfig(env: Record<string, string | undefined>): AuthConfig | null {
	const clientId = env.VITE_WORKOS_CLIENT_ID?.trim() ?? "";
	const issuer = (env.VITE_WORKOS_ISSUER?.trim() ?? "").replace(/\/$/, "");
	if (clientId === "" || issuer === "") return null;
	if (!issuer.startsWith("https://")) return null;
	const loginOrigin = parseLoginOrigin(env[LOGIN_ORIGIN_ENV]);
	return loginOrigin === undefined ? { clientId, issuer } : { clientId, issuer, loginOrigin };
}

export function callbackUrl(origin: string, callbackPath: string): string {
	return `${origin.replace(/\/$/, "")}${callbackPath}`;
}

export function authorizeUrl(
	config: AuthConfig,
	redirectUri: string,
	challenge: string,
	state: string,
): string {
	const url = new URL("/oauth2/authorize", `${config.issuer}/`);
	url.searchParams.set("client_id", config.clientId);
	url.searchParams.set("redirect_uri", redirectUri);
	url.searchParams.set("response_type", "code");
	url.searchParams.set("scope", AUTH_SCOPES);
	url.searchParams.set("code_challenge", challenge);
	url.searchParams.set("code_challenge_method", "S256");
	url.searchParams.set("state", state);
	url.searchParams.set("resource", config.resource ?? MCP_RESOURCE);
	return url.toString();
}

export function tokenRequestBody(
	config: AuthConfig,
	code: string,
	redirectUri: string,
	verifier: string,
): URLSearchParams {
	return new URLSearchParams({
		grant_type: "authorization_code",
		client_id: config.clientId,
		code,
		redirect_uri: redirectUri,
		code_verifier: verifier,
		resource: config.resource ?? MCP_RESOURCE,
	});
}

export function refreshTokenRequestBody(config: AuthConfig, refreshToken: string): URLSearchParams {
	return new URLSearchParams({
		grant_type: "refresh_token",
		client_id: config.clientId,
		refresh_token: refreshToken,
		resource: config.resource ?? MCP_RESOURCE,
	});
}

export function displayNameFromIdToken(idToken: string): string {
	const payload = decodeJwtPayload(idToken);
	if (typeof payload.name === "string" && payload.name.trim() !== "") return payload.name.trim();
	if (typeof payload.email === "string" && payload.email.trim() !== "") return payload.email.trim();
	if (typeof payload.sub === "string" && payload.sub !== "") return payload.sub.slice(0, 12);
	return "signed in";
}

/** Unverified payload decode for display name / expiry fallback — not an auth check. */
export function decodeJwtPayload(token: string): Record<string, unknown> {
	const parts = token.split(".");
	const payloadPart = parts[1];
	if (payloadPart === undefined) return {};
	try {
		const padded = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
		const json = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), "="));
		const parsed: unknown = JSON.parse(json);
		return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
			? (parsed as Record<string, unknown>)
			: {};
	} catch {
		return {};
	}
}

export function readSession(storage: Storage, now: () => number = Date.now): AuthSession | null {
	const raw = storage.getItem(SESSION_STORAGE_KEY);
	if (raw === null || raw === "") return null;
	try {
		const value = JSON.parse(raw) as Partial<AuthSession>;
		if (typeof value.access_token !== "string" || value.access_token === "") {
			clearSession(storage);
			return null;
		}
		const expires_at = typeof value.expires_at === "number" ? value.expires_at : 0;
		if (expires_at <= now()) {
			// Access expiry must not discard the credential needed to renew it.
			if (typeof value.refresh_token !== "string" || value.refresh_token === "") {
				clearSession(storage);
			}
			return null;
		}
		return {
			access_token: value.access_token,
			id_token: typeof value.id_token === "string" ? value.id_token : "",
			expires_at,
			display_name: typeof value.display_name === "string" ? value.display_name : "signed in",
			...(typeof value.refresh_session_id === "string"
				? { refresh_session_id: value.refresh_session_id }
				: {}),
			...(typeof value.refresh_token === "string" && value.refresh_token !== ""
				? { refresh_token: value.refresh_token }
				: {}),
		};
	} catch {
		clearSession(storage);
		return null;
	}
}

export function writeSession(storage: Storage, session: AuthSession): void {
	storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(storage: Storage): void {
	storage.removeItem(SESSION_STORAGE_KEY);
	storage.removeItem(PKCE_STORAGE_KEY);
	storage.removeItem(MARKER_SEEN_STORAGE_KEY);
}

/** Fields the login site's `POST /logout` reads (contract of PR #4171). */
export interface LogoutForm {
	/** App page to return to; the login site accepts only https pages on its marker domain. */
	return_to: string;
	/** The app's access token, so the person is known without a login-site cookie. */
	token?: string;
}

/** `POST {loginOrigin}/logout`. */
export function logoutUrl(loginOrigin: string): string {
	return `${loginOrigin.replace(/\/$/, "")}/logout`;
}

/** Submit a plain top-level POST form (a navigation, so login-site cookies ride along). */
export function submitForm(
	action: string,
	fields: Record<string, string>,
	doc: Pick<Document, "createElement" | "body"> = document,
): void {
	const form = doc.createElement("form");
	form.method = "POST";
	form.action = action;
	for (const [name, value] of Object.entries(fields)) {
		const input = doc.createElement("input");
		input.type = "hidden";
		input.name = name;
		input.value = value;
		form.append(input);
	}
	doc.body.append(form);
	form.submit();
}

/**
 * The one SPA sign-out (ADR-0161 D-7). Clears this tab's session, then posts
 * the login site's sign-out form. The login site revokes every app grant of
 * the person, ends the login session and clears the `sk_signed_in` marker, so
 * every other open tab signs out at its next marker check. The stored access
 * token (even expired) goes along, so the person is known without a login
 * cookie. `returnTo` must be an https page on the marker domain; anything else
 * ends on the login site's "You are signed out" page.
 * Without a configured login origin (a dev build only; other builds fail) it
 * signs out this tab and returns false.
 */
export function endAuthSession(
	storage: Storage,
	config: Pick<AuthConfig, "loginOrigin">,
	returnTo: string,
	submit: (action: string, fields: Record<string, string>) => void = submitForm,
): boolean {
	let token: string | undefined;
	try {
		const stored = JSON.parse(
			storage.getItem(SESSION_STORAGE_KEY) ?? "null",
		) as Partial<AuthSession> | null;
		if (typeof stored?.access_token === "string" && stored.access_token !== "")
			token = stored.access_token;
	} catch {
		// Unreadable session: the login cookie still names the person.
	}
	clearSession(storage);
	if (config.loginOrigin === undefined) {
		console.warn(`${LOGIN_ORIGIN_ENV} is unset: signed out of this tab only`);
		return false;
	}
	const fields: LogoutForm = { return_to: returnTo, ...(token ? { token } : {}) };
	submit(logoutUrl(config.loginOrigin), { ...fields });
	return true;
}

function bytesToBase64Url(bytes: Uint8Array): string {
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export async function createPkce(
	subtle: SubtleCrypto = crypto.subtle,
	random: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n)),
): Promise<{ verifier: string; challenge: string; state: string }> {
	const verifier = bytesToBase64Url(random(32));
	const state = bytesToBase64Url(random(16));
	const digest = await subtle.digest("SHA-256", new TextEncoder().encode(verifier));
	return { verifier, challenge: bytesToBase64Url(new Uint8Array(digest)), state };
}

export async function startLogin(
	config: AuthConfig,
	origin: string,
	storage: Storage,
	assign: (url: string) => void,
	callbackPath: string,
): Promise<void> {
	const { verifier, challenge, state } = await createPkce();
	const redirectUri = callbackUrl(origin, callbackPath);
	storage.setItem(PKCE_STORAGE_KEY, JSON.stringify({ verifier, state, redirect_uri: redirectUri }));
	assign(authorizeUrl(config, redirectUri, challenge, state));
}

function sessionFromTokenResponse(
	token: {
		access_token?: string;
		id_token?: string;
		refresh_token?: string;
		expires_in?: number;
	},
	nowMs: number,
): AuthSession {
	if (typeof token.access_token !== "string" || token.access_token === "") {
		throw new Error("token response missing access_token");
	}
	const jwtExp = decodeJwtPayload(token.access_token).exp;
	const expires_at =
		typeof token.expires_in === "number"
			? nowMs + token.expires_in * 1000
			: typeof jwtExp === "number"
				? jwtExp * 1000
				: nowMs + 300_000;
	const idToken = typeof token.id_token === "string" ? token.id_token : "";
	return {
		access_token: token.access_token,
		id_token: idToken,
		expires_at,
		display_name: displayNameFromIdToken(idToken),
		...(typeof token.refresh_token === "string" && token.refresh_token !== ""
			? { refresh_token: token.refresh_token }
			: {}),
	};
}

export async function completeLogin(
	config: AuthConfig,
	href: string,
	storage: Storage,
	fetchImpl: typeof fetch,
	now: () => number = Date.now,
): Promise<AuthSession> {
	try {
		const url = new URL(href);
		const error = url.searchParams.get("error");
		if (error !== null) {
			throw new Error(url.searchParams.get("error_description") ?? error);
		}
		const code = url.searchParams.get("code");
		const state = url.searchParams.get("state");
		if (code === null || code === "" || state === null)
			throw new Error("missing authorization code");
		const pendingRaw = storage.getItem(PKCE_STORAGE_KEY);
		if (pendingRaw === null) throw new Error("missing PKCE verifier");
		const pending = JSON.parse(pendingRaw) as PkcePending;
		if (pending.state !== state) throw new Error("state mismatch");
		const body = tokenRequestBody(config, code, pending.redirect_uri, pending.verifier);
		if (body.has("client_secret")) throw new Error("public client must not send a secret");
		const response = await fetchImpl(`${config.issuer}/oauth2/token`, {
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded" },
			body,
		});
		if (!response.ok) {
			throw new Error(`token exchange failed: HTTP ${response.status}`);
		}
		const token = (await response.json()) as {
			access_token?: string;
			id_token?: string;
			refresh_token?: string;
			expires_in?: number;
		};
		const session = sessionFromTokenResponse(token, now());
		writeSession(storage, session);
		return session;
	} finally {
		storage.removeItem(PKCE_STORAGE_KEY);
	}
}

const refreshes = new WeakMap<Storage, Map<string, Promise<AuthSession>>>();

export class SessionRefreshError extends Error {
	constructor(public readonly reason: "missing" | "rejected" | "changed" | "temporary") {
		super(`session refresh ${reason}`);
		this.name = "SessionRefreshError";
	}
}

/** Coalesce consumers of the same stored grant; never revive a signed-out session. */
export function refreshSession(
	config: AuthConfig,
	storage: Storage,
	fetchImpl: typeof fetch,
	now: () => number = Date.now,
): Promise<AuthSession> {
	let pending = refreshes.get(storage);
	if (!pending) {
		pending = new Map();
		refreshes.set(storage, pending);
	}
	const key = JSON.stringify([config.issuer, config.clientId, config.resource ?? MCP_RESOURCE]);
	const existing = pending.get(key);
	if (existing) return existing;
	const request = refreshStoredSession(config, storage, fetchImpl, now).finally(() => {
		pending.delete(key);
	});
	pending.set(key, request);
	return request;
}

/** Bound headers and body consumption; a late response has no storage side effect. */
async function requestRefresh(
	fetchImpl: typeof fetch,
	url: string,
	body: URLSearchParams,
): Promise<{ response: Response; payload: unknown }> {
	const controller = new AbortController();
	let timeout: ReturnType<typeof setTimeout> | undefined;
	try {
		return await Promise.race([
			(async () => {
				const response = await fetchImpl(url, {
					method: "POST",
					headers: { "content-type": "application/x-www-form-urlencoded" },
					body,
					signal: controller.signal,
				});
				const payload: unknown = await response.json().catch(() => null);
				return { response, payload };
			})(),
			new Promise<never>((_resolve, reject) => {
				timeout = setTimeout(() => {
					controller.abort();
					reject(new SessionRefreshError("temporary"));
				}, 15_000);
			}),
		]);
	} catch {
		throw new SessionRefreshError("temporary");
	} finally {
		if (timeout !== undefined) clearTimeout(timeout);
	}
}

async function refreshStoredSession(
	config: AuthConfig,
	storage: Storage,
	fetchImpl: typeof fetch,
	now: () => number = Date.now,
): Promise<AuthSession> {
	const original = storage.getItem(SESSION_STORAGE_KEY);
	const current = (() => {
		const raw = original;
		if (raw === null || raw === "") return null;
		try {
			return JSON.parse(raw) as Partial<AuthSession>;
		} catch {
			return null;
		}
	})();
	const refreshToken = current?.refresh_token;
	if (typeof refreshToken !== "string" || refreshToken === "") {
		throw new SessionRefreshError("missing");
	}
	const body = refreshTokenRequestBody(config, refreshToken);
	if (body.has("client_secret")) throw new Error("public client must not send a secret");
	const { response, payload } = await requestRefresh(
		fetchImpl,
		`${config.issuer}/oauth2/token`,
		body,
	);
	if (storage.getItem(SESSION_STORAGE_KEY) !== original) {
		throw new SessionRefreshError("changed");
	}
	if (!response.ok) {
		const failure = payload;
		if (
			response.status === 400 &&
			typeof failure === "object" &&
			failure !== null &&
			"error" in failure &&
			// Connect uses invalid_refresh_token for a consumed token outside
			// its replay window (hosted probe sk-0m4.158).
			(failure.error === "invalid_grant" || failure.error === "invalid_refresh_token")
		) {
			clearSession(storage);
			throw new SessionRefreshError("rejected");
		}
		throw new SessionRefreshError("temporary");
	}
	if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
		throw new SessionRefreshError("temporary");
	}
	const token = payload as {
		access_token?: string;
		id_token?: string;
		refresh_token?: string;
		expires_in?: number;
	};
	const session = sessionFromTokenResponse(
		{
			...token,
			id_token: token.id_token ?? current?.id_token,
			refresh_token:
				typeof token.refresh_token === "string" && token.refresh_token !== ""
					? token.refresh_token
					: refreshToken,
		},
		now(),
	);
	if (storage.getItem(SESSION_STORAGE_KEY) !== original) {
		throw new SessionRefreshError("changed");
	}
	if (typeof current?.refresh_session_id === "string") {
		session.refresh_session_id = current.refresh_session_id;
	}
	writeSession(storage, session);
	return session;
}
