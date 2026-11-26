/**
 * Same-origin Account API client for the personal account page.
 *
 * Production calls `/v1/account` and `/v1/account/tokens` on this origin; the
 * Worker proxies those paths. `VITE_SPELLKAVE_API_URL` is only for `vite dev`.
 */

export interface AccountWorldSummary {
	slug: string;
	display_name: string;
	role: "owner" | "member" | "open";
	capabilities: string[];
	/** Operator stopped the world's NPC host (contract: AccountWorld.paused). */
	paused?: boolean;
}

export interface AccountSeatSummary {
	slug: string;
	actor_id: string;
	role: string;
}

/** One row of GET /v1/worlds/{slug}/seats. */
export interface SeatBoardRow {
	actor_id: string | number;
	name?: string | null;
	claimed?: boolean;
	mine?: boolean;
}

export const HELD_HERO_FALLBACK_NAME = "your hero";

/** Name of the seat this account holds. Never the raw actor id. */
export function heldHeroNameFromBoard(rows: SeatBoardRow[]): string {
	const mine = rows.find((row) => row.mine === true);
	if (mine === undefined) return HELD_HERO_FALLBACK_NAME;
	const name = typeof mine.name === "string" ? mine.name.trim() : "";
	if (name === "") return HELD_HERO_FALLBACK_NAME;
	return name;
}

export interface AccountGetResponse {
	sub: string;
	email?: string;
	capabilities: string[];
	worlds: AccountWorldSummary[];
	seat: AccountSeatSummary | null;
}

/** One row of GET /v1/account/connectors: a connected third-party client (ADR-0161 D-7). */
export interface AccountConnector {
	client_id: string;
	name: string;
}

export type AuthorObsWindow = "1h" | "6h" | "24h";

export interface AuthorCycleSeat {
	seat: string;
	cycle_count: number;
	error_count: number;
	avg_duration_ms: number | null;
	avg_queue_wait_ms: number | null;
	last_seen: string | null;
}

export interface AuthorCycleHealthResponse {
	slug: string;
	window: AuthorObsWindow;
	dropped_missing_world_slug: number;
	seats: AuthorCycleSeat[];
}

export interface AuthorToolCallRow {
	tool_name: string;
	ok: number;
	error: number;
}

export interface AuthorToolCallsResponse {
	slug: string;
	window: AuthorObsWindow;
	dropped_missing_world_slug: number;
	tools: AuthorToolCallRow[];
}

export interface AuthorRunEvent {
	ts: string;
	event_type: string;
	actor_id: string;
	run_id: string;
	driver?: string;
	role?: string;
	data: Record<string, string | number | boolean>;
}

export interface AuthorRunEventsResponse {
	slug: string;
	window: AuthorObsWindow;
	dropped_missing_world_slug: number;
	events: AuthorRunEvent[];
}

export interface AccountToken {
	id: string;
	name: string;
	created_at: string;
	last_used_at?: string;
}

export interface CreatedAccountToken {
	id: string;
	name: string;
	secret: string;
}

export type AccountApiErrorCode = "unauthorized" | "forbidden" | "conflict" | "http";

export class AccountApiError extends Error {
	readonly code: AccountApiErrorCode;
	readonly status: number;
	readonly body: unknown;

	constructor(code: AccountApiErrorCode, status: number, message: string, body: unknown = null) {
		super(message);
		this.name = "AccountApiError";
		this.code = code;
		this.status = status;
		this.body = body;
	}
}

export interface AccountApiOptions {
	token: string;
	/** Same-origin by default; tests and `vite dev` override it. */
	baseUrl?: string;
	fetchImpl?: typeof fetch;
}

function errorMessageFromBody(body: unknown, fallback: string): string {
	if (typeof body === "object" && body !== null) {
		const record = body as Record<string, unknown>;
		if (typeof record.error_description === "string" && record.error_description !== "") {
			return record.error_description;
		}
		if (typeof record.error === "string" && record.error !== "") return record.error;
		if (typeof record.message === "string" && record.message !== "") return record.message;
	}
	return fallback;
}

export function mapAccountHttpError(status: number, body: unknown): AccountApiError {
	if (status === 401) {
		return new AccountApiError(
			"unauthorized",
			status,
			errorMessageFromBody(body, "Please sign in again."),
			body,
		);
	}
	if (status === 403) {
		return new AccountApiError(
			"forbidden",
			status,
			errorMessageFromBody(body, "You do not have access."),
			body,
		);
	}
	if (status === 409) {
		return new AccountApiError(
			"conflict",
			status,
			errorMessageFromBody(body, "That request conflicted with current state."),
			body,
		);
	}
	return new AccountApiError(
		"http",
		status,
		errorMessageFromBody(body, `Account API request failed (HTTP ${status})`),
		body,
	);
}

export function formatAccountApiError(cause: unknown): string {
	if (cause instanceof AccountApiError) return cause.message;
	if (cause instanceof Error) return cause.message;
	return String(cause);
}

async function readJsonBody(response: Response): Promise<unknown> {
	const text = await response.text();
	if (text === "") return null;
	try {
		return JSON.parse(text) as unknown;
	} catch {
		return text;
	}
}

export class AccountApi {
	readonly baseUrl: string;
	readonly token: string;
	private readonly fetchImpl: typeof fetch;

	constructor(options: AccountApiOptions) {
		this.baseUrl = (options.baseUrl ?? "").replace(/\/+$/, "");
		this.token = options.token;
		// Bind: storing bare `fetch` and calling it as `this.fetchImpl(...)` makes
		// the browser invoke it with `this` = client instance → TypeError
		// "Failed to execute 'fetch' on 'Window': Illegal invocation" (live 2026-08-24).
		this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis);
	}

	private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
		const headers: Record<string, string> = {
			Authorization: `Bearer ${this.token}`,
			Accept: "application/json",
		};
		let payload: string | undefined;
		if (body !== undefined) {
			headers["Content-Type"] = "application/json";
			payload = JSON.stringify(body);
		}
		const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
			method,
			headers,
			body: payload,
		});
		const parsed = await readJsonBody(response);
		if (!response.ok) throw mapAccountHttpError(response.status, parsed);
		return parsed as T;
	}

	getAccount(): Promise<AccountGetResponse> {
		return this.request<AccountGetResponse>("GET", "/v1/account");
	}

	listTokens(): Promise<AccountToken[]> {
		return this.request<AccountToken[]>("GET", "/v1/account/tokens");
	}

	createToken(name: string): Promise<CreatedAccountToken> {
		return this.request<CreatedAccountToken>("POST", "/v1/account/tokens", { name });
	}

	async revokeToken(id: string): Promise<void> {
		await this.request<unknown>("DELETE", `/v1/account/tokens/${encodeURIComponent(id)}`);
	}

	listConnectors(): Promise<AccountConnector[]> {
		return this.request<AccountConnector[]>("GET", "/v1/account/connectors");
	}

	/** One client by id, or every connected client when `clientId` is omitted. */
	async disconnectConnectors(clientId?: string): Promise<void> {
		await this.request<unknown>(
			"POST",
			"/v1/account/connectors/disconnect",
			clientId === undefined ? undefined : { client_id: clientId },
		);
	}

	getSeats(slug: string): Promise<SeatBoardRow[]> {
		return this.request<SeatBoardRow[]>("GET", `/v1/worlds/${encodeURIComponent(slug)}/seats`);
	}

	async releaseSeat(slug: string): Promise<void> {
		await this.request<{ ok: true }>(
			"POST",
			`/v1/worlds/${encodeURIComponent(slug)}/seats/release`,
		);
	}

	getAuthorCycles(
		slug: string,
		window: AuthorObsWindow = "6h",
	): Promise<AuthorCycleHealthResponse> {
		return this.request<AuthorCycleHealthResponse>(
			"GET",
			`/v1/author/worlds/${encodeURIComponent(slug)}/observability/cycles?window=${window}`,
		);
	}

	getAuthorToolCalls(
		slug: string,
		window: AuthorObsWindow = "6h",
	): Promise<AuthorToolCallsResponse> {
		return this.request<AuthorToolCallsResponse>(
			"GET",
			`/v1/author/worlds/${encodeURIComponent(slug)}/observability/tool-calls?window=${window}`,
		);
	}

	getAuthorEvents(slug: string, window: AuthorObsWindow = "6h"): Promise<AuthorRunEventsResponse> {
		return this.request<AuthorRunEventsResponse>(
			"GET",
			`/v1/author/worlds/${encodeURIComponent(slug)}/observability/events?window=${window}`,
		);
	}
}

export function createAccountApi(options: AccountApiOptions): AccountApi {
	return new AccountApi(options);
}
