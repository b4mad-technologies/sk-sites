/**
 * Thin typed client for the Account API (ADR-0107).
 * Pure HTTP over WorkOS bearer tokens — no SpacetimeDB SDK.
 *
 * Base URL: `VITE_SPELLKAVE_API_URL` (default `https://api.spellkave.com`;
 * dev fallback `http://127.0.0.1:8081` for the standalone local API service).
 */

export const DEFAULT_ACCOUNT_API_URL = "https://api.spellkave.com";
export const DEV_ACCOUNT_API_URL = "http://127.0.0.1:8081";

export type AccountWorldRole = "owner" | "member" | "open";
export type JoinPolicy = "invite" | "open";
export type ResetJobState = "pending" | "done" | "failed";

export interface AccountWorldSummary {
	slug: string;
	display_name: string;
	role: AccountWorldRole;
	capabilities: string[];
}

export interface AccountSeatSummary {
	slug: string;
	actor_id: string;
	role: string;
}

export interface AccountGetResponse {
	sub: string;
	email?: string;
	capabilities: string[];
	worlds: AccountWorldSummary[];
	seat: AccountSeatSummary | null;
}

export interface WorldSeatBoardEntry {
	actor_id: string;
	name: string;
	claimed: boolean;
	mine: boolean;
}

export interface ClaimSeatResponse {
	seat: AccountSeatSummary;
}

export interface ReleaseSeatResponse {
	ok: true;
}

export interface MembersResponse {
	members: string[];
}

export interface WorldPatchResponse {
	join_policy: JoinPolicy;
}

export interface ResetRequestResponse {
	job_id: string;
}

export interface ResetStatusResponse {
	state: ResetJobState;
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
	baseUrl: string;
	token: string;
	fetchImpl?: typeof fetch;
}

export function readAccountApiUrl(
	env: Record<string, string | undefined>,
	opts: { dev?: boolean } = {},
): string {
	const raw = env.VITE_SPELLKAVE_API_URL?.trim() ?? "";
	if (raw !== "") {
		if (!raw.startsWith("https://") && !raw.startsWith("http://")) {
			return opts.dev === true ? DEV_ACCOUNT_API_URL : DEFAULT_ACCOUNT_API_URL;
		}
		return raw.replace(/\/+$/, "");
	}
	return opts.dev === true ? DEV_ACCOUNT_API_URL : DEFAULT_ACCOUNT_API_URL;
}

function errorMessageFromBody(body: unknown, fallback: string): string {
	if (typeof body === "object" && body !== null) {
		const record = body as Record<string, unknown>;
		if (typeof record.error_description === "string" && record.error_description !== "") {
			return record.error_description;
		}
		if (typeof record.error === "string" && record.error !== "") {
			return record.error;
		}
		if (typeof record.message === "string" && record.message !== "") {
			return record.message;
		}
	}
	return fallback;
}

export function mapAccountHttpError(status: number, body: unknown): AccountApiError {
	if (status === 401) {
		return new AccountApiError(
			"unauthorized",
			status,
			errorMessageFromBody(body, "Please log in again."),
			body,
		);
	}
	if (status === 403) {
		return new AccountApiError(
			"forbidden",
			status,
			errorMessageFromBody(body, "You do not have access to this world."),
			body,
		);
	}
	if (status === 409) {
		return new AccountApiError(
			"conflict",
			status,
			errorMessageFromBody(body, "That seat is no longer available."),
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
		this.baseUrl = options.baseUrl.replace(/\/+$/, "");
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
		if (!response.ok) {
			throw mapAccountHttpError(response.status, parsed);
		}
		return parsed as T;
	}

	getAccount(): Promise<AccountGetResponse> {
		return this.request<AccountGetResponse>("GET", "/v1/account");
	}

	listSeats(slug: string): Promise<WorldSeatBoardEntry[]> {
		return this.request<WorldSeatBoardEntry[]>(
			"GET",
			`/v1/worlds/${encodeURIComponent(slug)}/seats`,
		);
	}

	claimSeat(slug: string, actorId: string): Promise<ClaimSeatResponse> {
		return this.request<ClaimSeatResponse>(
			"POST",
			`/v1/worlds/${encodeURIComponent(slug)}/seats/${encodeURIComponent(actorId)}/claim`,
		);
	}

	releaseSeat(slug: string): Promise<ReleaseSeatResponse> {
		return this.request<ReleaseSeatResponse>(
			"POST",
			`/v1/worlds/${encodeURIComponent(slug)}/seats/release`,
		);
	}

	addMember(slug: string, sub: string): Promise<MembersResponse> {
		return this.request<MembersResponse>("POST", `/v1/worlds/${encodeURIComponent(slug)}/members`, {
			sub,
		});
	}

	removeMember(slug: string, sub: string): Promise<MembersResponse> {
		return this.request<MembersResponse>(
			"DELETE",
			`/v1/worlds/${encodeURIComponent(slug)}/members/${encodeURIComponent(sub)}`,
		);
	}

	patchWorld(slug: string, patch: { join_policy: JoinPolicy }): Promise<WorldPatchResponse> {
		return this.request<WorldPatchResponse>(
			"PATCH",
			`/v1/worlds/${encodeURIComponent(slug)}`,
			patch,
		);
	}

	requestReset(slug: string): Promise<ResetRequestResponse> {
		return this.request<ResetRequestResponse>(
			"POST",
			`/v1/worlds/${encodeURIComponent(slug)}/reset`,
		);
	}

	getResetStatus(slug: string, jobId: string): Promise<ResetStatusResponse> {
		return this.request<ResetStatusResponse>(
			"GET",
			`/v1/worlds/${encodeURIComponent(slug)}/reset/${encodeURIComponent(jobId)}`,
		);
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
}

export function createAccountApi(options: AccountApiOptions): AccountApi {
	return new AccountApi(options);
}
