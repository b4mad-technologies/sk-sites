import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { DocsCatalogueEntry, DocsDocument, DocsIndexV1 } from "./docs-types";

/**
 * Self-referential content census: a small digest of what the registered
 * documentation projection ships TODAY (catalogue entries, authored
 * documents, and plain pages), used by `docs-census.test.ts` to catch a
 * silent content regression during a refactor. Replaces the retired
 * legacy-baseline/manifest-catalogue-parity gate, which compared against a
 * frozen pre-migration snapshot instead of our own current output — see
 * `docs/metadata-docs.md`.
 */

export interface DocsCensusSource {
	page_id: string;
	section_id: string;
	/** A catalogue entry page renders its own catalogue row and pulls the
	 * matching article's prose in as an attachment (sk-jay0.3.5.59). Since
	 * that article carries no `href` of its own (sk-jay0.7.93), `kind` no
	 * longer needs to distinguish the pairing from a real duplicate — the
	 * href-uniqueness check below simply skips a null href. */
	kind: "catalogue" | "document" | "page";
	/**
	 * The manifest row kind, for a catalogue entry. Needed because an id alone
	 * does not identify a subject: 76 ids name a subject in two kinds at once in
	 * the SRD manifest, so `srd/size` as a resource and `srd/size` as something
	 * else are different pages and a ref-only index conflates them.
	 */
	entryKind: string | null;
	ref: string;
	/**
	 * Null for a featured article (sk-jay0.7.93): it owns no route of its
	 * own — its prose is the catalogue entry's attachment — so it never
	 * enters the per-page href-uniqueness check below. Still a census row:
	 * its prose is content worth digesting even without a route.
	 */
	href: string | null;
	name: string;
	description: string;
	facts: readonly unknown[];
	tags: readonly string[];
	attachments: readonly unknown[];
	art: { href: string; license: string; hash: string } | null;
	/**
	 * Carries `kind` as well as `ref`: an id alone does not identify a subject
	 * (76 ids name a subject in two kinds at once in the SRD manifest), so a
	 * ref-only target cannot be checked against the catalogue.
	 */
	relationTargets: readonly { kind: string; ref: string; href: string }[];
}

export interface DocsCensusSection {
	id: string;
	entry_count: number;
	digest: string;
}

export interface DocsCensusPage {
	page_id: string;
	sections: DocsCensusSection[];
}

export interface DocsCensus {
	total_entry_count: number;
	digest: string;
	pages: DocsCensusPage[];
}

function canonical(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
	if (value !== null && typeof value === "object") {
		return `{${Object.entries(value as Record<string, unknown>)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
			.join(",")}}`;
	}
	return JSON.stringify(value);
}

function sha256(value: string): string {
	return createHash("sha256").update(value).digest("hex");
}

function readArtifact<T>(root: string, href: string): T {
	const prefix = "/compendium/docs/";
	if (!href.startsWith(prefix)) throw new Error(`docs census: unsafe artifact href '${href}'`);
	return JSON.parse(readFileSync(join(root, href.slice(prefix.length)), "utf8")) as T;
}

/**
 * Reads every catalogue entry, document, and plain page out of a projected
 * `DocsIndexV1`, in full (not digested yet) — the shared source both the
 * capture script and the test walk, so they can never disagree about what an
 * "entry" is.
 */
export function collectCensusSource(index: DocsIndexV1, outputRoot: string): DocsCensusSource[] {
	const out: DocsCensusSource[] = [];
	for (const page of index.pages) {
		for (const section of page.sections) {
			const catalogue =
				section.catalogue ??
				(section.catalogue_href
					? readArtifact<NonNullable<typeof section.catalogue>>(outputRoot, section.catalogue_href)
					: []);
			for (const summary of catalogue) {
				const entry = readArtifact<DocsCatalogueEntry>(outputRoot, summary.artifact_href);
				const attachments = [
					...(entry.subject?.attachments ?? []),
					...(entry.resource?.attachments ?? []),
					...(entry.attachments ?? []),
				];
				out.push({
					page_id: page.page_id,
					section_id: section.id,
					kind: "catalogue",
					entryKind: entry.kind,
					ref: entry.ref,
					href: entry.href,
					name: entry.display_name,
					description: entry.description,
					facts: entry.facts,
					tags: entry.tags ?? entry.subject?.tags ?? entry.resource?.tags ?? [],
					attachments,
					art: entry.art
						? { href: entry.art.href, license: entry.art.license, hash: entry.art.hash }
						: null,
					relationTargets: (entry.relations ?? [])
						.filter((relation) => relation.href !== undefined)
						.map((relation) => ({ kind: relation.kind, ref: relation.ref, href: relation.href! })),
				});
			}
			for (const summary of section.documents ?? []) {
				const document = readArtifact<
					DocsDocument & {
						ref: string;
						tags?: string[];
						relations?: Array<{ kind: string; ref: string; href?: string }>;
					}
				>(outputRoot, summary.artifact_href);
				out.push({
					page_id: page.page_id,
					section_id: section.id,
					kind: "document",
					entryKind: null,
					ref: document.ref,
					href: document.href,
					name: document.title,
					description: document.body,
					facts: [],
					tags: document.tags ?? [],
					attachments: [document.source, ...(document.blocks ?? [])],
					art: null,
					relationTargets: (document.relations ?? [])
						.filter((relation) => relation.href !== undefined)
						.map((relation) => ({ kind: relation.kind, ref: relation.ref, href: relation.href! })),
				});
			}
			for (const summary of section.pages ?? []) {
				const article = readArtifact<
					import("./docs-types").DocsArticle & {
						resources?: Array<{ ref: string; href: string }>;
						subjects?: Array<{ kind: string; ref: string; href: string }>;
					}
				>(outputRoot, summary.artifact_href);
				out.push({
					page_id: page.page_id,
					section_id: section.id,
					kind: "page",
					entryKind: null,
					ref: `${page.page_id}/${section.id}/page/${article.id}`,
					href: article.href ?? null,
					name: article.title,
					description: article.body,
					facts: [],
					tags: [],
					attachments: [
						article.source,
						...(article.blocks ?? []),
						...(article.resources ?? []).map((resource) => resource.ref),
						...(article.subjects ?? []).map((subject) => subject.ref),
					],
					art: null,
					relationTargets: [],
				});
			}
		}
	}
	return out;
}

function summarizeEntry(entry: DocsCensusSource): {
	ref: string;
	href: string | null;
	name: string;
	description_digest: string;
	facts_digest: string;
	tags_digest: string;
	attachments_digest: string;
} {
	return {
		ref: entry.ref,
		href: entry.href,
		name: entry.name,
		description_digest: sha256(entry.description),
		facts_digest: sha256(canonical(entry.facts)),
		tags_digest: sha256(canonical([...entry.tags].sort())),
		attachments_digest: sha256(canonical([entry.art, ...entry.attachments])),
	};
}

/** Aggregates raw census source entries into the small, committed artifact shape. */
export function buildDocsCensus(entries: readonly DocsCensusSource[]): DocsCensus {
	const byPage = new Map<string, Map<string, DocsCensusSource[]>>();
	for (const entry of entries) {
		const sections = byPage.get(entry.page_id) ?? new Map<string, DocsCensusSource[]>();
		const group = sections.get(entry.section_id) ?? [];
		group.push(entry);
		sections.set(entry.section_id, group);
		byPage.set(entry.page_id, sections);
	}
	const pages: DocsCensusPage[] = [...byPage.entries()]
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([page_id, sections]) => ({
			page_id,
			sections: [...sections.entries()]
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([id, group]) => {
					const summaries = group
						.map(summarizeEntry)
						.sort((left, right) => left.ref.localeCompare(right.ref));
					return { id, entry_count: summaries.length, digest: sha256(canonical(summaries)) };
				}),
		}));
	const totalEntryCount = entries.length;
	const digest = sha256(
		canonical(
			pages.map((page) => ({
				page_id: page.page_id,
				sections: page.sections.map(({ id, entry_count, digest: sectionDigest }) => ({
					id,
					entry_count,
					digest: sectionDigest,
				})),
			})),
		),
	);
	return { total_entry_count: totalEntryCount, digest, pages };
}
