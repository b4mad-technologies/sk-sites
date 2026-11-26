import type {
	DocsArticle,
	DocsCatalogueEntry,
	DocsCatalogueEntrySummary,
	DocsIndexV1,
	DocsSearchEntry,
	DocsTechnicalTable,
} from "./docs-types";
import type { CompendiumIndexEntry } from "./types";

export const DOCS_INDEX_URL = "/compendium/docs/index.json";

/** A static export path was absent and the SPA shell was returned instead. */
export class MissingJsonArtifactError extends Error {
	constructor(path: string, reason: "404" | "html-fallback") {
		super(`compendium JSON artifact missing: ${path} (${reason})`);
		this.name = "MissingJsonArtifactError";
	}
}

async function getJson<T>(path: string, fetchImpl: typeof fetch = fetch): Promise<T> {
	const response = await fetchImpl(path);
	if (!response.ok) {
		if (response.status === 404) throw new MissingJsonArtifactError(path, "404");
		throw new Error(`compendium fetch failed: ${path} (${response.status})`);
	}
	const body = await response.text();
	if (/^\s*<!doctype html\b/i.test(body)) {
		throw new MissingJsonArtifactError(path, "html-fallback");
	}
	try {
		return JSON.parse(body) as T;
	} catch {
		throw new Error(`compendium JSON parse failed: ${path}`);
	}
}

/** Static manifest projection for public documentation navigation. */
export function loadDocsIndex(fetchImpl?: typeof fetch): Promise<DocsIndexV1> {
	return getJson<DocsIndexV1>(DOCS_INDEX_URL, fetchImpl);
}

export function loadDocsSearch(path: string, fetchImpl?: typeof fetch): Promise<DocsSearchEntry[]> {
	if (path !== "/compendium/docs/search.json")
		throw new Error("invalid documentation search artifact path");
	return getJson<DocsSearchEntry[]>(path, fetchImpl);
}

export function loadDocsArticle(path: string, fetchImpl?: typeof fetch): Promise<DocsArticle> {
	if (!path.startsWith("/compendium/docs/articles/"))
		throw new Error("invalid documentation article artifact path");
	return getJson<DocsArticle>(path, fetchImpl);
}

export function loadDocsCatalogueEntry(
	path: string,
	fetchImpl?: typeof fetch,
): Promise<DocsCatalogueEntry> {
	if (!path.startsWith("/compendium/docs/catalogue/"))
		throw new Error("invalid documentation catalogue artifact path");
	return getJson<DocsCatalogueEntry>(path, fetchImpl);
}

export function loadDocsCatalogue(
	path: string,
	fetchImpl?: typeof fetch,
): Promise<DocsCatalogueEntrySummary[]> {
	if (!path.startsWith("/compendium/docs/catalogues/"))
		throw new Error("invalid documentation catalogue-list artifact path");
	return getJson<DocsCatalogueEntrySummary[]>(path, fetchImpl);
}

export function loadDocsDocument(path: string, fetchImpl?: typeof fetch): Promise<DocsArticle> {
	if (!path.startsWith("/compendium/docs/documents/"))
		throw new Error("invalid documentation document artifact path");
	return getJson<DocsArticle>(path, fetchImpl);
}

export function loadDocsTechnicalTable(
	bundleId: string,
	table: string,
	fetchImpl?: typeof fetch,
): Promise<DocsTechnicalTable> {
	return getJson<DocsTechnicalTable>(
		`/compendium/docs/technical/${encodeURIComponent(bundleId)}/${encodeURIComponent(table)}.json`,
		fetchImpl,
	);
}

export function filterSearch<T extends CompendiumIndexEntry>(
	rows: readonly T[],
	query: string,
	limit = 20,
): T[] {
	const q = query.trim().toLowerCase();
	if (q.length === 0) return [];
	const scored: { row: T; score: number }[] = [];
	for (const row of rows) {
		const name = row.name.toLowerCase();
		const kind = row.kind.toLowerCase();
		const tags = row.tags.join(" ").toLowerCase();
		const text = row.search_text.toLowerCase();
		let score = 0;
		if (name === q) score = 100;
		else if (name.startsWith(q)) score = 80;
		else if (name.includes(q)) score = 50;
		else if (kind.includes(q)) score = 30;
		else if (tags.includes(q)) score = 20;
		else if (text.includes(q)) score = 10;
		if (score > 0) scored.push({ row, score });
	}
	scored.sort((a, b) => b.score - a.score || a.row.name.localeCompare(b.row.name));
	return scored.slice(0, limit).map((item) => item.row);
}
