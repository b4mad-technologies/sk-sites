import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import {
	catalogueIdentities,
	rowCompositeColumns,
	rowIdentityColumns,
	rowKindCoverageFor,
	unclassifiedRowKinds,
} from "@spellkave/srd-cc/docs/row-kind-coverage";
import {
	inspectManifest,
	loadBundleChainDetailed,
	loadFlattened,
	ROW_KIND_COMPOSITE_KEY,
	ROW_KIND_NATURAL_KEY,
} from "@spellkave/world-author";
import { authoredSourceRows, collectWitnesses, type DeliveryKeys, occurrenceKey } from "./delivery";
import type {
	DocsArticle,
	DocsCatalogueEntry,
	DocsCatalogueEntrySummary,
	DocsDocument,
	DocsIndexV1,
	DocsSearchEntry,
	DocsTechnicalTable,
} from "./docs-types";
import { resolveCompendiumRoute } from "./parse-path";
import {
	type buildTechnicalDocsProjection,
	type DocsProjectionRoot,
	projectMetadataDocsIndex,
} from "./project-metadata-docs";
import type { ResolvedCompendiumRoute } from "./types";

export interface DocsCoverageDiagnostic {
	path: string;
	message: string;
}

export interface DocsCoverageReport {
	diagnostics: DocsCoverageDiagnostic[];
	rich_entries: number;
	technical_rows: number;
	technical_metadata_envelopes: number;
}

function canonical(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
	if (value !== null && typeof value === "object") {
		return `{${Object.entries(value as Record<string, unknown>)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
			.join(",")}}`;
	}
	return JSON.stringify(value);
}

function canonicalMultiset(values: readonly unknown[]): string[] {
	return values.map(canonical).sort();
}

/** The kernel's row identities, so a page and the basin agree on what a row IS. */
const DELIVERY_KEYS: DeliveryKeys = {
	natural: rowIdentityColumns(ROW_KIND_NATURAL_KEY),
	composite: rowCompositeColumns(ROW_KIND_COMPOSITE_KEY),
};
const CATALOGUE_IDENTITIES = catalogueIdentities(ROW_KIND_NATURAL_KEY);

/** How many distinct offenders a partition diagnostic names before it stops. */
const PARTITION_SAMPLE = 5;

function artifactPath(root: string, href: string): string | undefined {
	const prefix = "/compendium/docs/";
	if (!href.startsWith(prefix)) return undefined;
	const path = resolve(root, href.slice(prefix.length));
	return path.startsWith(`${resolve(root)}/`) ? path : undefined;
}

function routeMissing(route: ResolvedCompendiumRoute | null): boolean {
	return route === null || route.page === "missing";
}

export function validateProjectedDocsCoverage(
	index: DocsIndexV1,
	outputRoot: string,
	expectedTechnical?: ReturnType<typeof buildTechnicalDocsProjection>,
): DocsCoverageReport {
	const diagnostics: DocsCoverageDiagnostic[] = [];
	const rich: Array<DocsCatalogueEntry | DocsDocument | DocsArticle> = [];
	/** Only the catalogue entries, which are what the delivery witness reads. */
	const catalogueEntries: DocsCatalogueEntry[] = [];
	/** Only the articles, the other page kind the delivery witness reads. */
	const articleEntries: DocsArticle[] = [];
	/** Every row occurrence the technical artifacts carry, by kernel identity. */
	const basinKeys = new Set<string>();
	const catalogues: DocsCatalogueEntrySummary[] = [];
	const hydratedCatalogues = new Map<string, DocsCatalogueEntrySummary[]>();
	const publicHrefs = new Map<string, string>();
	const readArtifact = <T>(href: string, owner: string): T | undefined => {
		const path = artifactPath(outputRoot, href);
		if (path === undefined) {
			diagnostics.push({ path: owner, message: `unsafe documentation artifact href '${href}'` });
			return undefined;
		}
		try {
			return JSON.parse(readFileSync(path, "utf8")) as T;
		} catch (error) {
			diagnostics.push({
				path: owner,
				message: `missing or invalid documentation artifact '${href}': ${error instanceof Error ? error.message : String(error)}`,
			});
			return undefined;
		}
	};
	const publicHref = (href: string | undefined, owner: string): void => {
		if (!href) return;
		publicHrefs.set(href, owner);
	};
	const artifactKind = (href: string, prefix: string, owner: string): void => {
		if (!href.startsWith(prefix))
			diagnostics.push({
				path: owner,
				message: `artifact href '${href}' is outside application loader prefix '${prefix}'`,
			});
	};

	for (const page of index.pages) {
		publicHref(page.href, `page:${page.page_id}`);
		for (const link of page.links ?? [])
			publicHref(link.href, `page:${page.page_id}:link:${link.kind}:${link.ref}`);
		for (const section of page.sections) {
			const owner = `page:${page.page_id}:section:${section.id}`;
			publicHref(section.href, owner);
			let summaries = section.catalogue ?? [];
			if (section.catalogue_href) {
				artifactKind(section.catalogue_href, "/compendium/docs/catalogues/", owner);
				summaries = readArtifact<DocsCatalogueEntrySummary[]>(section.catalogue_href, owner) ?? [];
			}
			hydratedCatalogues.set(`${page.page_id}:${section.id}`, summaries);
			if (section.catalogue_count !== undefined && summaries.length !== section.catalogue_count)
				diagnostics.push({
					path: owner,
					message: `catalogue count ${section.catalogue_count} does not match artifact count ${summaries.length}`,
				});
			for (const summary of summaries) {
				catalogues.push(summary);
				artifactKind(
					summary.artifact_href,
					"/compendium/docs/catalogue/",
					`${owner}:catalogue:${summary.ref}`,
				);
				publicHref(summary.href, `${owner}:catalogue:${summary.ref}`);
				const entry = readArtifact<DocsCatalogueEntry>(
					summary.artifact_href,
					`${owner}:catalogue:${summary.ref}`,
				);
				if (!entry) continue;
				rich.push(entry);
				catalogueEntries.push(entry);
				if (entry.ref !== summary.ref || entry.href !== summary.href || entry.slug !== summary.slug)
					diagnostics.push({
						path: `${owner}:catalogue:${summary.ref}`,
						message: "catalogue summary does not match its lazy entry artifact",
					});
				if (entry.resource)
					publicHref(entry.resource.href, `${owner}:resource:${entry.resource.ref}`);
				if (entry.subject)
					publicHref(
						entry.subject.href,
						`${owner}:subject:${entry.subject.kind}:${entry.subject.ref}`,
					);
				for (const relation of entry.relations ?? [])
					publicHref(relation.href, `${owner}:relation:${relation.kind}:${relation.ref}`);
			}
			for (const summary of section.documents ?? []) {
				artifactKind(
					summary.artifact_href,
					"/compendium/docs/documents/",
					`${owner}:document:${summary.ref}`,
				);
				publicHref(summary.href, `${owner}:document:${summary.ref}`);
				const document = readArtifact<
					DocsDocument & { relations?: Array<{ kind: string; ref: string; href?: string }> }
				>(summary.artifact_href, `${owner}:document:${summary.ref}`);
				if (!document) continue;
				rich.push(document);
				if (
					document.ref !== summary.ref ||
					document.href !== summary.href ||
					document.slug !== summary.slug
				)
					diagnostics.push({
						path: `${owner}:document:${summary.ref}`,
						message: "document summary does not match its lazy artifact",
					});
				for (const relation of document.relations ?? [])
					publicHref(relation.href, `${owner}:document-relation:${relation.kind}:${relation.ref}`);
			}
			for (const summary of section.pages ?? []) {
				artifactKind(
					summary.artifact_href,
					"/compendium/docs/articles/",
					`${owner}:article:${summary.id}`,
				);
				publicHref(summary.href, `${owner}:article:${summary.id}`);
				const article = readArtifact<DocsArticle>(
					summary.artifact_href,
					`${owner}:article:${summary.id}`,
				);
				if (!article) continue;
				rich.push(article);
				articleEntries.push(article);
				if (article.id !== summary.id || article.href !== summary.href)
					diagnostics.push({
						path: `${owner}:article:${summary.id}`,
						message: "article summary does not match its lazy artifact",
					});
				// An article owns a route XOR it is featured by a catalogue entry
				// (sk-jay0.7.93): a featured article is displayed at the entry's
				// own href instead, so it must not also advertise one of its own.
				if ((article.href !== undefined) === (article.featured_reference !== undefined))
					diagnostics.push({
						path: `${owner}:article:${summary.id}`,
						message:
							article.href !== undefined
								? "featured article must not carry its own href"
								: "non-featured article must carry an href",
					});
				const actualResourceRoutes = (article.resources ?? []).map(({ ref, href }) => ({
					ref,
					href,
				}));
				const actualSubjectRoutes = (article.subjects ?? []).map(({ kind, ref, href }) => ({
					kind,
					ref,
					href,
				}));
				if (article.featured_reference?.kind === "resource_definition") {
					const matches = (article.resources ?? []).filter(
						(resource) => resource.ref === article.featured_reference?.ref,
					);
					if (matches.length !== 1)
						diagnostics.push({
							path: `${owner}:article:${article.id}:featured-reference`,
							message: `featured resource '${article.featured_reference.ref}' resolves to ${matches.length} projected resources`,
						});
				} else if (article.featured_reference !== undefined) {
					const matches = (article.subjects ?? []).filter(
						(subject) =>
							subject.kind === article.featured_reference?.kind &&
							subject.ref === article.featured_reference?.ref,
					);
					if (matches.length !== 1)
						diagnostics.push({
							path: `${owner}:article:${article.id}:featured-reference`,
							message: `featured subject ${article.featured_reference.kind} '${article.featured_reference.ref}' resolves to ${matches.length} projected subjects`,
						});
				}
				if (
					canonicalMultiset(summary.resource_routes ?? []).join("\n") !==
					canonicalMultiset(actualResourceRoutes).join("\n")
				)
					diagnostics.push({
						path: `${owner}:article:${summary.id}`,
						message: "article resource route membership does not match its embedded resources",
					});
				if (
					canonicalMultiset(summary.subject_routes ?? []).join("\n") !==
					canonicalMultiset(actualSubjectRoutes).join("\n")
				)
					diagnostics.push({
						path: `${owner}:article:${summary.id}`,
						message: "article subject route membership does not match its embedded subjects",
					});
				for (const resource of article.resources ?? [])
					publicHref(resource.href, `${owner}:article-resource:${resource.ref}`);
				for (const subject of article.subjects ?? [])
					publicHref(subject.href, `${owner}:article-subject:${subject.kind}:${subject.ref}`);
			}
		}
	}

	const targets = new Map<string, string[]>();
	for (const entry of catalogues) {
		const key = `${entry.kind}:${entry.ref}`;
		targets.set(key, [...(targets.get(key) ?? []), entry.href]);
	}
	for (const page of index.pages) {
		for (const link of page.links ?? []) {
			const matches = targets.get(`${link.kind}:${link.ref}`) ?? [];
			if (matches.length !== 1 || matches[0] !== link.href)
				diagnostics.push({
					path: `page:${page.page_id}:link:${link.kind}:${link.ref}`,
					message: `typed target resolves to ${matches.length} catalogue entries instead of exact href '${link.href}'`,
				});
		}
	}
	for (const item of rich) {
		for (const relation of "relations" in item ? (item.relations ?? []) : []) {
			if (!relation.href) continue;
			const matches = targets.get(`${relation.kind}:${relation.ref}`) ?? [];
			if (matches.length !== 1 || matches[0] !== relation.href)
				diagnostics.push({
					path: `relation:${relation.kind}:${relation.ref}`,
					message: `resolved typed relation does not match its unique catalogue target`,
				});
		}
	}

	const hydratedIndex: DocsIndexV1 = {
		...index,
		pages: index.pages.map((page) => ({
			...page,
			sections: page.sections.map((section) => ({
				...section,
				catalogue: hydratedCatalogues.get(`${page.page_id}:${section.id}`) ?? [],
			})),
		})),
	};
	if (index.search_href) {
		if (index.search_href !== "/compendium/docs/search.json")
			diagnostics.push({
				path: "search",
				message: `search artifact href '${index.search_href}' does not match the application loader path`,
			});
		const search = readArtifact<DocsSearchEntry[]>(index.search_href, "search") ?? [];
		const searchable = new Map<string, string>();
		for (const entry of rich) {
			if ("ref" in entry) searchable.set(entry.href, entry.ref);
			// Non-null: this branch is reached only for a non-featured article,
			// the only kind that carries an href (sk-jay0.7.93).
			else if (entry.featured_reference === undefined) searchable.set(entry.href!, entry.id);
		}
		for (const row of search) {
			if (searchable.get(row.href) !== row.ref)
				diagnostics.push({
					path: `search:${row.ref}`,
					message: `search identity and href '${row.href}' do not match one rich artifact`,
				});
			if (routeMissing(resolveCompendiumRoute(row.href, hydratedIndex)))
				diagnostics.push({
					path: `search:${row.ref}`,
					message: `search href '${row.href}' is not routable`,
				});
		}
	}

	let technicalRows = 0;
	let metadataEnvelopes = 0;
	const emittedRowKinds = new Set<string>();
	for (const source of index.technical_sources ?? []) {
		publicHref(source.href, `technical:${source.source_id}`);
		let countedRows = 0;
		for (const summary of source.tables) {
			// `manifest_metadata` is the projector's own envelope for `[metadata.*]`
			// blocks, not a manifest row kind, so it is not something to classify.
			if (summary.table !== "manifest_metadata") emittedRowKinds.add(summary.table);
			publicHref(
				`${source.href}/${encodeURIComponent(summary.table)}`,
				`technical:${source.source_id}:${summary.table}:route`,
			);
			const expectedArtifactHref = `/compendium/docs/technical/${encodeURIComponent(source.source_id)}/${encodeURIComponent(summary.table)}.json`;
			if (summary.href !== expectedArtifactHref)
				diagnostics.push({
					path: `technical:${source.source_id}:${summary.table}`,
					message: `technical artifact href '${summary.href}' does not match the application loader path '${expectedArtifactHref}'`,
				});
			const table = readArtifact<DocsTechnicalTable>(
				summary.href,
				`technical:${source.source_id}:${summary.table}`,
			);
			if (!table) continue;
			if (rowKindCoverageFor(summary.table)?.public_fields !== undefined && table.rows.length > 0)
				diagnostics.push({
					path: `technical:${source.source_id}:${summary.table}`,
					message: "raw technical fallback for redacted rows is forbidden",
				});
			if (
				table.source_id !== source.source_id ||
				table.table !== summary.table ||
				table.rows.length !== summary.count
			)
				diagnostics.push({
					path: `technical:${source.source_id}:${summary.table}`,
					message: "technical table summary does not match its lazy artifact",
				});
			if (summary.table === "manifest_metadata") metadataEnvelopes += table.rows.length;
			else {
				technicalRows += table.rows.length;
				countedRows += table.rows.length;
				for (const row of table.rows)
					basinKeys.add(
						occurrenceKey(summary.table, row as Record<string, unknown>, DELIVERY_KEYS),
					);
			}
			const expected = expectedTechnical?.tables.get(source.source_id)?.get(summary.table);
			// The basin may hold FEWER rows than the manifest authors — that is the
			// point of it. What it may never do is hold a row the manifest never
			// authored, or hold one more often than it was authored. The old rule
			// here demanded exact equality, which is what "every row is in the dump"
			// meant; the partition check below carries the completeness half now.
			if (expected) {
				const remaining = new Map<string, number>();
				for (const row of expected) {
					const key = canonical(row);
					remaining.set(key, (remaining.get(key) ?? 0) + 1);
				}
				const invented = table.rows.filter((row) => {
					const key = canonical(row);
					const left = remaining.get(key) ?? 0;
					if (left === 0) return true;
					remaining.set(key, left - 1);
					return false;
				});
				if (invented.length > 0)
					diagnostics.push({
						path: `technical:${source.source_id}:${summary.table}`,
						message: `technical artifact carries ${invented.length} row occurrence(s) the manifest does not author`,
					});
			}
			if (expectedTechnical && expected === undefined)
				diagnostics.push({
					path: `technical:${source.source_id}:${summary.table}`,
					message: "emitted technical table has no matching loaded manifest source table",
				});
		}
		if (countedRows !== source.row_count)
			diagnostics.push({
				path: `technical:${source.source_id}`,
				message: `source row_count ${source.row_count} does not match emitted technical rows ${countedRows}`,
			});
	}
	if (expectedTechnical) {
		for (const source of index.technical_sources ?? []) {
			if (!expectedTechnical.sources.some((expected) => expected.source_id === source.source_id))
				diagnostics.push({
					path: `technical:${source.source_id}`,
					message: "emitted technical source has no matching loaded manifest source",
				});
		}
	}
	// Page or basin, never neither, and never both (sk-jay0.3.5.71.2).
	//
	// This replaces the invariant that every authored row must appear in the
	// technical dump. The dump is now an overflow basin holding only what no page
	// shows, so completeness has to be asserted across BOTH halves at once:
	//
	//   - "in neither" is the one that hides content. A row that reaches no page
	//     and is filtered out of the basin is invisible, and — the trap this
	//     project has already fallen into twice — looks exactly like a row that
	//     was never authored. This half is what makes the basin trustworthy.
	//   - "in both" is the one that makes the basin meaningless. If a row with a
	//     proper page is dumped anyway, the basin is back to being a copy of
	//     everything and its size stops measuring the gap.
	//
	// Membership on the page side is the SAME witness rule `measureDelivery` uses,
	// reached here over independently re-read artifacts. A projection that filtered
	// too eagerly therefore surfaces as "in neither" rather than passing quietly.
	if (expectedTechnical) {
		const witnessReport = collectWitnesses(
			catalogueEntries,
			articleEntries,
			DELIVERY_KEYS,
			CATALOGUE_IDENTITIES,
			index.pages,
			authoredSourceRows(expectedTechnical.tables),
		);
		for (const message of witnessReport.violations)
			diagnostics.push({ path: "public-source-witness", message });
		const witnessed = witnessReport.keys;
		for (const [sourceId, tables] of expectedTechnical.tables)
			for (const [table, rows] of tables) {
				if (table === "manifest_metadata") continue;
				const neither: string[] = [];
				const both: string[] = [];
				for (const row of rows) {
					const key = occurrenceKey(table, row, DELIVERY_KEYS);
					const onPage = witnessed.has(key);
					const inBasin = basinKeys.has(key);
					if (!onPage && !inBasin) neither.push(key);
					else if (onPage && inBasin) both.push(key);
				}
				if (neither.length > 0)
					diagnostics.push({
						path: `technical:${sourceId}:${table}`,
						message: `${neither.length} authored row occurrence(s) appear on no page and in no technical artifact: ${[...new Set(neither)].slice(0, PARTITION_SAMPLE).join(", ")}`,
					});
				if (both.length > 0)
					diagnostics.push({
						path: `technical:${sourceId}:${table}`,
						message: `${both.length} authored row occurrence(s) are shown on a page and dumped in the technical artifact as well: ${[...new Set(both)].slice(0, PARTITION_SAMPLE).join(", ")}`,
					});
			}
	}
	// Reader coverage, rule A: every manifest row kind is deliberately classified.
	//
	// The candidates are the KERNEL registry unioned with the tables this
	// projection actually emitted — never a scan of the fixtures alone. Eleven
	// kernel-registered kinds carry no authored rows today (substrate_definitions,
	// outcome_graphs, location_definitions and friends); a fixture scan calls
	// those absent and waves them through, which is exactly how a new row kind
	// would reach readers unnoticed. Reading the registry means content cannot
	// start authoring a kind without this gate demanding a decision first.
	for (const kind of unclassifiedRowKinds([
		...Object.keys(ROW_KIND_NATURAL_KEY),
		...Object.keys(ROW_KIND_COMPOSITE_KEY),
		...emittedRowKinds,
	]))
		diagnostics.push({
			path: `row-kind:${kind}`,
			message: `manifest row kind '${kind}' is not classified; add a [[kinds]] row to packages/spellkave-srd-cc/src/docs/row-kind-coverage.toml`,
		});
	for (const [href, owner] of publicHrefs) {
		if (routeMissing(resolveCompendiumRoute(href, hydratedIndex)))
			diagnostics.push({
				path: owner,
				message: `emitted public href '${href}' does not resolve through the application router`,
			});
	}
	return {
		diagnostics,
		rich_entries: rich.length,
		technical_rows: technicalRows,
		technical_metadata_envelopes: metadataEnvelopes,
	};
}

export function validateDocsCoverage(roots: readonly DocsProjectionRoot[]): DocsCoverageReport {
	const temp = mkdtempSync(join(tmpdir(), "spellkave-docs-coverage-"));
	try {
		const index = projectMetadataDocsIndex(roots, join(temp, "index.json"));
		const sources = new Map<
			string,
			ReturnType<typeof loadBundleChainDetailed>["sources"][number]
		>();
		for (const root of roots) {
			const loaded = loadBundleChainDetailed({
				rootManifestPath: root.rootManifestPath,
				resolveDependency: (bundleId) => root.dependencyPaths?.[bundleId],
			});
			for (const source of loaded.sources) sources.set(resolve(source.manifestPath), source);
		}
		const expectedTables = new Map<string, Map<string, Record<string, unknown>[]>>();
		for (const source of sources.values()) {
			const sourceId = [...source.bundleIds].sort().join("+");
			const manifest = inspectManifest(
				loadFlattened(dirname(source.manifestPath), basename(source.manifestPath)),
			).manifest as Record<string, unknown>;
			const tables = new Map<string, Record<string, unknown>[]>();
			for (const [table, value] of Object.entries(manifest))
				if (table !== "include" && Array.isArray(value) && value.length > 0)
					tables.set(table, value as Record<string, unknown>[]);
			const envelopes: Record<string, unknown>[] = [];
			if (Object.keys(source.metadata).length > 0)
				envelopes.push({ scope: "root", metadata: source.metadata });
			for (const fragment of source.fragments)
				if (Object.keys(fragment.metadata).length > 0)
					envelopes.push({ scope: "include", path: fragment.path, metadata: fragment.metadata });
			if (envelopes.length > 0) tables.set("manifest_metadata", envelopes);
			expectedTables.set(sourceId, tables);
		}
		const expected = {
			tables: expectedTables,
			sources: [...sources.values()].map((source) => {
				const sourceId = [...source.bundleIds].sort().join("+");
				const tables = expectedTables.get(sourceId) ?? new Map();
				return {
					source_id: sourceId,
					bundle_ids: [...source.bundleIds],
					row_count: [...tables]
						.filter(([table]) => table !== "manifest_metadata")
						.reduce((sum, [, rows]) => sum + rows.length, 0),
					href: `/docs/technical/${encodeURIComponent(sourceId)}`,
					tables: [...tables].map(([table, rows]) => ({
						table,
						count: rows.length,
						href: `/compendium/docs/technical/${encodeURIComponent(sourceId)}/${encodeURIComponent(table)}.json`,
					})),
				};
			}),
		};
		return validateProjectedDocsCoverage(index, temp, expected);
	} finally {
		rmSync(temp, { recursive: true, force: true });
	}
}
