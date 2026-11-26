/**
 * Read-only client for the public spectator feed published by
 * `archive/scripts/dev-deploy/triton/player-mcp/public-site-publish.mjs`.
 *
 * That publisher is RETIRED (sk-jay0.6.15.6.3.2): its timer was deleted from
 * triton on 2026-08-27 and phobos has no replacement, so the R2 object this
 * reads has not changed since. Rendering it as live is tracked as sk-jay0.5.11;
 * this comment does not change behaviour.
 *
 * Index/MCP shapes stay local; agent-run-events display parse/render live in
 * `@spellkave/run-events-view` (shared with the Tailnet admin app).
 */

// Display helpers + parse live in @spellkave/run-events-view (shared with admin).
import {
	compactObservation,
	compactParams,
	formatClock,
	parseTranscriptJsonl,
	stepHeadline,
	type TranscriptStep,
	toolLabel,
} from "@spellkave/run-events-view";

export {
	compactObservation,
	compactParams,
	formatClock,
	parseTranscriptJsonl,
	stepHeadline,
	toolLabel,
	type TranscriptStep,
};

export function publicSiteBaseUrl(env: Record<string, string | undefined>): string {
	const configured = env.VITE_SPELLKAVE_PUBLIC_SITE_URL?.trim();
	const base = configured === undefined || configured === "" ? "/demo-data" : configured;
	return base.replace(/\/+$/, "");
}

export const PUBLIC_SITE_INDEX_VERSION = "spellkave-public-site/v1";

export interface PublicWorld {
	slug: string;
	name: string;
	adventure?: string;
	/** SpacetimeDB database name on the shared play host. Public catalog only. */
	db?: string;
	position: number;
	transcript_url: string;
	transcript_lines: number;
	transcript_updated_at: string | null;
}

export interface PublicSiteIndex {
	v: typeof PUBLIC_SITE_INDEX_VERSION;
	generated_at: string;
	/** Present only in the checked-in local sample, never in a Triton publish. */
	sample?: boolean;
	transcripts?: { status: string; until?: string; reason?: string };
	mcp: {
		url: string;
		scope: string;
	};
	worlds: PublicWorld[];
}

export function joinUrl(base: string, path: string): string {
	return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parsePublicSiteIndex(value: unknown): PublicSiteIndex {
	if (!isRecord(value) || value.v !== PUBLIC_SITE_INDEX_VERSION) {
		throw new Error(`unexpected public site index (want ${PUBLIC_SITE_INDEX_VERSION})`);
	}
	if (!isRecord(value.mcp) || typeof value.mcp.url !== "string") {
		throw new Error("public site index lacks mcp.url");
	}
	if (!Array.isArray(value.worlds)) throw new Error("public site index lacks worlds");
	const worlds: PublicWorld[] = value.worlds.map((row, index) => {
		if (!isRecord(row) || typeof row.slug !== "string" || typeof row.transcript_url !== "string") {
			throw new Error(`worlds[${index}] is malformed`);
		}
		const db = typeof row.db === "string" ? row.db.trim() : "";
		const adventure = typeof row.adventure === "string" ? row.adventure : "";
		return {
			slug: row.slug,
			name: typeof row.name === "string" ? row.name : row.slug,
			...(adventure !== "" ? { adventure } : {}),
			...(db !== "" ? { db } : {}),
			position: typeof row.position === "number" ? row.position : index + 1,
			transcript_url: row.transcript_url,
			transcript_lines: typeof row.transcript_lines === "number" ? row.transcript_lines : 0,
			transcript_updated_at:
				typeof row.transcript_updated_at === "string" ? row.transcript_updated_at : null,
		};
	});
	const transcripts = isRecord(value.transcripts)
		? {
				status: String(value.transcripts.status ?? ""),
				...(typeof value.transcripts.until === "string" ? { until: value.transcripts.until } : {}),
				...(typeof value.transcripts.reason === "string"
					? { reason: value.transcripts.reason }
					: {}),
			}
		: undefined;
	return {
		v: PUBLIC_SITE_INDEX_VERSION,
		generated_at: typeof value.generated_at === "string" ? value.generated_at : "",
		...(value.sample === true ? { sample: true } : {}),
		...(transcripts === undefined ? {} : { transcripts }),
		mcp: {
			url: value.mcp.url,
			scope: String(value.mcp.scope ?? "openid profile email offline_access"),
		},
		worlds,
	};
}

export async function fetchPublicSiteIndex(
	base: string,
	fetchImpl: typeof fetch = fetch,
): Promise<PublicSiteIndex> {
	const response = await fetchImpl(joinUrl(base, "index.json"), { cache: "no-store" });
	if (!response.ok) throw new Error(`index.json: HTTP ${response.status}`);
	return parsePublicSiteIndex(await response.json());
}

/** Sample / offline path: relative transcript under the public-site base. */

export async function fetchTranscript(
	base: string,
	world: Pick<PublicWorld, "transcript_url">,
	fetchImpl: typeof fetch = fetch,
): Promise<TranscriptStep[]> {
	const response = await fetchImpl(joinUrl(base, world.transcript_url), { cache: "no-store" });
	if (response.status === 404) return [];
	if (!response.ok) throw new Error(`transcript: HTTP ${response.status}`);
	return parseTranscriptJsonl(await response.text());
}

/**
 * Live path (sk-pka5.23): login-gated gateway feed.
 * `accessToken` is the WorkOS access token from the website session (any logged-in user).
 */

export async function fetchGatewayTranscript(
	mcpOrigin: string,
	slug: string,
	accessToken: string,
	fetchImpl: typeof fetch = fetch,
): Promise<TranscriptStep[]> {
	const origin = mcpOrigin.replace(/\/$/, "").replace(/\/mcp$/, "");
	const response = await fetchImpl(`${origin}/transcripts/${encodeURIComponent(slug)}`, {
		cache: "no-store",
		headers: { authorization: `Bearer ${accessToken}` },
		credentials: "omit",
	});
	if (response.status === 401 || response.status === 403) {
		throw new Error("transcript: login required");
	}
	if (response.status === 404) return [];
	if (!response.ok) throw new Error(`transcript: HTTP ${response.status}`);
	return parseTranscriptJsonl(await response.text());
}

export function mcpOriginFromIndexUrl(mcpUrl: string | undefined): string {
	const trimmed = (mcpUrl ?? "").trim();
	if (trimmed === "") return "https://mcp.spellkave.com";
	try {
		return new URL(trimmed).origin;
	} catch {
		return "https://mcp.spellkave.com";
	}
}
