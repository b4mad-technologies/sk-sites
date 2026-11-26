import { authFetch, worldBase } from "./gateway";
import { sha256Hex } from "./sha256";

export type WorldAssetFailure =
	| "connection"
	| "reference"
	| "missing"
	| "access"
	| "transport"
	| "media"
	| "size"
	| "integrity";

/** Bounded diagnostics; never retain response bodies, URLs or credentials. */
export class WorldAssetError extends Error {
	constructor(public readonly reason: WorldAssetFailure) {
		super(`world asset ${reason}`);
		this.name = "WorldAssetError";
	}
}

/** Read admitted image bytes through the same gateway seam as map resources. */
export async function loadWorldImage(
	reference: { path: string; hash: string },
	origin: string,
	slug: string,
	token: string,
	signal: AbortSignal,
): Promise<Blob> {
	if (!origin || !slug || !token.trim()) throw new WorldAssetError("connection");
	if (
		!/^[a-f0-9]{64}$/.test(reference.hash) ||
		reference.path.split("/").some((part) => !part || part === "." || part === "..") ||
		/[\\%?#:]/.test(reference.path)
	)
		throw new WorldAssetError("reference");
	let url: URL;
	try {
		url = new URL(
			`${worldBase(origin, slug)}/assets/${reference.path.split("/").map(encodeURIComponent).join("/")}`,
		);
		if (!["https:", "http:"].includes(url.protocol) || url.username || url.password)
			throw new Error("origin");
	} catch {
		throw new WorldAssetError("connection");
	}
	url.searchParams.set("v", reference.hash);
	try {
		const response = await authFetch(url.href, token, { signal, redirect: "error" });
		if (response.status === 404) throw new WorldAssetError("missing");
		if (response.status === 401 || response.status === 403) throw new WorldAssetError("access");
		if (!response.ok) throw new WorldAssetError("transport");
		const type = response.headers.get("content-type")?.split(";")[0];
		if (!type || !["image/webp", "image/png", "image/jpeg"].includes(type))
			throw new WorldAssetError("media");
		const bytes = await response.arrayBuffer();
		if (bytes.byteLength > 8 * 1024 * 1024) throw new WorldAssetError("size");
		// sha256Hex falls back to pure JS where `crypto.subtle` is absent (plain
		// HTTP dev origins); the integrity check is never skipped.
		const hash = await sha256Hex(bytes);
		if (hash !== reference.hash) throw new WorldAssetError("integrity");
		return new Blob([bytes], { type });
	} catch (error) {
		if (signal.aborted || error instanceof WorldAssetError) throw error;
		throw new WorldAssetError("transport");
	}
}
