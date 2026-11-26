import { readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { catalogueEntriesFromManifest } from "@spellkave/srd-cc/docs/catalogue";
import {
	type BundleManifestSource,
	inspectManifest,
	type LoadedBundleChain,
	loadBundleChainDetailed,
	loadFlattened,
} from "@spellkave/world-author";
import Ajv2020, { type ErrorObject, type ValidateFunction } from "ajv/dist/2020.js";
import { docsDirectives } from "./docs-markdown";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PAGE_SCHEMA = JSON.parse(
	readFileSync(join(SCRIPT_DIR, "../../schemas/metadata-docs-v1.schema.json"), "utf8"),
) as object;
const ENTRY_SCHEMA = JSON.parse(
	readFileSync(join(SCRIPT_DIR, "../../schemas/metadata-docs-entry-v1.schema.json"), "utf8"),
) as object;
const CONTENT_SCHEMA = JSON.parse(
	readFileSync(join(SCRIPT_DIR, "../../schemas/metadata-docs-content-v1.schema.json"), "utf8"),
) as object;
export interface MetadataDocsDiagnostic {
	path: string;
	message: string;
}

export interface ValidateMetadataDocsOptions {
	rootManifestPath: string;
	dependencyPaths?: Readonly<Record<string, string>>;
}

export interface MetadataDocsSection {
	id: string;
	title: string;
	intro: string;
	pages?: MetadataDocsArticle[];
	catalogue?: MetadataDocsCatalogueEntry[];
	catalogue_content?: MetadataDocsContentRef;
	documents?: MetadataDocsDocument[];
}

export interface MetadataDocsCatalogueEntry {
	kind: string;
	ref: string;
	family: string;
	slug: string;
	title?: string;
	description?: string;
	facts?: ReadonlyArray<{ label: string; value: string; tag?: string }>;
	tags?: readonly string[];
	source?: { path: string; anchor: string; license: string };
	/**
	 * Compiler-owned link to the authored reader page for this subject, when
	 * unique. Carried since the derived listing became srd-cc's own
	 * `catalogueEntriesFromManifest` rather than a trimmed re-implementation
	 * that dropped it (sk-jay0.7.95).
	 */
	reader_page_id?: string;
}

export interface MetadataDocsContentRef {
	source_path: string;
	namespace: string;
	id: string;
}

interface MetadataDocsArticleBase {
	id: string;
	title: string;
	featured_reference?: {
		kind: "entity_definition" | "entity" | "resource_definition";
		ref: string;
	};
}

export type MetadataDocsArticle = MetadataDocsArticleBase &
	(
		| {
				body: string;
				source: { path: string; anchor: string; license: string };
				content?: never;
		  }
		| { content: MetadataDocsContentRef; body?: never; source?: never }
	);

export type MetadataDocsDocument = MetadataDocsArticle & {
	ref: string;
	slug: string;
	family: string;
	tags?: string[];
	relations?: Array<{ kind: string; ref: string }>;
};

export type DocsNavGroup = "adventure" | "reference";

export interface MetadataDocsPage {
	version: number;
	page_id: string;
	title: string;
	intro: string;
	/** Sidebar navigation group this page belongs to (required, authored — see docs-types.ts). */
	nav_group: DocsNavGroup;
	source_base?: string;
	attributions?: Array<{
		body: string;
		source: { path: string; anchor: string; license: string };
	}>;
	links?: Array<{
		label: string;
		kind: string;
		ref: string;
		section_id?: string;
		autolink?: boolean;
	}>;
	sections: MetadataDocsSection[];
}

export interface ResolvedMetadataDocsArticle {
	id: string;
	title: string;
	featured_reference?: {
		kind: "entity_definition" | "entity" | "resource_definition";
		ref: string;
	};
	body: string;
	source: { path: string; anchor: string; license: string };
}

export interface ResolvedMetadataDocsPage extends Omit<MetadataDocsPage, "sections"> {
	sections: Array<
		Omit<MetadataDocsSection, "pages" | "documents" | "catalogue_content"> & {
			pages?: ResolvedMetadataDocsArticle[];
			documents?: Array<
				ResolvedMetadataDocsArticle & {
					ref: string;
					slug: string;
					family: string;
					tags?: string[];
					relations?: Array<{ kind: string; ref: string }>;
				}
			>;
		}
	>;
}

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validatePage = ajv.compile(PAGE_SCHEMA) as ValidateFunction<MetadataDocsPage>;
const validateEntry = ajv.compile(ENTRY_SCHEMA) as ValidateFunction<{
	page_id: string;
	section_id: string;
}>;
const validateContent = ajv.compile(CONTENT_SCHEMA) as ValidateFunction<{
	body: string;
	source: { path: string; anchor: string; license: string };
}>;

function schemaErrors(
	path: string,
	errors: ErrorObject[] | null | undefined,
): MetadataDocsDiagnostic[] {
	return (errors ?? []).map((error) => ({
		path: `${path}${error.instancePath}`,
		message:
			error.keyword === "additionalProperties" && "additionalProperty" in error.params
				? `unknown key '${String(error.params.additionalProperty)}'`
				: (error.message ?? error.keyword),
	}));
}

function parseJson(path: string, value: unknown, diagnostics: MetadataDocsDiagnostic[]): unknown {
	if (typeof value !== "string") {
		diagnostics.push({ path, message: "must be a JSON string" });
		return undefined;
	}
	try {
		return JSON.parse(value) as unknown;
	} catch (error) {
		diagnostics.push({ path, message: `must contain valid JSON: ${String(error)}` });
		return undefined;
	}
}

function recordOf(value: unknown): Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function pageFromMetadata(
	manifestPath: string,
	metadata: Record<string, unknown>,
	diagnostics: MetadataDocsDiagnostic[],
): MetadataDocsPage | undefined {
	if (!("docs" in metadata)) return undefined;
	const page = metadata.docs;
	if (!validatePage(page)) {
		diagnostics.push(...schemaErrors(`${manifestPath}:[metadata].docs`, validatePage.errors));
		return undefined;
	}
	const sectionIds = new Set<string>();
	const documentRefs = new Set<string>();
	for (const section of page.sections) {
		if (sectionIds.has(section.id)) {
			diagnostics.push({
				path: `${manifestPath}:[metadata].docs.sections`,
				message: `duplicate section id '${section.id}'`,
			});
		}
		sectionIds.add(section.id);
		const articleIds = new Set<string>();
		for (const article of section.pages ?? []) {
			if (articleIds.has(article.id)) {
				diagnostics.push({
					path: `${manifestPath}:[metadata].docs.sections[id=${section.id}].pages`,
					message: `duplicate page id '${article.id}'`,
				});
			}
			articleIds.add(article.id);
		}
		const identities = new Set<string>();
		const slugs = new Set<string>();
		for (const entry of section.catalogue ?? []) {
			const identity = `${entry.kind}:${entry.ref}`;
			if (identities.has(identity))
				diagnostics.push({
					path: `${manifestPath}:[metadata].docs.sections[id=${section.id}].catalogue`,
					message: `duplicate catalogue identity '${identity}'`,
				});
			identities.add(identity);
			if (slugs.has(entry.slug))
				diagnostics.push({
					path: `${manifestPath}:[metadata].docs.sections[id=${section.id}].catalogue`,
					message: `duplicate public slug '${entry.slug}'`,
				});
			slugs.add(entry.slug);
		}
		for (const document of section.documents ?? []) {
			if (documentRefs.has(document.ref))
				diagnostics.push({
					path: `${manifestPath}:[metadata].docs.sections[id=${section.id}].documents`,
					message: `duplicate document ref '${document.ref}'`,
				});
			documentRefs.add(document.ref);
			if (articleIds.has(document.id))
				diagnostics.push({
					path: `${manifestPath}:[metadata].docs.sections[id=${section.id}].documents`,
					message: `document id '${document.id}' collides with an article`,
				});
			if (slugs.has(document.slug))
				diagnostics.push({
					path: `${manifestPath}:[metadata].docs.sections[id=${section.id}].documents`,
					message: `duplicate public slug '${document.slug}'`,
				});
			slugs.add(document.slug);
		}
	}
	return page;
}

function resolveContentValue(
	source: BundleManifestSource,
	article: { content: MetadataDocsContentRef },
): unknown {
	const matches = source.fragments.filter(
		(fragment) => fragment.path === article.content.source_path,
	);
	if (matches.length !== 1) {
		throw new Error(
			`content source_path '${article.content.source_path}' matches ${matches.length} included fragments`,
		);
	}
	const namespace = recordOf(matches[0]?.metadata[article.content.namespace]);
	return namespace[article.content.id];
}

export function resolveMetadataDocsPage(
	loaded: LoadedBundleChain,
	source: BundleManifestSource,
	page: MetadataDocsPage,
): ResolvedMetadataDocsPage {
	// Computed lazily (only if some section actually needs it) and once per
	// page, not once per section: `catalogueEntriesFromManifest` walks a whole
	// manifest, so re-running it per section would be quadratic in section count
	// for no reason.
	//
	// It reads the page's OWN source, not `loaded.manifest` — the assembled
	// closure, which also carries every dependency. For the SRD root the two are
	// the same file (`depends_on = []`), so nothing there changes. For any bundle
	// that depends on another they are not: the `dm` bundle declares
	// `depends_on = ["srd"]`, so deriving from the closure would list all 2034
	// SRD mechanics subjects under the runtime's own page the moment it declared
	// a section id srd-cc's placement rules recognise. A bundle's docs page lists
	// what that bundle authored (sk-jay0.3.5.76).
	let derivedListing: ReadonlyMap<string, readonly MetadataDocsCatalogueEntry[]> | undefined;
	const derivedCatalogueFor = (sectionId: string): MetadataDocsCatalogueEntry[] | undefined => {
		if (derivedListing === undefined)
			derivedListing = catalogueEntriesFromManifest(
				inspectManifest(loadFlattened(dirname(source.manifestPath), basename(source.manifestPath)))
					.manifest,
			);
		const listing = derivedListing;
		const entries = listing.get(sectionId);
		// `facts` is deliberately dropped. The projector treats an entry's own
		// `facts` as final and skips its tag-derived + residual computation
		// entirely, so carrying srd-cc's set here would silently replace the
		// facts every existing page has always shown. The retired
		// `srd-catalogue-listing.ts` never produced facts, which is why nothing
		// noticed; keeping that one behaviour makes this swap additive rather
		// than a change to 1830 existing entries. `reader_page_id` is kept — it
		// is the link to the authored reader page, and the trimmed copy dropping
		// it was a loss, not a decision.
		return entries === undefined ? undefined : entries.map(({ facts: _facts, ...entry }) => entry);
	};
	const definitions = Array.isArray(loaded.manifest.resource_definitions)
		? (loaded.manifest.resource_definitions as Record<string, unknown>[])
		: [];
	const entityDefinitions = Array.isArray(loaded.manifest.entity_definitions)
		? (loaded.manifest.entity_definitions as Record<string, unknown>[])
		: [];
	const entities = Array.isArray(loaded.manifest.entities)
		? (loaded.manifest.entities as Record<string, unknown>[])
		: [];
	const resolveArticle = (article: MetadataDocsArticle): ResolvedMetadataDocsArticle => {
		const content =
			article.content !== undefined
				? resolveContentValue(source, article)
				: { body: article.body, source: article.source };
		if (!validateContent(content)) {
			const details = schemaErrors("content", validateContent.errors)
				.map((error) => `${error.path}: ${error.message}`)
				.join("; ");
			throw new Error(`documentation content '${article.id}' is invalid: ${details}`);
		}
		const { resources: resourceRefs, subjects: subjectRefs } = docsDirectives(content.body);
		for (const directive of resourceRefs) {
			const matches = definitions.filter((row) => row.resource_definition_id === directive.ref);
			if (matches.length !== 1)
				throw new Error(
					`resource ref '${directive.ref}' resolves to ${matches.length} resource definitions`,
				);
		}
		for (const directive of subjectRefs) {
			const sourceRows = directive.kind === "entity_definition" ? entityDefinitions : entities;
			const idField = directive.kind === "entity_definition" ? "entity_def_id" : "entity_key";
			const matches = sourceRows.filter((row) => row[idField] === directive.ref);
			if (matches.length !== 1)
				throw new Error(
					`${directive.kind} ref '${directive.ref}' resolves to ${matches.length} rows`,
				);
		}
		if (article.featured_reference !== undefined) {
			const { kind, ref } = article.featured_reference;
			const sourceRows =
				kind === "resource_definition"
					? definitions
					: kind === "entity_definition"
						? entityDefinitions
						: entities;
			const idField =
				kind === "resource_definition"
					? "resource_definition_id"
					: kind === "entity_definition"
						? "entity_def_id"
						: "entity_key";
			const matches = sourceRows.filter((row) => row[idField] === ref);
			if (matches.length !== 1)
				throw new Error(`featured reference ${kind} '${ref}' resolves to ${matches.length} rows`);
		}
		return {
			id: article.id,
			title: article.title,
			...(article.featured_reference ? { featured_reference: article.featured_reference } : {}),
			...content,
		};
	};
	const resolveCatalogue = (
		section: MetadataDocsSection,
	): MetadataDocsCatalogueEntry[] | undefined => {
		if (section.catalogue_content === undefined) {
			// A section authoring neither `catalogue` nor `catalogue_content`
			// falls back to the derived SRD listing (sk-jay0.3.5.59) — a section
			// id `sections.toml`'s placement rules don't recognize (any
			// non-srd bundle's own section) simply gets `undefined` back,
			// unchanged from before this fallback existed.
			return section.catalogue ?? derivedCatalogueFor(section.id);
		}
		const value = resolveContentValue(source, { content: section.catalogue_content });
		const record = recordOf(value);
		if (Object.keys(record).length !== 1 || !Array.isArray(record.catalogue)) {
			throw new Error(
				`catalogue content '${section.catalogue_content.id}' must be an object containing only a catalogue array`,
			);
		}
		const { catalogue_content: _catalogueContent, ...sectionWithoutContent } = section;
		const candidate: MetadataDocsPage = {
			...page,
			sections: [{ ...sectionWithoutContent, catalogue: record.catalogue }],
		};
		if (!validatePage(candidate)) {
			const details = schemaErrors("catalogue", validatePage.errors)
				.map((error) => `${error.path}: ${error.message}`)
				.join("; ");
			throw new Error(`catalogue content '${section.catalogue_content.id}' is invalid: ${details}`);
		}
		return record.catalogue as MetadataDocsCatalogueEntry[];
	};
	return {
		...page,
		sections: page.sections.map((section) => {
			const { catalogue_content: _catalogueContent, ...sectionWithoutContent } = section;
			const catalogue = resolveCatalogue(section);
			const pages = section.pages?.map(resolveArticle);
			for (const article of pages ?? []) {
				if (article.featured_reference === undefined) continue;
				const matches = (catalogue ?? []).filter(
					(entry) =>
						entry.kind === article.featured_reference?.kind &&
						entry.ref === article.featured_reference?.ref,
				);
				if (matches.length !== 1)
					throw new Error(
						`featured reference ${article.featured_reference.kind} '${article.featured_reference.ref}' resolves to ${matches.length} catalogue entries in section '${section.id}'`,
					);
			}
			return {
				...sectionWithoutContent,
				catalogue,
				pages,
				documents: section.documents?.map((document) => ({
					...resolveArticle(document),
					ref: document.ref,
					slug: document.slug,
					family: document.family,
					...(document.tags ? { tags: document.tags } : {}),
					...(document.relations ? { relations: document.relations } : {}),
				})),
			};
		}),
	};
}

export function inspectMetadataDocs(options: ValidateMetadataDocsOptions): {
	diagnostics: MetadataDocsDiagnostic[];
	pages: { path: string; page: MetadataDocsPage; resolvedPage?: ResolvedMetadataDocsPage }[];
	loaded: LoadedBundleChain;
} {
	const dependencyPaths = options.dependencyPaths ?? {};
	const loaded = loadBundleChainDetailed({
		rootManifestPath: options.rootManifestPath,
		resolveDependency: (bundleId) => dependencyPaths[bundleId],
	});
	const diagnostics: MetadataDocsDiagnostic[] = [];
	const pagesByBundle = new Map<string, { page: MetadataDocsPage; path: string }>();
	const pages: { path: string; page: MetadataDocsPage; resolvedPage?: ResolvedMetadataDocsPage }[] =
		[];
	const sourcePathByBundle = new Map<string, string>();
	const pageIds = new Map<string, string>();
	for (const source of loaded.sources) {
		for (const bundleId of source.bundleIds) sourcePathByBundle.set(bundleId, source.manifestPath);
		const page = pageFromMetadata(source.manifestPath, source.metadata, diagnostics);
		if (page === undefined) continue;
		const item: { path: string; page: MetadataDocsPage; resolvedPage?: ResolvedMetadataDocsPage } =
			{
				path: source.manifestPath,
				page,
			};
		try {
			item.resolvedPage = resolveMetadataDocsPage(loaded, source, page);
		} catch (error) {
			diagnostics.push({
				path: `${source.manifestPath}:[metadata].docs`,
				message: error instanceof Error ? error.message : String(error),
			});
		}
		pages.push(item);
		const previousPagePath = pageIds.get(page.page_id);
		if (previousPagePath !== undefined && previousPagePath !== source.manifestPath) {
			diagnostics.push({
				path: `${source.manifestPath}:[metadata].docs.page_id`,
				message: `page_id '${page.page_id}' is also declared by '${previousPagePath}'`,
			});
		} else pageIds.set(page.page_id, source.manifestPath);
		for (const bundleId of source.bundleIds) {
			const previous = pagesByBundle.get(bundleId);
			if (previous !== undefined) {
				diagnostics.push({
					path: source.manifestPath,
					message: `bundle '${bundleId}' has docs pages in both '${previous.path}' and this source`,
				});
			} else pagesByBundle.set(bundleId, { page, path: source.manifestPath });
		}
	}

	const attachments = Array.isArray(loaded.manifest.metadata_attachments)
		? (loaded.manifest.metadata_attachments as Record<string, unknown>[])
		: [];
	for (const [index, row] of attachments.entries()) {
		const bundleId = typeof row.bundle_id === "string" ? row.bundle_id : "";
		if (typeof row.namespace !== "string" || !row.namespace.endsWith(".docs.entry")) continue;
		const sourcePath = sourcePathByBundle.get(bundleId) ?? resolve(options.rootManifestPath);
		const rowPath = `${sourcePath}:metadata_attachments[${index}]`;
		if (row.namespace !== `${bundleId}.docs.entry`) {
			diagnostics.push({
				path: `${rowPath}.namespace`,
				message: `namespace '${row.namespace}' must be prefixed by owning bundle '${bundleId}'`,
			});
			continue;
		}
		const payload = parseJson(`${rowPath}.payload_json`, row.payload_json, diagnostics);
		if (!validateEntry(payload)) {
			diagnostics.push(...schemaErrors(`${rowPath}.payload_json`, validateEntry.errors));
			continue;
		}
		const owned = pagesByBundle.get(bundleId);
		if (owned === undefined) {
			diagnostics.push({
				path: rowPath,
				message: `docs entry has no docs page for bundle '${bundleId}'`,
			});
			continue;
		}
		if (payload.page_id !== owned.page.page_id) {
			diagnostics.push({
				path: rowPath,
				message: `page_id '${payload.page_id}' does not match '${owned.page.page_id}'`,
			});
		}
		if (!owned.page.sections.some((section) => section.id === payload.section_id)) {
			diagnostics.push({
				path: rowPath,
				message: `section_id '${payload.section_id}' does not exist on page '${owned.page.page_id}'`,
			});
		}
	}
	return { diagnostics, pages, loaded };
}

export function validateMetadataDocs(
	options: ValidateMetadataDocsOptions,
): MetadataDocsDiagnostic[] {
	return inspectMetadataDocs(options).diagnostics;
}
