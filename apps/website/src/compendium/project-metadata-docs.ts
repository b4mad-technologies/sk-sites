import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import {
	catalogueIdentities,
	ownerCandidates,
	rowCompositeColumns,
	rowIdentityColumns,
	rowKindCoverage,
	rowKindCoverageFor,
} from "@spellkave/srd-cc/docs/row-kind-coverage";
import type { DocsDslTarget } from "@spellkave/ui-widgets/catalogue";
import { firstSentence } from "@spellkave/ui-widgets/catalogue/first-sentence";
import {
	inspectManifest,
	type LoadedBundleChain,
	loadFlattened,
	ROW_KIND_COMPOSITE_KEY,
	ROW_KIND_NATURAL_KEY,
} from "@spellkave/world-author";
import { catalogueProvenanceCandidates, catalogueRelations } from "./catalogue-relations";
import {
	authoredSourceRows,
	collectWitnesses,
	type DeliveryKeys,
	occurrenceKey,
	publicRow,
	sourceDigest,
} from "./delivery";
import type { DocsLinkTarget } from "./docs-linkify";
import { renderAttachmentMarkdown, renderDocsMarkdown } from "./docs-markdown";
import type {
	DocsArticle,
	DocsArticleCatalogueList,
	DocsAttachment,
	DocsCatalogueEntry,
	DocsCatalogueEntrySummary,
	DocsFacet,
	DocsIndexV1,
	DocsPage,
	DocsPageBundle,
	DocsResource,
	DocsRowEntryReference,
	DocsSearchEntry,
	DocsSource,
	DocsSubject,
	DocsSubjectKind,
	DocsTag,
	DocsTagLink,
	DocsTagMemberSummary,
	DocsTechnicalSourceSummary,
	DocsTechnicalTable,
} from "./docs-types";
import { inspectMetadataDocs } from "./metadata-docs-validator";
import { buildReferenceGraph, readableKind, referenceGraphKey } from "./reference-graph";
import { buildReferenceVocabulary } from "./reference-vocabulary";
import {
	ARTICLE_LINK_SECTIONS,
	articleCatalogueListsFor,
	ENTITY_OWNER_ROUTES,
	ENTITY_ROUTES,
	FACT_NAMESPACES,
	FACT_VALUE_OVERRIDES,
	FAMILY_HEADINGS,
	FAMILY_NOUNS,
	type FactNamespaceRule,
	IDENTITY_NAMESPACES,
	resourceBlockFor,
	resourceGroupsFor,
	SECTION_PRIMARY_FAMILIES,
	TAGS_SECTION,
} from "./srd-sections";
import { tagEdgeParents, tagsByEntry } from "./tag-edges";
import { type DslTargetsForId, projectDslFields } from "./tokenize-dsl";

export interface DocsProjectionRoot {
	rootManifestPath: string;
	dependencyPaths?: Readonly<Record<string, string>>;
	/** Public location below `/docs`; copy and ordering remain manifest-authored. */
	mount?: string;
	/** Authored asset path prefix to already-copied public directory. */
	assetMounts?: Readonly<Record<string, string>>;
	/** Technical manifest asset-module name to public directory. */
	assetModuleMounts?: Readonly<Record<string, { pathPrefix: string; publicMount: string }>>;
}

/**
 * Everything `buildMetadataDocsIndex` and `buildTechnicalDocsProjection` each
 * independently re-derive from the same `roots` array by calling
 * `inspectMetadataDocs` (which itself parses the TOML corpus and, for every
 * docs page, renders every article body) and re-parsing each root/source's
 * own flattened manifest. `projectMetadataDocsIndex` builds this once and
 * hands the SAME object to both, so a single projection run inspects and
 * parses each root/source exactly once instead of once per builder.
 *
 * Scoped to a single call site's stack — never stored on a module-level
 * binding — so it cannot leak stale data across separate runs or tests; a
 * caller that does not pass one (every existing test) gets the prior
 * behavior of inspecting/parsing fresh, unchanged.
 */
export interface InspectedDocsCorpus {
	inspected: ReadonlyMap<string, ReturnType<typeof inspectMetadataDocs>>;
	rawManifests: Map<string, Record<string, unknown>>;
}

/** A root's inspection depends on its manifest AND its dependency paths. */
function inspectionKey(root: DocsProjectionRoot): string {
	return JSON.stringify([
		resolve(root.rootManifestPath),
		Object.entries(root.dependencyPaths ?? {}).sort(([left], [right]) => left.localeCompare(right)),
	]);
}

/** Run `inspectMetadataDocs` exactly once per distinct root (manifest + dependencies). */
export function inspectDocsCorpus(roots: readonly DocsProjectionRoot[]): InspectedDocsCorpus {
	const inspected = new Map<string, ReturnType<typeof inspectMetadataDocs>>();
	for (const root of roots) {
		const key = inspectionKey(root);
		if (inspected.has(key)) continue;
		inspected.set(
			key,
			inspectMetadataDocs({
				rootManifestPath: root.rootManifestPath,
				dependencyPaths: root.dependencyPaths,
			}),
		);
	}
	return { inspected, rawManifests: new Map() };
}

function inspectRoot(
	root: DocsProjectionRoot,
	corpus: InspectedDocsCorpus | undefined,
): ReturnType<typeof inspectMetadataDocs> {
	return (
		corpus?.inspected.get(inspectionKey(root)) ??
		inspectMetadataDocs({
			rootManifestPath: root.rootManifestPath,
			dependencyPaths: root.dependencyPaths,
		})
	);
}

/** `inspectManifest(loadFlattened(...))` for one manifest path, memoized in `cache` when given. */
function inspectFlattenedManifest(
	manifestPath: string,
	cache: Map<string, Record<string, unknown>> | undefined,
): Record<string, unknown> {
	const resolved = resolve(manifestPath);
	const cached = cache?.get(resolved);
	if (cached) return cached;
	const parsed = inspectManifest(loadFlattened(dirname(resolved), basename(resolved)))
		.manifest as Record<string, unknown>;
	cache?.set(resolved, parsed);
	return parsed;
}

const ROUTE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// A "/"-joined slug is a deliberate multi-segment route (sk-jay0.3.5.66 —
// srd-cc's `tagPathSlug` publishes a tag's own namespace structure as
// nested path segments, e.g. "spell/range/self"); every other slug kind
// stays single-segment, so this only ever matches more than one segment for
// a tag.
const PUBLIC_SLUG = /^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/;

/**
 * Every section id srd-cc's `sections.toml` places catalogue subjects into
 * (`entity_routes[].section` + the one authored `tags_section`, since
 * sk-jay0.3.5.66 retired the former per-namespace `[[tag_sections]]`
 * table), derived rather than hand-listed. A non-SRD bundle section
 * (kavemouth, dm, ...) never matches an id here (sk-jay0.3.5.64).
 */
const SRD_DOC_SECTION_IDS: ReadonlySet<string> = new Set([
	...ENTITY_ROUTES.map((route) => route.section),
	TAGS_SECTION,
]);

/**
 * The `section_primary_families` rows declared for `sectionId`, or
 * `undefined` when `sectionId` is not an SRD-placed section at all — the
 * distinction `DocsPageOverview.svelte` (client-side, no `sections.toml`
 * access) uses to tell "declares no primary family, group the rest"
 * (character-creation) apart from "never grouped, list everything" (every
 * non-SRD bundle section) — sk-jay0.3.5.64.
 */
function primaryFamiliesForSection(sectionId: string): string[] | undefined {
	if (!SRD_DOC_SECTION_IDS.has(sectionId)) return undefined;
	return SECTION_PRIMARY_FAMILIES.filter((row) => row.section === sectionId).map(
		(row) => row.family,
	);
}

function routeId(value: string, field: string): void {
	if (!ROUTE_ID.test(value)) throw new Error(`${field} '${value}' is not a safe route id`);
}

function publicSlug(value: string, field: string): void {
	if (!PUBLIC_SLUG.test(value)) throw new Error(`${field} '${value}' is not a safe public slug`);
}

function mountFor(pageId: string, mount: string | undefined): string {
	const href = mount ?? `/docs/${pageId}`;
	if (!href.startsWith("/docs/") || href.endsWith("/") || href.includes("//")) {
		throw new Error(`docs mount '${href}' must be a normalized child of '/docs'`);
	}
	return href;
}

function recordOf(value: unknown): Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function requiredString(row: Record<string, unknown>, field: string, context: string): string {
	const value = row[field];
	if (typeof value !== "string" || value.length === 0) {
		throw new Error(`${context} field '${field}' must be a non-empty string`);
	}
	return value;
}

function resourceHref(sectionHref: string, ref: string): string {
	return `${sectionHref}/resource/${encodeURIComponent(ref)}`;
}

function subjectHref(sectionHref: string, kind: DocsSubjectKind, ref: string): string {
	return `${sectionHref}/subject/${kind}/${encodeURIComponent(ref)}`;
}

function catalogueHref(
	catalogue: readonly DocsCatalogueEntry[],
	kind: DocsSubjectKind | "resource_definition",
	ref: string,
): string | undefined {
	const matches = catalogue.filter((entry) => entry.kind === kind && entry.ref === ref);
	if (matches.length > 1)
		throw new Error(`reference ${kind}:${ref} resolves to ${matches.length} catalogue routes`);
	return matches[0]?.href;
}

// Which kinds earn a catalogue page is authored once, in
// `packages/spellkave-srd-cc/src/docs/row-kind-coverage.toml`, and the column
// holding each row's identity is read from the kernel registry. Neither fact is
// restated here: this table used to be one of four hand-synced copies that had
// already drifted to three different lengths.
const CATALOGUE_IDENTITIES = catalogueIdentities(ROW_KIND_NATURAL_KEY);

/** The kernel's row identities, used to recognise a row the reader already saw. */
const DELIVERY_KEYS: DeliveryKeys = {
	natural: rowIdentityColumns(ROW_KIND_NATURAL_KEY),
	composite: rowCompositeColumns(ROW_KIND_COMPOSITE_KEY),
};

/** The uniform tag junctions whose parent subject has a page of its own. */
export const TAG_EDGE_PARENTS = tagEdgeParents(ROW_KIND_COMPOSITE_KEY, CATALOGUE_IDENTITIES);

const EMPTY: ReadonlySet<string> = new Set();

/**
 * Every id a manifest value names, including the ones buried in a JSON string.
 *
 * A plain column scan finds a natural weapon, because the equipment row names it
 * in a column of its own. It does NOT find an expertise option, because the
 * advancement choice that grants it carries `grants_ref` inside `payload_json` —
 * a string as far as any column scan is concerned. The reader should show what
 * the manifest says, so the payload is read the same way the reader reads it.
 */
function* namedIds(value: unknown): Generator<string> {
	if (typeof value !== "string") return;
	yield value;
	if (!value.startsWith("{") && !value.startsWith("[")) return;
	let parsed: unknown;
	try {
		parsed = JSON.parse(value);
	} catch {
		return;
	}
	if (parsed === null || typeof parsed !== "object") return;
	for (const inner of Object.values(parsed as Record<string, unknown>))
		if (typeof inner === "string") yield inner;
}

/** `consequence_frame_writes` -> `Consequence frame writes`. */
function facetLabelForTable(table: string): string {
	const words = table.replaceAll("_", " ");
	return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * The column an owner-surfaced kind's own row uses to name a specific
 * candidate owner, read straight from its `row-kind-coverage.toml`
 * classification (`owner_field`, falling back to the owner's own
 * `ROW_KIND_NATURAL_KEY` column — the same rule `ownedFacets` applies).
 * `undefined` when `kind` is not owner-surfaced onto `owner` at all, so a
 * caller reading `undefined` is asking about a join that does not exist
 * rather than one this file forgot to derive.
 */
function ownerJoinField(kind: string, owner: string): string | undefined {
	const classification = rowKindCoverageFor(kind);
	if (classification === undefined) return undefined;
	const candidate = ownerCandidates(classification).find((item) => item.owner === owner);
	if (candidate === undefined) return undefined;
	return candidate.owner_field ?? ROW_KIND_NATURAL_KEY[owner];
}

/**
 * The rows another kind owns, on the page of the row that owns them.
 *
 * Driven entirely by `row-kind-coverage.toml`: a kind classified `surface =
 * "owner"` names the table it belongs to (as one fixed `owner`, or — for a row
 * that belongs to whichever of several kinds it actually names, like
 * `spatial_environment_state` — as `owner_candidates`), and the column linking
 * the two is that owner's own identity column from the kernel — unless the
 * kind authors an `owner_field`, for the few whose own column does not repeat
 * the owner's key name (`actor_capabilities.actor_entity_key`,
 * `place_graph_instances.blueprint_id`). Measured over the SRD corpus, the
 * default rule holds for every owner-surfaced kind that does not author an
 * exception, and resolves completely — 751/751 consequence frame writes,
 * 23/23 roll table entries, 4126/4126 initial state rows. So there is no table
 * of parent columns here and there should never be one; `owner_field` is
 * authored data, not code. A row its owner points AT (a session naming its
 * turn scheduler) authors `named_by`, the owner's column holding this row's
 * natural key, and is joined the other way round.
 *
 * `exclude` skips a table the caller renders itself, which today is only the
 * place graph's map layers: those carry a resolved asset href and are built by
 * hand a few lines below.
 *
 * The facet's reader-facing title is the kind's own authored `label`
 * (row-kind-coverage.toml) when it has one, falling back to the generic
 * prefix-strip rule below. Editorial wording is authored data too — there is
 * no label table here, and the authored title applies on every page the kind
 * is owner-surfaced onto, carrier or not.
 */
function ownedFacets(
	manifest: Record<string, unknown>,
	table: string,
	ref: string,
	exclude: ReadonlySet<string>,
): DocsFacet[] {
	const facets: DocsFacet[] = [];
	for (const owned of rowKindCoverage()) {
		if (owned.surface !== "owner" || exclude.has(owned.kind)) continue;
		let ownedRows: Record<string, unknown>[];
		if (owned.named_by !== undefined) {
			if (owned.owner !== table) continue;
			// The owner names this row, not the other way round: read the owner's
			// own column and match it against the owned kind's natural key.
			const ownerKey = ROW_KIND_NATURAL_KEY[table];
			const namedBy = owned.named_by;
			const ownedKey = ROW_KIND_NATURAL_KEY[owned.kind];
			if (ownerKey === undefined || ownedKey === undefined) continue;
			const named = new Set(
				rows(manifest, table)
					.filter((row) => row[ownerKey] === ref)
					.map((row) => row[namedBy])
					.filter((value) => typeof value === "string" && value !== ""),
			);
			ownedRows = rows(manifest, owned.kind).filter((row) => named.has(row[ownedKey]));
		} else {
			// A kind belongs to one fixed owner, or to whichever of several
			// `owner_candidates` it actually names — either way, only the
			// candidate matching THIS caller's table can ever contribute rows.
			const joinField = ownerJoinField(owned.kind, table);
			if (joinField === undefined) continue;
			ownedRows = rows(manifest, owned.kind).filter((row) => row[joinField] === ref);
		}
		if (ownedRows.length === 0) continue;
		// A child table usually repeats its parent's name (`roll_table_entries` on a
		// roll table, `entity_definition_initial_state` on a definition). On the
		// parent's own page that prefix says nothing, so it comes off: "Entries",
		// "Initial state". Pure string rule, no table of labels — unless the kind
		// authored a deliberate `label` in row-kind-coverage.toml.
		const prefix = `${table.replace(/s$/, "")}_`;
		const label =
			owned.label ??
			facetLabelForTable(
				owned.kind.startsWith(prefix) ? owned.kind.slice(prefix.length) : owned.kind,
			);
		facets.push({
			label,
			rows: ownedRows.map((row) => publicRow(owned.kind, row)),
			table: owned.kind,
			...(owned.public_fields === undefined
				? {}
				: {
						source_digests: ownedRows.map((row) => sourceDigest(owned.kind, row)),
					}),
		});
	}
	return facets;
}

function projectCatalogueFacets(
	manifest: Record<string, unknown>,
	kind: string,
	ref: string,
	assetModuleMounts: Readonly<Record<string, { pathPrefix: string; publicMount: string }>>,
	hasCarrier: boolean,
): DocsFacet[] {
	// An entry with a `DocsSubject`/`DocsResource` carrier already renders its
	// owned rows through that carrier's own facets; adding them here would print
	// every one of them twice on the same page.
	const identity = CATALOGUE_IDENTITIES[kind];
	const owned =
		hasCarrier || identity === undefined
			? []
			: ownedFacets(manifest, identity.table, ref, new Set(["map_layers"]));
	// A trace kind's own page lists every place it marks, read off the trace's
	// own `trace_kind_id` column — the place-node end of the same row renders
	// on the node's place graph page instead, below, because a place node has
	// no page of its own to carry it.
	if (kind === "trace_kind_definition") {
		const traces = rows(manifest, "place_node_traces").filter((row) => row.trace_kind_id === ref);
		if (traces.length > 0)
			owned.push({ label: "Marks these places", rows: traces, table: "place_node_traces" });
	}
	// A niche's own page lists every place it is offered from, read off the
	// niche's own `niche_id` column — the node-attached half of the same row
	// renders on the node's place graph page instead, below.
	if (kind === "niche_definition") {
		const attachments = rows(manifest, "spatial_niche_attachments").filter(
			(row) => row.niche_id === ref,
		);
		if (attachments.length > 0)
			owned.push({
				label: "Attached places",
				rows: attachments,
				table: "spatial_niche_attachments",
			});
	}
	if (kind !== "place_graph") return owned;
	const layers = rows(manifest, "map_layers")
		.filter((row) => row.place_graph_id === ref)
		.map((row) => {
			const module = requiredString(row, "asset_module", `place graph '${ref}' map layer`);
			const path = requiredString(row, "asset_path", `place graph '${ref}' map layer`);
			const segments = path.split("/");
			if (
				path.startsWith("/") ||
				[...path].some(
					(character) =>
						character.charCodeAt(0) < 32 ||
						character.charCodeAt(0) === 127 ||
						"\\:%?#".includes(character),
				) ||
				segments.some((segment) => segment === "" || segment === "." || segment === "..")
			)
				throw new Error(`place graph '${ref}' map layer has an unsafe asset path`);
			const mount = assetModuleMounts[module];
			if (!mount)
				throw new Error(`place graph '${ref}' asset module '${module}' has no public mount`);
			if (!path.startsWith(`${mount.pathPrefix}/`))
				throw new Error(
					`place graph '${ref}' map layer path '${path}' is outside '${mount.pathPrefix}'`,
				);
			const relative = path.slice(mount.pathPrefix.length + 1).split("/");
			return {
				...row,
				asset_href: `${mount.publicMount}/${relative.map(encodeURIComponent).join("/")}`,
			};
		});
	const inGraphEdges = rows(manifest, "place_edges").filter((row) => row.place_graph_id === ref);
	// A cross-map edge carries no `place_graph_id` of its own — it links a node
	// of ONE graph to a node of ANOTHER, so the graph it belongs to has to be
	// read off each end's own node instead. `nodeGraph` is built once from the
	// whole corpus (a cross-map edge's far end lives in a graph this page never
	// filters to), then an edge shows here whenever EITHER end resolves to this
	// page's own graph — which is exactly what makes it show on both endpoint
	// graphs' pages (owner decision, sk-jay0.3.5.76).
	const nodeGraph = new Map<string, string>();
	for (const node of rows(manifest, "place_nodes")) {
		const nodeId = node.node_id;
		const graphId = node.place_graph_id;
		if (typeof nodeId === "string" && typeof graphId === "string") nodeGraph.set(nodeId, graphId);
	}
	// Place nodes render as rows on their graph's page rather than as pages of
	// their own. Metadata targeting a node therefore follows the same node ->
	// graph join as node state and traces below. This keeps generic attachment
	// authoring honest: a map POI, author note, or future public namespace lands
	// beside the node it describes without teaching the reader about individual
	// namespaces.
	const nodeAttachments = rows(manifest, "metadata_attachments").filter(
		(row) =>
			row.target_kind === "place_node" &&
			typeof row.target_ref === "string" &&
			nodeGraph.get(row.target_ref) === ref,
	);
	const crossMapEdges = rows(manifest, "place_edges").filter((row) => {
		if (row.place_graph_id !== "") return false;
		const from = row.from_node_id;
		const to = row.to_node_id;
		return (
			(typeof from === "string" && nodeGraph.get(from) === ref) ||
			(typeof to === "string" && nodeGraph.get(to) === ref)
		);
	});
	// Owner offers/state ride beside whichever edge they name, in-graph or
	// cross-map alike — both kinds are joined by `edge_key` rather than by
	// `place_graph_id`, which neither carries.
	const edgeKeys = new Set(
		[...inGraphEdges, ...crossMapEdges]
			.map((row) => row.edge_key)
			.filter((key): key is string => typeof key === "string"),
	);
	const edgeOffers = rows(manifest, "place_edge_affordance").filter(
		(row) => typeof row.edge_key === "string" && edgeKeys.has(row.edge_key),
	);
	// `spatial_environment_state` is polymorphic (`place_node_id` xor
	// `place_edge_key` xor `location_def_id`, `owner_candidates` in
	// row-kind-coverage.toml). Neither candidate's join column is restated here
	// — `ownerJoinField` reads it off the same classification `ownedFacets`
	// uses, so a candidate that changes its column in the TOML changes what
	// this page reads without a second edit.
	//
	// The edge-keyed candidate (owner `place_edges`) is solved here, beside the
	// edge it names.
	const edgeJoinField = ownerJoinField("spatial_environment_state", "place_edges");
	const edgeState =
		edgeJoinField === undefined
			? []
			: rows(manifest, "spatial_environment_state").filter((row) => {
					const value = row[edgeJoinField];
					return typeof value === "string" && edgeKeys.has(value);
				});
	// The node-keyed candidate (owner `place_nodes`) has no page of its own to
	// land on either — a place node renders as a raw row in the "Place nodes"
	// facet below, not as a subject with facets of its own — so it resolves
	// through the same `nodeGraph` lookup used for cross-map edges and node
	// traces above, onto the graph page that shows the node.
	const nodeJoinField = ownerJoinField("spatial_environment_state", "place_nodes");
	const nodeState =
		nodeJoinField === undefined
			? []
			: rows(manifest, "spatial_environment_state").filter((row) => {
					const value = row[nodeJoinField];
					return typeof value === "string" && value !== "" && nodeGraph.get(value) === ref;
				});
	// The location-keyed candidate (owner `location_definitions`) has zero
	// authored rows across every registered root and no page kind renders one
	// today — `location_definitions` is kernel-registered but unauthored
	// (row-kind-coverage.toml). A row that named one would stay visibly in the
	// overflow basin rather than being credited to a page that cannot show it.
	//
	// A trace and a niche attachment both name their place node directly
	// (`node_id`/`place_node_id`) rather than the graph it belongs to, so the
	// same `nodeGraph` lookup used for cross-map edges above resolves them
	// onto this page. Neither row has a place node page of its own to land on
	// instead. The niche's own end (`niche_id`) renders on the niche's page,
	// above — an edge-attached niche row (`place_edge_id`, no `place_node_id`)
	// never matches here, which is deliberate: it is not a node-owned row.
	const nodeTraces = rows(manifest, "place_node_traces").filter(
		(row) => typeof row.node_id === "string" && nodeGraph.get(row.node_id) === ref,
	);
	const nicheAttachments = rows(manifest, "spatial_niche_attachments").filter(
		(row) =>
			typeof row.place_node_id === "string" &&
			row.place_node_id !== "" &&
			nodeGraph.get(row.place_node_id) === ref,
	);
	const facets: DocsFacet[] = [
		...owned,
		// `asset_href` is resolved from the authored path and is not in the
		// manifest, so it is declared here rather than making every map layer look
		// like a row nobody wrote.
		{ label: "Map layers", rows: layers, table: "map_layers", derived: ["asset_href"] },
		{ label: "Place node metadata", rows: nodeAttachments, table: "metadata_attachments" },
		{ label: "Place node traces", rows: nodeTraces, table: "place_node_traces" },
		{ label: "Niche attachments", rows: nicheAttachments, table: "spatial_niche_attachments" },
		{ label: "Place node state", rows: nodeState, table: "spatial_environment_state" },
		{
			label: "Place nodes",
			rows: rows(manifest, "place_nodes").filter((row) => row.place_graph_id === ref),
			table: "place_nodes",
		},
		{ label: "Place edges", rows: inGraphEdges, table: "place_edges" },
		{ label: "Connections to other maps", rows: crossMapEdges, table: "place_edges" },
		{ label: "Edge offers", rows: edgeOffers, table: "place_edge_affordance" },
		{ label: "Edge state", rows: edgeState, table: "spatial_environment_state" },
	];
	return facets.filter((facet) => facet.rows.length > 0);
}

/**
 * "About this bundle": the root manifest's own `[[bundles]]` row plus the
 * rows it owns (`movement_defaults`, `metadata_namespaces`) and, hosted
 * beside the movement default that names it, any session definition
 * (page-less itself — no section places it) a movement default's
 * `bindings_json` refers to, or an action opens through `session_def_id`.
 *
 * `ownManifest` MUST come from the root's own source tree
 * (`loadFlattened`/`inspectManifest`, never the merged dependency closure
 * every other projection in this file reads): the closure carries every
 * dependency's `[[bundles]]` row too, and this block would otherwise print a
 * dependency's own bundle info on the dependent's root page — the same trap
 * `derivedCatalogueFor` in `metadata-docs-validator.ts` exists to avoid.
 */
function projectBundleInfo(ownManifest: Record<string, unknown>): DocsPageBundle {
	const bundleRows = rows(ownManifest, "bundles");
	if (bundleRows.length !== 1)
		throw new Error(
			`docs root manifest declares ${bundleRows.length} of its own [[bundles]] rows, expected 1`,
		);
	const row = bundleRows[0] ?? {};
	const bundleId = requiredString(row, "bundle_id", "docs root bundle");
	const facets = ownedFacets(ownManifest, "bundles", bundleId, EMPTY);
	// A movement default's own `bindings_json` names the session it opens for
	// over-reach travel (`long_running_move_session`) alongside the reach
	// resource it spends — `namedIds` reads both without knowing the shape,
	// and only a real `session_def_id` ever resolves below.
	const sessionIds = new Set<string>();
	for (const facet of facets) {
		if (facet.table !== "movement_defaults") continue;
		for (const movementRow of facet.rows)
			for (const value of Object.values(movementRow))
				for (const candidate of namedIds(value)) sessionIds.add(candidate);
	}
	// Timed actions also open authored sessions (for example Long Rest).
	// Keep their complete definitions on the owning bundle's page alongside
	// movement sessions, so these rows remain browsable without a session page.
	for (const action of rows(ownManifest, "action_definitions")) {
		if (typeof action.session_def_id === "string" && action.session_def_id !== "")
			sessionIds.add(action.session_def_id);
	}
	const sessions = rows(ownManifest, "session_definitions").filter((session) => {
		const id = session.session_def_id;
		return typeof id === "string" && sessionIds.has(id);
	});
	return {
		ref: bundleId,
		display_name: requiredString(row, "display_name", `bundle '${bundleId}'`),
		author: requiredString(row, "author", `bundle '${bundleId}'`),
		version: requiredString(row, "version", `bundle '${bundleId}'`),
		depends_on: Array.isArray(row.depends_on)
			? row.depends_on.filter((value): value is string => typeof value === "string")
			: [],
		description: typeof row.description === "string" ? row.description : "",
		// The whole authored row, like every other page's record facet: the facts
		// above are a readable subset, and a row only counts as shown when all of
		// it is (allow_flat_tags, the default extent, ...).
		facets: [
			{ label: "Bundle record", rows: [row], table: "bundles" },
			...facets,
			...(sessions.length
				? [{ label: "Session definitions", rows: sessions, table: "session_definitions" }]
				: []),
		],
	};
}

// `FACT_NAMESPACES`/`FACT_VALUE_OVERRIDES`/`FactNamespaceRule` live in
// `srd-sections.ts` — the ONE parse of srd-cc's `sections.toml`, shared with
// `srd-catalogue-listing.ts` and `metadata-docs-validator.ts` (sk-jay0.3.5.59).

/**
 * srd-cc's slim facts residual (sk-jay0.3.5.59, `renderSrdFactsMetadataFragments`
 * in `compendium-metadata.ts`): the 3 of 9 sections (classes, equipment,
 * feats) whose facts have no safe tag counterpart (weapon Range/Property/
 * Mastery, all Cost/Weight/Damage, all armor numbers, plain-item Category,
 * feat Category/Prerequisite, class Hit Die/Caster Type/subclass Class —
 * `docs/catalogue.ts`'s own `equipmentFactsById` header has the full
 * per-row finding). Read directly off each loaded source's OWN
 * `docs_facts_<section>` plain metadata key — deliberately NOT a
 * `catalogue_content`-style schema-validated pointer (no catalogue entry
 * shape to satisfy: this is `{ref, facts}` pairs only, keyed by ref, no
 * `kind`/`family`/`slug`/`title`), the same "second reader of an authored
 * plain key" posture `srd-sections.ts` already uses for `sections.toml`.
 */
function residualFactsIndex(
	loaded: LoadedBundleChain,
): ReadonlyMap<string, readonly { label: string; value: string }[]> {
	const result = new Map<string, readonly { label: string; value: string }[]>();
	for (const source of loaded.sources) {
		const metadata = source.metadata as Record<string, unknown>;
		for (const key of ["docs_facts_classes", "docs_facts_equipment", "docs_facts_feats"]) {
			const namespace = metadata[key];
			if (namespace === null || typeof namespace !== "object") continue;
			const entries = (namespace as Record<string, unknown>).entries;
			if (!Array.isArray(entries)) continue;
			for (const item of entries) {
				if (item === null || typeof item !== "object") continue;
				const ref = (item as Record<string, unknown>).ref;
				const facts = (item as Record<string, unknown>).facts;
				if (typeof ref !== "string" || !Array.isArray(facts)) continue;
				if (result.has(ref)) {
					throw new Error(`docs projection: duplicate facts residual entry for '${ref}'.`);
				}
				result.set(ref, facts as readonly { label: string; value: string }[]);
			}
		}
	}
	return result;
}

/**
 * Every tag a catalogued entity carries, from its own `entity_definition_tag`
 * manifest rows — the raw material for deriving a fact value (below) or a
 * description (`cleanedEntityDescription`), never a copy of either.
 */
function entityTagsFor(manifest: Record<string, unknown>, ref: string): ReadonlySet<string> {
	return new Set(
		rows(manifest, "entity_definition_tag")
			.filter((row) => row.entity_def_id === ref)
			.map((row) => row.tag)
			.filter((tag): tag is string => typeof tag === "string"),
	);
}

/**
 * The ONE tag among `tags` that backs a `fact_namespaces` row's `namespace`
 * — a CHILD of `namespace` (`tag.startsWith(namespace + ".")`), same
 * ambiguity-checked lookup srd-cc's generator used before this derivation
 * moved here (sk-jay0.3.5.54 step 2). Returns `undefined`, not an error,
 * when the entity carries no tag under this namespace at all: a namespace is
 * offered vocabulary, not a requirement every entity must satisfy (see
 * `deriveFactsForEntity`).
 *
 * An entity that carries `namespace` ITSELF, bare (`tags.has(namespace)`),
 * is also skipped rather than matched or treated as ambiguous (sk-jay0.3.5.58,
 * defensive — no declared `fact_namespaces` row currently exercises this
 * branch): a bare namespace tag is that entity's OWN self-identity claim
 * ("this entity IS a member of this family"), never a derivable fact value.
 * `srd.class` is the concrete reason this guard exists even though no row
 * names it: a base-class entity carries `srd.class` bare AND its own
 * `srd.class.<slug>` child, while a subclass carries only the inherited
 * `srd.class.<parentSlug>` — the SAME child shape a class-feature entity's
 * own `srd.class.<classSlug>` linkage tag has. `sections.toml`'s own
 * `fact_namespaces` header deliberately does NOT declare a `srd.class` row
 * for exactly this reason (the subclass "Class" fact stays authored in
 * srd-cc's `catalogue.ts` instead); this guard keeps that choice safe against
 * a future author reaching for the obvious-looking `srd.class` namespace —
 * without it, a base-class entity would throw (2 matches: `srd.class` bare +
 * its own child) instead of silently and correctly deriving nothing.
 */
function factTagForNamespace(
	ref: string,
	namespace: string,
	tags: ReadonlySet<string>,
): string | undefined {
	if (tags.has(namespace)) return undefined;
	const matches = [...tags].filter((tag) => tag.startsWith(`${namespace}.`));
	if (matches.length > 1) {
		throw new Error(
			`docs projection: catalogue entry '${ref}' carries multiple '${namespace}' tags (${matches.join(", ")}); fact derivation is ambiguous.`,
		);
	}
	return matches[0];
}

function titleWord(word: string): string {
	return word.length === 0 ? word : `${word[0]?.toUpperCase() ?? ""}${word.slice(1)}`;
}

/** The tag id's own last dot-segment, split into its `-`/`_`-joined words. */
function tagValueWords(tag: string): string[] {
	const lastDot = tag.lastIndexOf(".");
	const lastSegment = lastDot === -1 ? tag : tag.slice(lastDot + 1);
	return lastSegment.split(/[-_]/u).filter((word) => word.length > 0);
}

/** Apply one `fact_namespaces` row's `derive` rule — see `sections.toml`'s doc comment for the rule vocabulary. */
function deriveFactValueFromRule(tag: string, rule: FactNamespaceRule["derive"]): string {
	const words = tagValueWords(tag);
	switch (rule) {
		case "title":
			return words.map(titleWord).join(" ");
		case "kebab":
			return words.join("-");
		case "sentence":
			return words.map((word, index) => (index === 0 ? titleWord(word) : word)).join(" ");
		case "level": {
			const level = Number(words.join(""));
			return level === 0 ? "Cantrip" : `Level ${level}`;
		}
		case "cr":
			return words.length === 2 ? `${words[0]}/${words[1]}` : (words[0] ?? "");
		case "attunement":
			return words[0] === "required" ? "Requires Attunement" : "No Attunement Required";
		default:
			throw new Error(
				`docs projection: fact tag '${tag}' has unknown derive rule '${rule satisfies never}'.`,
			);
	}
}

function deriveFactValue(tag: string, rule: FactNamespaceRule["derive"]): string {
	return FACT_VALUE_OVERRIDES.get(tag) ?? deriveFactValueFromRule(tag, rule);
}

/**
 * Facts derived from an entity's own tags, one per `fact_namespaces` row
 * (`sections.toml`) whose namespace the entity actually carries a tag under.
 * This is vocabulary-driven, not family-gated: every declared namespace is
 * tried against every entity, regardless of the entity's own catalogue
 * `family` string. A fact is derivable exactly when the entity carries
 * exactly one tag under a namespace — row order (spell/monster/magic-item in
 * `sections.toml` today) gives the stable fact order, so no family key is
 * needed to select "the monster rows" versus "the spell rows"; an SRD
 * monster simply never carries a `srd.spell.*` tag, so those rows silently
 * contribute nothing to it.
 *
 * - **Silent (no fact, no error):** the entity carries no CHILD tag at all
 *   under a declared namespace, whether because it carries none of that
 *   namespace's vocabulary (a spell has no `srd.size.*` tag) or because it
 *   carries the namespace's own BARE tag instead (its self-identity claim,
 *   never a value — `factTagForNamespace`'s own doc comment). There is
 *   nothing to restate either way.
 * - **Throws:** the entity carries more than one CHILD tag under the same
 *   declared namespace (e.g. two `srd.cr.*` tags). That is not missing
 *   vocabulary, it is a contradiction in the entity's own authored tags, so
 *   it fails loudly rather than picking one silently (`factTagForNamespace`
 *   above).
 *
 * Weapon Category (`srd.weapon.category`) is the one equipment/feat/class
 * fact that DOES route here (sk-jay0.3.5.59); everything else in those 3
 * families has no tag counterpart (or, for feat Category, hits the
 * self-identity guard above) and comes from the facts residual instead —
 * see `residualFactsIndex` and its own call site below.
 */
function deriveFactsForEntity(
	manifest: Record<string, unknown>,
	ref: string,
): Array<{ label: string; value: string; tag: string }> {
	const tags = entityTagsFor(manifest, ref);
	const facts: Array<{ label: string; value: string; tag: string }> = [];
	for (const rule of FACT_NAMESPACES) {
		const tag = factTagForNamespace(ref, rule.namespace, tags);
		if (tag === undefined) continue;
		facts.push({ label: rule.label, value: deriveFactValue(tag, rule.derive), tag });
	}
	return facts;
}

/** A raw monster `entity_definitions.description` is a plain type string ("Dragon (Chromatic)") with no markup — sk-jay0.3.5.47. Kept for parity with the OTHER families' markup guard below; monsters never hit it in practice. */
function plainMonsterSummary(value: string): string | undefined {
	const summary = value.split(/(?:\*\*|<br\b[^>]*>)/iu, 1)[0]?.trim();
	if (summary === "" || summary === undefined || /[-,:;]\s*$/u.test(summary)) return undefined;
	return summary;
}

function factsSummary(
	facts: readonly { label: string; value: string }[] | undefined,
): string | undefined {
	if (facts === undefined || facts.length === 0) return undefined;
	return facts.map(({ label, value }) => `${label}: ${value}`).join(" · ");
}

function fallbackPlainSourceSummary(value: string): string | undefined {
	const firstLine = value
		.replace(/<br\b[^>]*>/giu, "\n")
		.replace(/\*\*/gu, "")
		.split(/\r?\n/u, 1)[0]
		?.trim()
		.replace(/[-,:;]\s*$/u, "")
		.trim();
	return firstLine === "" || firstLine === undefined ? undefined : firstLine;
}

/**
 * A catalogued entity's own raw manifest description may still carry
 * runtime markup (some spells/magic items) — pick a plain one-line summary
 * instead of showing markup raw, same rule srd-cc's generator used before
 * this moved to projection time (sk-jay0.3.5.54 step 2).
 */
function cleanedEntityDescription(
	raw: string,
	family: string,
	facts: readonly { label: string; value: string }[],
): string {
	if (!/(?:\*\*|<br\b)/iu.test(raw)) return raw;
	const cleaned =
		(family === "monster" ? plainMonsterSummary(raw) : undefined) ??
		factsSummary(facts) ??
		fallbackPlainSourceSummary(raw);
	if (cleaned === undefined) {
		throw new Error(
			`docs projection: family '${family}' description has markup with no derivable one-line summary.`,
		);
	}
	return cleaned;
}

function projectCatalogueEntry(
	manifest: Record<string, unknown>,
	entry: {
		kind: string;
		ref: string;
		family: string;
		slug: string;
		title?: string;
		description?: string;
		facts?: ReadonlyArray<{ label: string; value: string; tag?: string }>;
		tags?: readonly string[];
		source?: DocsSource;
	},
	sectionHref: string,
	artifactHref: string,
	assetMounts: Readonly<Record<string, string>>,
	assetModuleMounts: Readonly<Record<string, { pathPrefix: string; publicMount: string }>>,
	linkTargets: readonly DocsLinkTarget[],
	residualFacts: ReadonlyMap<string, readonly { label: string; value: string }[]>,
): DocsCatalogueEntry {
	const identity = CATALOGUE_IDENTITIES[entry.kind];
	if (!identity)
		throw new Error(`catalogue kind '${entry.kind}' is not supported by the docs consumer`);
	const matches = rows(manifest, identity.table).filter(
		(row) => row[identity.idField] === entry.ref,
	);
	// Authoring is upsert-by-key, so one subject may be DECLARED by several
	// identical rows: `srd/attack_roll` is declared as a modifier target in all
	// nine class files that adjust it, and `srd/str` in two. That is
	// re-declaration, not ambiguity, and it must not cost the subject its page.
	// Rows that share a key but DIFFER still throw — that is a real conflict,
	// and the reader has no way to choose between them.
	if (matches.length === 0)
		throw new Error(`catalogue ${entry.kind} ref '${entry.ref}' resolves to 0 rows`);
	// Where they differ, the reader shows what the WORLD ends up with: the
	// server commits these in declaration order and a later row overwrites the
	// earlier, so folding them the same way reproduces the runtime record
	// rather than inventing a fourth answer. `srd/speed-walk` is declared six
	// times with two different display names — a real authoring conflict
	// (sk-jay0.3.5.68.4 filed it), but one the reader must survive rather than
	// crash on, and showing the losing name would be worse than showing none.
	const record =
		matches.length === 1
			? (matches[0] ?? {})
			: matches.reduce<Record<string, unknown>>((folded, row) => {
					for (const [field, value] of Object.entries(row))
						if (value !== "" && value !== undefined) folded[field] = value;
					return folded;
				}, {});
	assertSafeIntegers(record, `catalogue ${entry.kind} '${entry.ref}'`);
	const href = `${sectionHref}/${entry.slug}`;
	const resource =
		entry.kind === "resource_definition"
			? projectResource(manifest, entry.ref, href, linkTargets)
			: undefined;
	const subject =
		entry.kind === "entity_definition" || entry.kind === "entity"
			? projectSubject(manifest, entry.kind, entry.ref, href, assetMounts, linkTargets)
			: undefined;
	// A `DocsResource`/`DocsSubject` carrier already ships its own attachments
	// (`resource.attachments`/`subject.attachments`); every other catalogue kind
	// has nowhere else to carry `metadata_attachments` rows targeting it directly
	// (a place graph's `place.note`, an affordance template's
	// `ui.affordance_group`) — sk-jay0.3.5.76.
	const attachments =
		resource === undefined && subject === undefined
			? projectAttachments(manifest, entry.kind, entry.ref, assetMounts, true, linkTargets)
			: undefined;
	const displayName =
		entry.title ??
		resource?.display_name ??
		subject?.display_name ??
		requiredString(
			{ display_name: record.display_name },
			"display_name",
			`catalogue ${entry.kind} '${entry.ref}' presentation`,
		);
	// `entry.facts` (a foreign, non-SRD bundle authoring facts directly
	// inline on its own catalogue entry) always wins outright when present —
	// no real SRD entry sets it any more (sk-jay0.3.5.59: the derived
	// listing never carries facts at all). Otherwise: tag-derived facts
	// FIRST, then the typed residual (`residualFactsIndex`) appended after —
	// this order matters, not just for spell/monster/magic-item (which have
	// no residual, so this is simply the full set), but for weapon Category:
	// it derives now, and prepending it ahead of the untouched residual
	// (Damage/Range/Cost/Weight/Property/Mastery, in original assignment
	// order) reproduces the exact served order Category always had — first.
	const facts = entry.facts ?? [
		...deriveFactsForEntity(manifest, entry.ref),
		...(residualFacts.get(entry.ref) ?? []),
	];
	// A description is optional. Demanding one used to be harmless because the
	// only catalogued kinds all carried the column; it is wrong now. Measured
	// over the corpus: `affordance_templates` has no description column at all
	// (417 of 417 rows), `outcome_templates` carries one on 7 of 415, and 40
	// action_definitions leave it empty. Those rows still deserve a page — the
	// component renders their fields — and a missing description is a content
	// gap to fix in the fixtures, not a reason to fail the whole projection.
	const description =
		entry.description ??
		resource?.description ??
		(subject === undefined
			? undefined
			: cleanedEntityDescription(subject.description, entry.family, facts)) ??
		(typeof record.description === "string" && record.description.length > 0
			? record.description
			: undefined);
	// `tag_value_definitions` carries no `display_name` column, so its label is
	// always `entry.title` (compiler-derived — see `tagLabelFromId` in
	// srd-cc's `docs/catalogue.ts`); `displayName`/`description` above are
	// already resolved by the time this runs.
	const tag: DocsTag | undefined =
		entry.kind === "tag_value_definition"
			? {
					ref: entry.ref,
					bundle_id: requiredString(record, "bundle_id", `catalogue ${entry.kind} '${entry.ref}'`),
					display_name: displayName,
					description: description ?? "",
					href,
				}
			: undefined;
	const art = subject?.attachments
		.filter((attachment) => attachment.asset_href)
		.toSorted((left, right) =>
			String(left.payload.path).localeCompare(String(right.payload.path)),
		)[0];
	const facets = projectCatalogueFacets(
		manifest,
		entry.kind,
		entry.ref,
		assetModuleMounts,
		resource !== undefined || subject !== undefined,
	);
	// Relations start unresolved: catalogueRelations only knows the typed identity
	// (kind/ref/label), not a route. A relation gets its href, and a trimmed
	// resource/subject card, from whichever catalogue entry across the whole
	// index shares that identity — resolved once every page is projected, see
	// the "resolve catalogue-relation hrefs" pass below `buildMetadataDocsIndex`.
	// This is deliberately independent of `linkTargets`/`resolvedLinks`, which
	// drive prose linkification inside article/attachment Markdown and cover
	// only a curated subset (ability scores, long entity labels): reusing that
	// narrower list here left most relations (e.g. AC, HP, XP value) without a
	// href even though every one of them has its own catalogue page.
	const relations = catalogueRelations(manifest, { kind: entry.kind, ref: entry.ref });
	// The authored order a family's own resource values are shown in
	// (`sections.toml`'s `resource_blocks`/`resource_groups`). Projected onto the
	// entry rather than read by the reader: `srd-sections.ts` reads that file with
	// `node:fs` and only ever runs here — see `srd-catalogue-groups.ts`'s header
	// for the same division and the blank page that taught it.
	const resourceBlockRules = resourceBlockFor(entry.family);
	const resourceBlock =
		resourceBlockRules === undefined
			? undefined
			: {
					heading: resourceBlockRules.heading,
					rest_title: resourceBlockRules.rest_title,
					groups: resourceGroupsFor(entry.family).map((group) => ({
						title: group.title,
						resources: [...group.resources],
					})),
				};
	const provenance = catalogueProvenanceCandidates(manifest, { kind: entry.kind, ref: entry.ref });
	const tags = [...new Set([...(resource?.tags ?? subject?.tags ?? []), ...(entry.tags ?? [])])];
	return {
		kind: entry.kind,
		ref: entry.ref,
		family: entry.family,
		slug: entry.slug,
		display_name: displayName,
		// The emitted artifact keeps `description` required; a row whose table
		// carries no description column emits the empty string and renders none.
		description: description ?? "",
		href,
		artifact_href: artifactHref,
		// Copied out of the authored/derived entry: the catalogue source is
		// readonly, the emitted artifact type is not.
		facts: [...facts],
		tags: [...tags],
		...(entry.source ? { source: entry.source } : {}),
		...(art?.asset_href
			? {
					art: {
						href: art.asset_href,
						path: requiredString(art.payload, "path", `catalogue ${entry.kind} '${entry.ref}' art`),
						hash: requiredString(art.payload, "hash", `catalogue ${entry.kind} '${entry.ref}' art`),
						license: requiredString(
							art.payload,
							"license",
							`catalogue ${entry.kind} '${entry.ref}' art`,
						),
					},
				}
			: {}),
		record,
		...(facets.length ? { facets } : {}),
		...(resourceBlock ? { resource_block: resourceBlock } : {}),
		...(relations.length ? { relations } : {}),
		...(provenance.length ? { provenance } : {}),
		...(resource ? { resource } : {}),
		...(subject ? { subject } : {}),
		...(tag ? { tag } : {}),
		...(attachments?.length ? { attachments } : {}),
	};
}

export function buildDocsSearchIndex(index: DocsIndexV1): DocsSearchEntry[] {
	const rows: DocsSearchEntry[] = [];
	const ids = new Set<string>();
	const add = (row: DocsSearchEntry) => {
		if (ids.has(row.id)) throw new Error(`docs search identity '${row.id}' is duplicated`);
		ids.add(row.id);
		rows.push(row);
	};
	for (const page of index.pages) {
		for (const section of page.sections) {
			for (const item of section.catalogue ?? []) {
				const entry = item as DocsCatalogueEntry;
				const tags = entry.tags ?? [];
				const attachmentText = [entry.resource, entry.subject]
					.flatMap((subject) => subject?.attachments ?? [])
					.flatMap((attachment) =>
						typeof attachment.rendered_text === "string"
							? [attachment.rendered_text]
							: typeof attachment.payload.text === "string"
								? [attachment.payload.text]
								: [],
					);
				add({
					id: `${entry.kind}:${entry.ref}:${entry.href}`,
					ref: entry.ref,
					name: entry.display_name,
					kind: entry.family,
					corpus_label: page.title,
					chapter: section.id,
					slug: entry.slug,
					tags,
					search_text: [
						entry.display_name,
						entry.description,
						entry.family,
						...tags,
						...entry.facts.flatMap(({ label, value }) => [label, value]),
						...attachmentText,
					]
						.join(" ")
						.toLowerCase(),
					art_thumb: entry.art?.path ?? null,
					has_art: entry.art !== undefined,
					href: entry.href,
				});
			}
			for (const item of section.documents ?? []) {
				// A document always owns its own route, unlike an article
				// (sk-jay0.7.93) — `href` is required here, not inherited as
				// optional from `DocsArticle`.
				const document = item as DocsArticle & {
					href: string;
					ref: string;
					slug: string;
					family: string;
					tags?: string[];
				};
				add({
					id: `document:${document.ref}:${document.href}`,
					ref: document.ref,
					name: document.title,
					kind: document.family,
					corpus_label: page.title,
					chapter: section.id,
					slug: document.slug,
					tags: document.tags ?? [],
					search_text: `${document.title} ${document.family} ${section.title} ${
						(document.blocks ?? [])
							.filter((block) => block.kind === "html")
							.map((block) => block.html)
							.join(" ") || document.body
					}`.toLowerCase(),
					art_thumb: null,
					has_art: false,
					href: document.href,
				});
			}
			for (const item of section.pages ?? []) {
				const article = item as DocsArticle;
				if (article.featured_reference !== undefined) continue;
				add({
					id: `article:${page.page_id}:${section.id}:${article.id}`,
					ref: article.id,
					name: article.title,
					kind: "article",
					corpus_label: page.title,
					chapter: section.id,
					slug: article.id,
					tags: [],
					search_text: `${article.title} ${section.title} ${
						(article.blocks ?? [])
							.filter((block) => block.kind === "html")
							.map((block) => block.html)
							.join(" ") || article.body
					}`.toLowerCase(),
					art_thumb: null,
					has_art: false,
					// Non-null: the `continue` above skips featured articles, the
					// only ones without an href (sk-jay0.7.93).
					href: article.href!,
				});
			}
		}
	}
	return rows.sort((left, right) => left.id.localeCompare(right.id));
}

function rows(manifest: Record<string, unknown>, table: string): Record<string, unknown>[] {
	return Array.isArray(manifest[table]) ? (manifest[table] as Record<string, unknown>[]) : [];
}

function assertSafeIntegers(value: unknown, context: string): void {
	if (typeof value === "number" && Number.isInteger(value) && !Number.isSafeInteger(value)) {
		throw new Error(`${context} contains an integer outside the safe JSON range`);
	}
	if (Array.isArray(value))
		value.forEach((item) => {
			assertSafeIntegers(item, context);
		});
	else if (value !== null && typeof value === "object") {
		Object.values(value).forEach((item) => {
			assertSafeIntegers(item, context);
		});
	}
}

/**
 * The `audience` a namespace is registered with (`metadata_namespaces`), or
 * `undefined` when unregistered. Looked up by namespace alone: a namespace
 * string has exactly one owning bundle, and that owner is often a dependency
 * of the bundle writing the attachment, so matching on the attachment's own
 * `bundle_id` would miss it (packages/spellkave-world-author/docs/
 * metadata-attachments.md, "Namespace Registry"). Read per attachment rather
 * than hand-listing which namespaces are non-public — the reader labels
 * whatever the manifest itself declares (sk-jay0.3.5.76). The public
 * compendium keeps showing every attachment regardless of audience
 * (sk-jay0.3.5.77 closed the earlier proposal to hide non-public ones); this
 * only decides what LABEL a shown attachment wears (`audience-label.ts`,
 * `AttachmentBlock.svelte`).
 */
function namespaceAudience(
	manifest: Record<string, unknown>,
	namespace: string,
): string | undefined {
	const audience = rows(manifest, "metadata_namespaces").find(
		(row) => row.namespace === namespace,
	)?.audience;
	return typeof audience === "string" ? audience : undefined;
}

function projectAttachments(
	manifest: Record<string, unknown>,
	// `DocsSubjectKind | "resource_definition"` for the two carrier kinds, or
	// any other catalogue `kind` (place_graph, affordance_template, ...) for a
	// carrier-less entry's own attachments — widened to `string` because a
	// carrier-less entry's `kind` is open-ended, not one of the typed carriers.
	targetKind: string,
	ref: string,
	assetMounts: Readonly<Record<string, string>>,
	projectArt = false,
	linkTargets: readonly DocsLinkTarget[] = [],
): DocsAttachment[] {
	const identities = new Set<string>();
	return rows(manifest, "metadata_attachments")
		.filter((row) => row.target_kind === targetKind && row.target_ref === ref)
		.map((attachment) => {
			const bundleId = requiredString(attachment, "bundle_id", `${targetKind} '${ref}' attachment`);
			const namespace = requiredString(
				attachment,
				"namespace",
				`${targetKind} '${ref}' attachment`,
			);
			const identity = `${bundleId}:${namespace}`;
			if (identities.has(identity))
				throw new Error(`${targetKind} '${ref}' has ambiguous attachment identity '${identity}'`);
			identities.add(identity);
			let payload: unknown;
			try {
				payload = JSON.parse(String(attachment.payload_json));
			} catch {
				throw new Error(`${targetKind} '${ref}' has invalid attachment JSON`);
			}
			if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
				throw new Error(`${targetKind} '${ref}' attachment payload must be an object`);
			}
			assertSafeIntegers(payload, `${targetKind} '${ref}' attachment`);
			const renderedText =
				typeof recordOf(payload).text === "string"
					? renderAttachmentMarkdown(recordOf(payload).text as string, linkTargets, {
							kind: targetKind,
							ref,
						})
					: undefined;
			let assetHref: string | undefined;
			if (namespace === `${bundleId}.art.image`) {
				const data = recordOf(payload);
				for (const field of ["path", "hash", "license"])
					requiredString(data, field, `${targetKind} '${ref}' art attachment`);
				const path = data.path as string;
				if (!/^[a-f0-9]{64}$/.test(data.hash as string))
					throw new Error(`${targetKind} '${ref}' art attachment has an invalid SHA-256 hash`);
				const segments = path.split("/");
				if (
					path.startsWith("/") ||
					[...path].some(
						(character) =>
							character.charCodeAt(0) < 32 ||
							character.charCodeAt(0) === 127 ||
							"\\:%?#".includes(character),
					) ||
					segments.some((segment) => segment === "" || segment === "." || segment === "..") ||
					!/\.(?:avif|gif|jpe?g|png|webp)$/i.test(path)
				) {
					throw new Error(`${targetKind} '${ref}' art attachment has an unsafe image path`);
				}
				const [prefix, ...rest] = path.split("/");
				const mount = prefix ? assetMounts[prefix] : undefined;
				if (projectArt) {
					const registrations = rows(manifest, "metadata_namespaces").filter(
						(row) =>
							row.bundle_id === bundleId &&
							row.namespace === namespace &&
							row.audience === "public",
					);
					if (registrations.length !== 1)
						throw new Error(
							`${targetKind} '${ref}' art namespace '${namespace}' must have one public registration`,
						);
					if (!mount)
						throw new Error(
							`${targetKind} '${ref}' art path prefix '${String(prefix)}' has no public asset mount`,
						);
					assetHref = `${mount}/${rest.map(encodeURIComponent).join("/")}`;
				}
			}
			const audience = namespaceAudience(manifest, namespace);
			return {
				bundle_id: bundleId,
				namespace,
				...(typeof attachment.source === "string" ? { source: attachment.source } : {}),
				payload: recordOf(payload),
				...(renderedText ? { rendered_text: renderedText } : {}),
				...(assetHref ? { asset_href: assetHref } : {}),
				// "public"/"Public" is the unlabelled default; only a non-public
				// registration is worth carrying, so the reader has something to show
				// a marker for (`describeAttachmentAudience` in `audience-label.ts`).
				...(audience && audience.toLowerCase() !== "public" ? { audience } : {}),
			};
		});
}

function projectSubject(
	manifest: Record<string, unknown>,
	kind: DocsSubjectKind,
	ref: string,
	href: string,
	assetMounts: Readonly<Record<string, string>>,
	linkTargets: readonly DocsLinkTarget[] = [],
): DocsSubject {
	const table = kind === "entity_definition" ? "entity_definitions" : "entities";
	const idField = kind === "entity_definition" ? "entity_def_id" : "entity_key";
	const matches = rows(manifest, table).filter((row) => row[idField] === ref);
	if (matches.length !== 1)
		throw new Error(`${kind} ref '${ref}' resolves to ${matches.length} rows`);
	const row = matches[0] ?? {};
	const bundleId = requiredString(row, "bundle_id", `${kind} '${ref}'`);
	const related = (tableName: string, field: string) =>
		rows(manifest, tableName).filter((item) => item[field] === ref);
	const tagTable = kind === "entity_definition" ? "entity_definition_tag" : "entity_tag";
	const tagField = kind === "entity_definition" ? "entity_def_id" : "entity_key";
	const equipmentLinks = related("entity_definition_equip_modifier", "entity_def_id");
	const modifierIds = new Set(equipmentLinks.map((item) => item.modifier_template_id));
	for (const modifierId of modifierIds) {
		const count = rows(manifest, "modifier_templates").filter(
			(item) => item.modifier_template_id === modifierId,
		).length;
		if (count !== 1)
			throw new Error(
				`entity_definition '${ref}' modifier '${String(modifierId)}' resolves to ${count} definitions`,
			);
	}
	// The bulk of each subject's facets are derived straight from
	// row-kind-coverage.toml's `surface = "owner"` rows through `ownedFacets` —
	// no join column is restated here, so a kind that changes its owner column
	// in the classification changes what this page reads without a second edit.
	// What is left hand-written below is exactly what the classification cannot
	// express: a second hop from an already-owned join row to what it points at
	// (`modifier_templates`, via `entity_definition_equip_modifier`), an edge
	// reachable from BOTH its ends (`entity_containment`, `surface = "relation"`
	// in the classification — relations are never owner-joined, by definition),
	// and the subject's own record, which is not owned by itself.
	const facets: DocsFacet[] =
		kind === "entity_definition"
			? [
					...ownedFacets(manifest, "entity_definitions", ref, EMPTY),
					{
						label: "Modifier definitions",
						rows: rows(manifest, "modifier_templates").filter((item) =>
							modifierIds.has(item.modifier_template_id),
						),
						table: "modifier_templates",
					},
					{ label: "Definition record", rows: [row], table: "entity_definitions" },
				]
			: [
					...ownedFacets(manifest, "entities", ref, EMPTY),
					// `entity_containment` names both ends by their own column
					// (`entity_key` the contained thing, `container_entity_key` the
					// container), so the same row renders once on each entity's page —
					// whichever half's column equals this entity. Classified
					// `surface = "relation"`, so `ownedFacets` (owner-surfaced rows
					// only) never reaches it; both ends are read directly instead.
					{
						label: "Contains",
						rows: related("entity_containment", "container_entity_key"),
						table: "entity_containment",
					},
					{
						label: "Contained in",
						rows: related("entity_containment", "entity_key"),
						table: "entity_containment",
					},
					// Equipment is a relation: both the actor wearing it and the
					// item being worn expose the same authored row.
					{
						label: "Equipment",
						rows: related("actor_equipment_slots", "actor_entity_key"),
						table: "actor_equipment_slots",
					},
					{
						label: "Equipped by",
						rows: related("actor_equipment_slots", "item_key"),
						table: "actor_equipment_slots",
					},
					{ label: "Instance record", rows: [row], table: "entities" },
				];
	const populated = facets.filter((facet) => facet.rows.length > 0);
	assertSafeIntegers(populated, `${kind} '${ref}' related rows`);
	return {
		kind,
		ref,
		bundle_id: bundleId,
		display_name: requiredString(
			row,
			kind === "entity_definition" ? "display_name" : "name",
			`${kind} '${ref}'`,
		),
		description: requiredString(row, "description", `${kind} '${ref}'`),
		href,
		...(kind === "entity" && typeof row.entity_def_id === "string"
			? { definition_ref: row.entity_def_id }
			: {}),
		tags: related(tagTable, tagField).map((tag) =>
			requiredString(tag, "tag", `${kind} '${ref}' tag`),
		),
		attachments: projectAttachments(manifest, kind, ref, assetMounts, true, linkTargets),
		facets: populated,
	};
}

function projectResource(
	manifest: Record<string, unknown>,
	ref: string,
	href: string,
	linkTargets: readonly DocsLinkTarget[] = [],
): DocsResource {
	const definitions = Array.isArray(manifest.resource_definitions)
		? (manifest.resource_definitions as Record<string, unknown>[])
		: [];
	const definition = definitions.filter((row) => row.resource_definition_id === ref);
	if (definition.length !== 1) {
		throw new Error(`resource ref '${ref}' resolves to ${definition.length} resource definitions`);
	}
	const row = definition[0] ?? {};
	for (const field of ["min_value", "max_value", "initial_value"] as const) {
		const value = row[field];
		if (typeof value === "number" && !Number.isSafeInteger(value)) {
			throw new Error(`resource '${ref}' field '${field}' is not a safe integer`);
		}
	}
	const tags = Array.isArray(manifest.resource_definition_tag)
		? (manifest.resource_definition_tag as Record<string, unknown>[])
				.filter((tag) => tag.resource_definition_id === ref && typeof tag.tag === "string")
				.map((tag) => tag.tag as string)
		: [];
	const attachments = projectAttachments(
		manifest,
		"resource_definition",
		ref,
		{},
		false,
		linkTargets,
	);
	return {
		ref,
		bundle_id: requiredString(row, "bundle_id", `resource '${ref}'`),
		display_name: requiredString(row, "display_name", `resource '${ref}'`),
		description: requiredString(row, "description", `resource '${ref}'`),
		value_kind: requiredString(row, "value_kind", `resource '${ref}'`),
		...(typeof row.min_value === "number" ? { min_value: row.min_value } : {}),
		...(typeof row.max_value === "number" ? { max_value: row.max_value } : {}),
		...(typeof row.initial_value === "number" ? { initial_value: row.initial_value } : {}),
		...(typeof row.recovery_rule === "string" ? { recovery_rule: row.recovery_rule } : {}),
		href,
		tags,
		attachments,
	};
}

/**
 * Strips attachments/facets/tags from a relation's embedded resource so a compact
 * `ResourceView` card can render (title, description, href, numeric facts) without
 * duplicating the target's full attachment payload into every referencing entry.
 * Some resource attachments carry rendered markdown; multiplied across ~13
 * relations per creature and 300+ creatures this would bloat every catalogue file.
 */
function trimRelationResource(resource: DocsResource): DocsResource {
	return { ...resource, tags: [], tag_links: [], attachments: [] };
}

/**
 * Strips attachments/facets/tags from a relation's embedded subject so a compact
 * `SubjectView` card can render (title, description, href) without duplicating the
 * target's full facets/attachments. Some entity_definition subjects (e.g. spellbooks,
 * class definitions) carry attachments up to ~90 KB; embedding those unfiltered into
 * every creature that equips them would multiply the catalogue payload many times over.
 * Trade-off: the compact card loses its art thumbnail and "Equipment" fact badge,
 * both of which are sourced from attachments/facets.
 */
function trimRelationSubject(subject: DocsSubject): DocsSubject {
	return { ...subject, tags: [], tag_links: [], attachments: [], facets: [] };
}

/** `### Adult Black Dragon` -> `srd/creature/adult-black-dragon`, in source order. */
function headingRefs(body: string, pattern: string): string[] {
	return [...body.matchAll(/^### (.+)$/gm)].map((match) =>
		pattern.replace(
			"{slug}",
			(match[1] ?? "")
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/^-|-$/g, ""),
		),
	);
}

/**
 * Gives each article the authored catalogue lists it closes with.
 *
 * A chapter prints a table of rules this bundle also defines as executable
 * entries, and the reader has no way from one to the other: the SRD's Actions
 * table names twelve actions that all exist here as capabilities, the Weapons
 * table thirty-eight weapons, the Skills table eighteen skills. Those tables
 * arrive as raw source HTML, which the prose linker treats as opaque so it
 * never nests an anchor inside one. The tables therefore stay exactly as the
 * SRD printed them, and the lists go underneath.
 *
 * Which entries belong under which chapter is editorial and lives in srd-cc's
 * `sections.toml` (`article_catalogue_lists`); this only resolves it to routes.
 * An authored row either names its entries (`refs`, in the order the chapter
 * prints them) or derives them from a ref prefix, which is the better form
 * wherever a prefix is exactly the set — a weapon authored tomorrow then
 * reaches the reader without anyone remembering to edit the list. `family`
 * narrows a prefix that spans families: `srd/armor/` names thirteen armors and
 * thirteen modifiers.
 *
 * It runs after the whole page is projected because a chapter names entries
 * from other sections — the Actions chapter sits in `playing-the-game` and its
 * twelve capabilities in `mechanics`.
 */
function attachArticleCatalogueLists(page: DocsPage): void {
	const entries: DocsCatalogueEntrySummary[] = [];
	const byRef = new Map<string, DocsCatalogueEntrySummary[]>();
	for (const section of page.sections)
		for (const entry of section.catalogue ?? []) {
			entries.push(entry);
			byRef.set(entry.ref, [...(byRef.get(entry.ref) ?? []), entry]);
		}

	const reference = (entry: DocsCatalogueEntrySummary): DocsRowEntryReference => ({
		ref: entry.ref,
		title: entry.display_name,
		...(entry.href ? { href: entry.href } : {}),
		...(entry.description ? { summary: firstSentence(entry.description) } : {}),
	});

	for (const section of page.sections)
		for (const summary of section.pages ?? []) {
			// A featured article IS a catalogue entry under another name, and a
			// list naming the entry the reader is already on says nothing. Only
			// prose chapters close with one.
			if (summary.featured_reference !== undefined) continue;
			const rules = articleCatalogueListsFor(section.id, summary.id);
			if (rules.length === 0) continue;
			// `pages` is typed as summaries; a projected page carries whole
			// articles, and this runs only on the projected page.
			const article = summary as DocsArticle;
			article.catalogue_lists = rules
				.map((rule) => {
					const where = `article '${section.id}/${summary.id}' list '${rule.title}'`;
					const forms = [rule.refs, rule.ref_prefix, rule.tag, rule.from_headings].filter(
						(form) => form !== undefined,
					).length;
					if (forms > 1) throw new Error(`${where} names more than one way to choose its entries`);
					if (rule.from_headings !== undefined) {
						// The chapter's own headings, in the order it prints them. A
						// converted chapter (its stat blocks replaced by embedded
						// subjects) has none left and simply gets no list.
						const found = headingRefs(article.body, rule.from_headings).map((ref) => {
							const matches = byRef.get(ref) ?? [];
							const entry = matches[0];
							if (matches.length !== 1 || entry === undefined)
								throw new Error(
									`${where} derives '${ref}' from a heading, matching ${matches.length} catalogue entries`,
								);
							return reference(entry);
						});
						return { title: rule.title, entries: found };
					}
					if (rule.refs !== undefined)
						return {
							title: rule.title,
							entries: rule.refs.map((ref) => {
								// One id can name several subjects (`srd/ac` names two), so
								// an ambiguous ref is an authoring error, never a silent
								// first match.
								const found = byRef.get(ref) ?? [];
								const entry = found[0];
								if (found.length !== 1 || entry === undefined)
									throw new Error(
										`${where} names '${ref}', which matches ${found.length} catalogue entries`,
									);
								return reference(entry);
							}),
						};
					const { ref_prefix: prefix, tag } = rule;
					if (prefix === undefined && tag === undefined)
						throw new Error(`${where} names no way to choose its entries`);
					const derived = entries
						.filter(
							(entry) =>
								(prefix === undefined || entry.ref.startsWith(prefix)) &&
								(tag === undefined || (entry.tags ?? []).includes(tag)) &&
								(rule.family === undefined || entry.family === rule.family),
						)
						.sort((left, right) => left.display_name.localeCompare(right.display_name));
					// A rule that has stopped matching is a silent empty section on a
					// published page, so it fails here instead.
					if (derived.length === 0)
						throw new Error(`${where} derives nothing from '${prefix ?? tag}'`);
					return { title: rule.title, entries: derived.map(reference) };
				})
				.filter((list) => list.entries.length > 0);
		}
}

export function buildMetadataDocsIndex(
	roots: readonly DocsProjectionRoot[],
	corpus?: InspectedDocsCorpus,
): DocsIndexV1 {
	const pagesById = new Map<string, DocsPage>();
	const sourceByPageId = new Map<string, string>();
	const occupiedRoutes = new Map<string, string>();
	const mountByRootPath = new Map<string, string>();
	const registeredRootPaths = new Set(roots.map((root) => resolve(root.rootManifestPath)));
	/** Every `tag_capability_grant` row across every loaded root, resolved below. */
	const capabilityGrants: Array<{ tag: string; capability: string }> = [];
	/**
	 * Every authored entity definition, with the manifest that holds it.
	 *
	 * Read far below, once every page is known, to inline the ones that get no
	 * page of their own onto the page that names them.
	 */
	const definitionsById = new Map<
		string,
		{
			manifest: Record<string, unknown>;
			row: Record<string, unknown>;
			assetMounts: Readonly<Record<string, string>>;
		}
	>();
	/**
	 * Hosted families, keyed by the entity whose page hosts them.
	 *
	 * Driven by `[[entity_owner_routes]]`: a family with no page of its own,
	 * whose parent is named in the payload of its own metadata attachment.
	 */
	const hostedByOwner = new Map<
		string,
		Map<
			string,
			{
				definitions: Record<string, unknown>[];
				attachments: Record<string, unknown>[];
				seen: Set<string>;
			}
		>
	>();
	for (const root of roots) {
		const rootPath = resolve(root.rootManifestPath);
		const mount = root.mount;
		if (mount === undefined) continue;
		const previous = mountByRootPath.get(rootPath);
		if (previous !== undefined && previous !== mount) {
			throw new Error(
				`manifest '${rootPath}' has contradictory docs mounts '${previous}' and '${mount}'`,
			);
		}
		mountByRootPath.set(rootPath, mount);
	}
	for (const root of roots) {
		const inspected = inspectRoot(root, corpus);
		if (inspected.diagnostics.length > 0) {
			throw new Error(inspected.diagnostics.map((row) => `${row.path}: ${row.message}`).join("\n"));
		}
		const rootPath = resolve(root.rootManifestPath);
		if (!inspected.pages.some((item) => resolve(item.path) === rootPath)) {
			throw new Error(`${rootPath} does not declare required metadata.docs for the docs registry`);
		}
		const residualFacts = residualFactsIndex(inspected.loaded);
		// "About this bundle" for this root's own docs page — see
		// `projectBundleInfo` for why it reads the root's own source rather than
		// `inspected.loaded.manifest` (the merged dependency closure every other
		// projection below reads).
		const rootBundle = projectBundleInfo(inspectFlattenedManifest(rootPath, corpus?.rawManifests));
		// Every uniform tag junction, joined once per root instead of once per
		// entry. `projectCatalogueEntry` already unions whatever `entry.tags`
		// carries into the emitted entry, so supplying it here is all it takes to
		// give a kind its tags — and the kinds that own a `DocsSubject`/
		// `DocsResource` keep getting theirs from that carrier as before, with the
		// union collapsing the overlap.
		const authoredTags = tagsByEntry(
			inspected.loaded.manifest as Record<string, unknown>,
			TAG_EDGE_PARENTS,
		);
		// Collected here because this is where a root's manifest is in scope, and
		// resolved far below once every page's catalogue exists — a grant links two
		// subjects that may live in different sections of different roots.
		for (const row of ((inspected.loaded.manifest as Record<string, unknown>)
			.tag_capability_grant ?? []) as Record<string, unknown>[]) {
			const tag = row.tag;
			const capability = row.capability_id;
			if (typeof tag === "string" && typeof capability === "string")
				capabilityGrants.push({ tag, capability });
		}
		for (const route of ENTITY_OWNER_ROUTES) {
			for (const attachment of rows(
				inspected.loaded.manifest as Record<string, unknown>,
				"metadata_attachments",
			)) {
				if (attachment.namespace !== route.namespace) continue;
				const target = attachment.target_ref;
				if (typeof target !== "string" || !target.startsWith(route.prefix)) continue;
				const definition = rows(
					inspected.loaded.manifest as Record<string, unknown>,
					"entity_definitions",
				).find((item) => item.entity_def_id === target);
				if (definition === undefined) continue;
				let slug: unknown;
				try {
					slug = (JSON.parse(String(attachment.payload_json)) as Record<string, unknown>)[
						route.field
					];
				} catch {
					continue;
				}
				if (typeof slug !== "string" && typeof slug !== "number") continue;
				const owner = `${route.owner_prefix}${slug}`;
				const byLabel = hostedByOwner.get(owner) ?? new Map();
				const bucket = byLabel.get(route.label) ?? {
					definitions: [],
					attachments: [],
					seen: new Set<string>(),
				};
				// A dependency's manifest is loaded once as its own root and again
				// inside every closure that depends on it, so the same authored row
				// arrives more than once. Without this every advancement choice is
				// listed twice on its class page.
				if (!bucket.seen.has(target)) {
					bucket.seen.add(target);
					bucket.definitions.push(definition);
					bucket.attachments.push(attachment);
				}
				byLabel.set(route.label, bucket);
				hostedByOwner.set(owner, byLabel);
			}
		}
		for (const row of rows(
			inspected.loaded.manifest as Record<string, unknown>,
			"entity_definitions",
		)) {
			const id = row.entity_def_id;
			if (typeof id === "string" && !definitionsById.has(id))
				definitionsById.set(id, {
					manifest: inspected.loaded.manifest as Record<string, unknown>,
					row,
					assetMounts: root.assetMounts ?? {},
				});
		}
		for (const item of inspected.pages) {
			const sourcePath = resolve(item.path);
			// A dependency that is also an explicit registry root is projected from its own
			// closure. Projecting it through a dependent would incorrectly add the
			// dependent's rows and attachments to the dependency's public page.
			if (sourcePath !== rootPath && registeredRootPaths.has(sourcePath)) continue;
			const page = item.resolvedPage;
			if (!page) throw new Error(`documentation page in '${item.path}' did not resolve`);
			routeId(page.page_id, "page_id");
			if (page.page_id === "technical")
				throw new Error("page_id 'technical' is reserved for manifest row routes");
			const href = mountFor(page.page_id, mountByRootPath.get(sourcePath));
			const publishedSources = new Map<string, string>();
			const ambiguousSources = new Set<string>();
			const publishSource = (path: string, target: string) => {
				if (ambiguousSources.has(path)) return;
				const prior = publishedSources.get(path);
				if (prior && prior !== target) {
					publishedSources.delete(path);
					ambiguousSources.add(path);
					return;
				}
				publishedSources.set(path, target);
			};
			for (const section of page.sections) {
				const sectionHref = `${href}/${section.id}`;
				for (const article of section.pages ?? []) {
					const featured = article.featured_reference;
					const featuredEntry = featured
						? (section.catalogue ?? []).find(
								(entry) => entry.kind === featured.kind && entry.ref === featured.ref,
							)
						: undefined;
					publishSource(
						article.source.path,
						featuredEntry ? `${sectionHref}/${featuredEntry.slug}` : `${sectionHref}/${article.id}`,
					);
				}
				for (const document of section.documents ?? [])
					publishSource(document.source.path, `${sectionHref}/${document.slug}`);
			}
			const linkLabels = new Set<string>();
			const resolvedLinks: DocsLinkTarget[] = (page.links ?? []).map((link) => {
				if (linkLabels.has(link.label))
					throw new Error(`documentation link profile has duplicate label '${link.label}'`);
				linkLabels.add(link.label);
				const matches = page.sections.flatMap((section) =>
					(section.catalogue ?? [])
						.filter(
							(entry) =>
								entry.kind === link.kind &&
								entry.ref === link.ref &&
								(!link.section_id || link.section_id === section.id),
						)
						.map((entry) => ({ entry, section })),
				);
				if (matches.length !== 1)
					throw new Error(
						`documentation link '${link.label}' target ${link.kind}:${link.ref} resolves to ${matches.length} catalogue entries`,
					);
				const match = matches[0];
				if (!match) throw new Error(`documentation link '${link.label}' did not resolve`);
				return {
					label: link.label,
					kind: link.kind,
					ref: link.ref,
					href: `${href}/${match.section.id}/${match.entry.slug}`,
					...(link.autolink === false ? { autolink: false } : {}),
				};
			});
			/**
			 * The link vocabulary for the page's own prose chapters.
			 *
			 * `resolvedLinks` above is a vocabulary of proper nouns — 1886
			 * creature, spell and item display names authored into the manifest.
			 * It is right for a catalogue entry's own attachment text, and wrong
			 * for a rules chapter: on "Rhythm of Play" it matches exactly two
			 * labels, the creature "Noble" and the spell "Symbol", where the
			 * text means a noble the party talks to and a symbol engraved on a
			 * wall. What that prose actually names is other chapters — "social
			 * interaction, exploration, and combat" are three sibling articles —
			 * and the rules glossary.
			 *
			 * So the targets are article titles — but only from the sections
			 * `sections.toml`'s `article_link_sections` opts in, because a
			 * section that titles its articles by position rather than by
			 * meaning would mislink (the spells chapter has articles called
			 * "Range" and "Effects"). Featured articles are excluded: those are
			 * entity pages under another name, already covered by
			 * `resolvedLinks`. Matching ignores case because a rules term is
			 * not a proper noun, and longer labels come first so "Ability
			 * Check" wins over the "Ability" inside it.
			 */
			const articleLinkTargets: DocsLinkTarget[] = [];
			const articleLabels = new Set<string>();
			for (const section of page.sections)
				for (const article of section.pages ?? []) {
					if (!ARTICLE_LINK_SECTIONS.has(section.id)) continue;
					if (article.featured_reference !== undefined) continue;
					const label = article.title.toLowerCase();
					// One title can name two chapters ("Proficiency" is both a
					// chapter of Playing the Game and a glossary entry). The first
					// in page order wins rather than the projection failing.
					if (articleLabels.has(label)) continue;
					articleLabels.add(label);
					articleLinkTargets.push({
						label: article.title,
						kind: "docs_page",
						ref: `${section.id}/${article.id}`,
						href: `${href}/${section.id}/${article.id}`,
						ignoreCase: true,
					});
				}
			// Plus the authored resource targets. These are the six abilities, and
			// unlike a creature or spell name they are what rules prose is
			// actually talking about when it says "melee attacks use Strength".
			// They stay case-sensitive: in the SRD an ability is a proper noun,
			// and "a test of strength" is not a link to the ability page.
			articleLinkTargets.push(
				...resolvedLinks.filter((link) => link.kind === "resource_definition"),
			);
			articleLinkTargets.sort(
				(left, right) =>
					right.label.length - left.label.length || left.label.localeCompare(right.label),
			);

			const projected: DocsPage = {
				page_id: page.page_id,
				title: page.title,
				intro: page.intro,
				nav_group: page.nav_group,
				...(page.source_base ? { source_base: page.source_base } : {}),
				...(resolvedLinks.length ? { links: resolvedLinks } : {}),
				...(page.attributions
					? {
							attributions: page.attributions.map((attribution) => {
								const blocks = renderDocsMarkdown(attribution.body, {
									sourcePath: attribution.source.path,
									sourceBase: page.source_base,
									publishedSources,
									headingOffset: 1,
								});
								if (blocks.some((block) => block.kind !== "html"))
									throw new Error(
										`attribution '${attribution.source.path}' cannot contain docs directives`,
									);
								return { ...attribution, blocks };
							}),
						}
					: {}),
				href,
				// Only the root page itself carries its bundle's "About this bundle"
				// block — a dependency loaded again inside this closure
				// (`sourcePath !== rootPath`) already gets one when IT is projected
				// as its own registered root.
				...(sourcePath === rootPath ? { bundle: rootBundle } : {}),
				sections: page.sections.map((section) => {
					routeId(section.id, `section id on page '${page.page_id}'`);
					const sectionHref = `${href}/${section.id}`;
					const reservedSlugs = new Set(["resource", "subject"]);
					const catalogue = (section.catalogue ?? []).map((entry) => {
						publicSlug(entry.slug, `catalogue slug in section '${section.id}'`);
						if (reservedSlugs.has(entry.slug))
							throw new Error(`catalogue slug '${entry.slug}' is reserved`);
						const carriedTags = authoredTags.get(`${entry.kind}:${entry.ref}`);
						return projectCatalogueEntry(
							inspected.loaded.manifest,
							carriedTags ? { ...entry, tags: [...carriedTags] } : entry,
							sectionHref,
							`/compendium/docs/catalogue/${encodeURIComponent(page.page_id)}/${encodeURIComponent(section.id)}/${encodeURIComponent(entry.slug)}.json`,
							root.assetMounts ?? {},
							root.assetModuleMounts ?? {},
							resolvedLinks,
							residualFacts,
						);
					});
					const documents = (section.documents ?? []).map((document) => {
						publicSlug(document.slug, `document slug in section '${section.id}'`);
						if (reservedSlugs.has(document.slug))
							throw new Error(`document slug '${document.slug}' is reserved`);
						return {
							...document,
							href: `${sectionHref}/${document.slug}`,
							artifact_href: `/compendium/docs/documents/${encodeURIComponent(page.page_id)}/${encodeURIComponent(section.id)}/${encodeURIComponent(document.id)}.json`,
							blocks: renderDocsMarkdown(document.body, {
								sourcePath: document.source.path,
								sourceBase: page.source_base,
								publishedSources,
								linkTargets: resolvedLinks,
								self: { kind: "document", ref: document.ref },
							}),
						};
					});
					const pages = (section.pages ?? []).map((article) => {
						routeId(article.id, `page id in section '${section.id}'`);
						const blocks = renderDocsMarkdown(article.body, {
							sourcePath: article.source.path,
							sourceBase: page.source_base,
							publishedSources,
							// Prose chapters link to the other chapters — see
							// `articleLinkTargets`. A featured article is an entity
							// page under another name and is left as it was.
							...(article.featured_reference === undefined
								? {
										linkTargets: articleLinkTargets,
										self: { kind: "docs_page", ref: `${section.id}/${article.id}` },
									}
								: {}),
						});
						const refs = [
							...new Set(
								blocks.flatMap((block) =>
									block.kind === "resource"
										? [block.ref]
										: block.kind === "resource-table"
											? block.refs
											: [],
								),
							),
						];
						const subjectDirectives = [
							...new Map(
								blocks
									.flatMap((block) =>
										block.kind === "subject" ? [{ kind: block.subjectKind, ref: block.ref }] : [],
									)
									.map((item) => [`${item.kind}:${item.ref}`, item]),
							).values(),
						];
						const featured = article.featured_reference;
						const featuredCatalogue = featured
							? catalogue.find(
									(entry) => entry.kind === featured.kind && entry.ref === featured.ref,
								)
							: undefined;
						const projectedResources = refs.map((ref) =>
							projectResource(
								inspected.loaded.manifest,
								ref,
								catalogueHref(catalogue, "resource_definition", ref) ??
									resourceHref(sectionHref, ref),
								resolvedLinks,
							),
						);
						if (
							featured?.kind === "resource_definition" &&
							!projectedResources.some((resource) => resource.ref === featured.ref)
						) {
							projectedResources.push(
								featuredCatalogue?.resource ??
									projectResource(
										inspected.loaded.manifest,
										featured.ref,
										catalogueHref(catalogue, "resource_definition", featured.ref) ??
											resourceHref(sectionHref, featured.ref),
										resolvedLinks,
									),
							);
						}
						const projectedSubjects = subjectDirectives.map(({ kind, ref }) =>
							projectSubject(
								inspected.loaded.manifest,
								kind,
								ref,
								catalogueHref(catalogue, kind, ref) ?? subjectHref(sectionHref, kind, ref),
								root.assetMounts ?? {},
								resolvedLinks,
							),
						);
						if (
							featured !== undefined &&
							featured.kind !== "resource_definition" &&
							!projectedSubjects.some(
								(subject) => subject.kind === featured.kind && subject.ref === featured.ref,
							)
						) {
							projectedSubjects.push(
								featuredCatalogue?.subject ??
									projectSubject(
										inspected.loaded.manifest,
										featured.kind,
										featured.ref,
										catalogueHref(catalogue, featured.kind, featured.ref) ??
											subjectHref(sectionHref, featured.kind, featured.ref),
										root.assetMounts ?? {},
										resolvedLinks,
									),
							);
						}
						return {
							...article,
							// A featured article is served at its catalogue entry's own
							// href, not its own — carrying one here would advertise a
							// route the resolver never grants it (sk-jay0.7.93).
							...(featured === undefined ? { href: `${sectionHref}/${article.id}` } : {}),
							artifact_href: `/compendium/docs/articles/${encodeURIComponent(page.page_id)}/${encodeURIComponent(section.id)}/${encodeURIComponent(article.id)}.json`,
							blocks,
							resources: projectedResources,
							...(projectedSubjects.length > 0 ? { subjects: projectedSubjects } : {}),
						};
					});
					for (const article of pages) {
						if (!article.featured_reference) continue;
						const entry = catalogue.find(
							(candidate) =>
								candidate.kind === article.featured_reference?.kind &&
								candidate.ref === article.featured_reference.ref,
						) as DocsCatalogueEntry | undefined;
						if (!entry) throw new Error(`featured article '${article.id}' has no catalogue entry`);
						if (entry.featured_article)
							throw new Error(`catalogue entry '${entry.slug}' has multiple featured articles`);
						entry.featured_article = article;
					}
					const routeOwners = new Map<string, string>();
					for (const [slug, owner] of [
						...catalogue.map((entry) => [entry.slug, `catalogue '${entry.ref}'`] as const),
						...documents.map((document) => [document.slug, `document '${document.id}'`] as const),
						...pages
							.filter((article) => article.featured_reference === undefined)
							.map((article) => [article.id, `article '${article.id}'`] as const),
					]) {
						const previous = routeOwners.get(slug);
						if (previous)
							throw new Error(`route slug '${slug}' collides between ${previous} and ${owner}`);
						routeOwners.set(slug, owner);
					}
					return {
						id: section.id,
						title: section.title,
						intro: section.intro,
						href: sectionHref,
						...(catalogue.length ? { catalogue } : {}),
						...(documents.length ? { documents } : {}),
						pages,
					};
				}),
			};
			const previous = pagesById.get(page.page_id);
			if (previous !== undefined) {
				if (sourceByPageId.get(page.page_id) !== sourcePath) {
					throw new Error(`page_id '${page.page_id}' is declared by multiple manifest sources`);
				}
				if (JSON.stringify(previous) !== JSON.stringify(projected)) {
					throw new Error(`page_id '${page.page_id}' has contradictory docs projections`);
				}
				continue;
			}
			for (const route of new Set([
				projected.href,
				...projected.sections.flatMap((section) => [
					section.href,
					...(section.catalogue ?? []).map((entry) => entry.href),
					...(section.documents ?? []).map((document) => document.href),
					// A featured article carries no href of its own — see the
					// return above — so it never enters this route-collision set.
					...(section.pages ?? [])
						.filter((article) => article.featured_reference === undefined)
						.map((article) => article.href as string),
					...(section.pages ?? []).flatMap((article) => [
						...((article as DocsArticle).resources ?? []).map((resource) => resource.href),
						...((article as DocsArticle).subjects ?? []).map((subject) => subject.href),
					]),
				]),
			])) {
				const owner = occupiedRoutes.get(route);
				if (owner !== undefined) {
					throw new Error(
						`docs route '${route}' collides between '${owner}' and '${page.page_id}'`,
					);
				}
				occupiedRoutes.set(route, page.page_id);
			}
			attachArticleCatalogueLists(projected);
			pagesById.set(page.page_id, projected);
			sourceByPageId.set(page.page_id, sourcePath);
		}
	}
	// Sidebar group placement is authored via `nav_group`, not derived from
	// this array's order (see `CompendiumSidebar.svelte`). This sort exists
	// only for determinism of the emitted `index.json`, so it orders by the
	// human-meaningful `title` rather than the arbitrary `page_id`.
	const pages = [...pagesById.values()].sort((left, right) =>
		left.title.localeCompare(right.title),
	);
	// `section.catalogue` is typed as the trimmed `DocsCatalogueEntrySummary[]` for
	// the public index shape, but at this stage in the pipeline (before
	// `projectMetadataDocsIndex` splits it into a listing + per-entry files) it
	// still holds the full `DocsCatalogueEntry` objects `projectCatalogueEntry`
	// built, including `relations`/`resource`/`subject`.
	const catalogueTargets = pages.flatMap((page) =>
		page.sections.flatMap((section) => (section.catalogue ?? []) as DocsCatalogueEntry[]),
	);
	for (const page of pages) {
		for (const section of page.sections) {
			for (const document of section.documents ?? []) {
				if (!document.relations) continue;
				document.relations = document.relations.map((relation) => {
					const matches = catalogueTargets.filter(
						(target) => target.kind === relation.kind && target.ref === relation.ref,
					);
					if (matches.length !== 1)
						throw new Error(
							`document relation ${relation.kind}:${relation.ref} resolves to ${matches.length} catalogue routes`,
						);
					const target = matches[0];
					if (!target)
						throw new Error(`document relation ${relation.kind}:${relation.ref} did not resolve`);
					return { ...relation, label: target.display_name, href: target.href };
				});
			}
		}
	}
	// A catalogue entry's relations (from catalogueRelations, an exact schema join
	// on the manifest) start with only a typed identity, no route: unlike authored
	// `page.links`/`document.relations`, they are not curated per-page, so the only
	// reliable route source is "does the target itself have a catalogue page
	// anywhere in this index". Ambiguous identities (registered by more than one
	// catalogue entry) resolve to `null` and stay unlinked rather than failing the
	// whole build, since relations are derived, not authored.
	const catalogueByIdentity = new Map<string, DocsCatalogueEntry | null>();
	// Deduped: the same grant may be declared by more than one loaded root.
	const seenGrants = new Set<string>();
	for (const target of catalogueTargets) {
		const identity = `${target.kind}:${target.ref}`;
		catalogueByIdentity.set(identity, catalogueByIdentity.has(identity) ? null : target);
	}
	// A subject/resource's raw `tags` are plain SRD tag ids with no route of
	// their own; resolve each the same way relations resolve above — only a
	// tag with its own unambiguous `tag_value_definition` catalogue page (see
	// `SECTION_BY_TAG_PREFIX` in srd-cc's `docs/catalogue.ts`) becomes a link,
	// everything else stays a bare chip in `DocsTagLink.tag`.
	const resolveTag = (tag: string): DocsTagLink => {
		const linked = catalogueByIdentity.get(`tag_value_definition:${tag}`);
		return linked
			? {
					tag,
					href: linked.href,
					display_name: linked.display_name,
					description: linked.description,
				}
			: { tag };
	};
	for (const target of catalogueTargets) {
		// Entry level first, because most page kinds have no carrier at all and
		// would otherwise show a tag list on the tag's page with nothing pointing
		// back from their own.
		if (target.tags?.length) target.tag_links = target.tags.map(resolveTag);
		const carrier = target.resource ?? target.subject;
		if (!carrier) continue;
		carrier.tag_links = carrier.tags.map(resolveTag);
	}
	// A catalogue entry's own `facts` restate one of the entity's own tags
	// (`Size Medium` mirrors `srd.size.medium` — see srd-cc's `withFactTags`
	// in `docs/catalogue.ts`); resolve the same way `tag_links` resolves
	// above, gated on that tag having its own unambiguous catalogue page.
	// Families with no tag counterpart never set `fact.tag`, so their facts
	// pass through unresolved and render as plain text.
	for (const target of catalogueTargets) {
		if (!target.facts.some((fact) => fact.tag !== undefined)) continue;
		target.facts = target.facts.map((fact) => {
			if (fact.tag === undefined) return fact;
			const linked = catalogueByIdentity.get(`tag_value_definition:${fact.tag}`);
			return linked ? { ...fact, href: linked.href } : fact;
		});
	}
	// A tag's own catalogue page already lists its CHILD tags (`childTags` in
	// CatalogueEntryPage.svelte); it additionally needs the reverse of that —
	// every catalogue entry ACROSS THE WHOLE CORPUS (not just the tags
	// section) whose own `tags` carry this tag id, e.g. every monster on
	// `srd.monster`'s page. `catalogueTargets` already spans every
	// page/section, so the reverse index is one pass over it. Kept minimal
	// (`DocsTagMemberSummary`, no facts/art/record) since a namespace tag can
	// have hundreds of members and each becomes part of the tag's own
	// artifact (sk-jay0.3.5.67).
	const membersByTag = new Map<string, DocsTagMemberSummary[]>();
	for (const target of catalogueTargets) {
		for (const tagId of target.tags ?? []) {
			const row: DocsTagMemberSummary = {
				kind: target.kind,
				ref: target.ref,
				family: target.family,
				display_name: target.display_name,
				description: target.description,
				href: target.href,
			};
			const members = membersByTag.get(tagId);
			if (members) members.push(row);
			else membersByTag.set(tagId, [row]);
		}
	}
	// An entity definition that gets no page of its own, inlined on the page that
	// names it.
	//
	// The owner's decision (sk-jay0.3.5.72): a monster's claw or bite is not worth
	// a page — "claw" alone explains nothing, the claw belongs to the bear. But it
	// still has to be readable somewhere, and today the creature's equipment facet
	// shows only the bare id.
	//
	// Which page hosts it is not authored anywhere and does not need to be: the
	// row that names the orphan IS its owner. Scanning the already-rendered owner
	// facets for a page-less definition id finds the host without a table of
	// families, and measured over the SRD corpus it is unambiguous — 105 natural
	// weapons, each named by exactly one page, and no orphan named by two. The
	// other 304 orphans (the advancement-choice menus) are named by no page at
	// all and are not reachable this way.
	for (const target of catalogueTargets) {
		// The authored direction first, because what it attaches is then itself
		// scanned: an advancement choice lands on its class page, and the option it
		// grants is named only inside THAT row's payload.
		const hosted: DocsFacet[] = [];
		for (const [label, bucket] of hostedByOwner.get(target.ref) ?? []) {
			hosted.push({ label, rows: bucket.definitions, table: "entity_definitions" });
			hosted.push({
				label: `${label}: choice metadata`,
				rows: bucket.attachments,
				table: "metadata_attachments",
			});
		}
		const inlined: DocsFacet[] = [];
		// Seeded with what the authored route already listed, or every advancement
		// choice would be printed twice on its class page: once in the group, and
		// again as its own block because the group's own rows name it. Grouping
		// exists precisely to avoid ninety collapsed blocks.
		const seen = new Set<string>();
		for (const facet of hosted) {
			if (facet.table !== "entity_definitions") continue;
			for (const row of facet.rows)
				if (typeof row.entity_def_id === "string") seen.add(row.entity_def_id);
		}
		for (const facet of [...(target.facets ?? []), ...(target.subject?.facets ?? []), ...hosted]) {
			for (const row of facet.rows) {
				for (const value of Object.values(row)) {
					for (const candidate of namedIds(value)) {
						if (seen.has(candidate)) continue;
						const definition = definitionsById.get(candidate);
						// A definition with a page of its own is already readable there;
						// inlining it as well would print a longsword in full on every
						// creature carrying one.
						if (
							!definition ||
							catalogueByIdentity.get(`entity_definition:${candidate}`) !== undefined
						)
							continue;
						seen.add(candidate);
						const label =
							typeof definition.row.display_name === "string" && definition.row.display_name !== ""
								? definition.row.display_name
								: candidate;
						inlined.push({ label, rows: [definition.row], table: "entity_definitions" });
						// The hosted definition joins its tags' member lists too, linked
						// to the page hosting it. Without this the allosaurus bite reads
						// as a weapon on the allosaurus page while `srd.weapon`'s own
						// page lists 38 weapons and not the bite.
						for (const tagRow of rows(definition.manifest, "entity_definition_tag")) {
							if (tagRow.entity_def_id !== candidate || typeof tagRow.tag !== "string") continue;
							const members = membersByTag.get(tagRow.tag) ?? [];
							members.push({
								kind: "entity_definition",
								ref: candidate,
								// The host's family, because the host's page is where the
								// link lands and what the reader will be looking at.
								family: target.family,
								display_name: label,
								description:
									typeof definition.row.description === "string" ? definition.row.description : "",
								href: target.href,
							});
							membersByTag.set(tagRow.tag, members);
						}
						for (const owned of ownedFacets(
							definition.manifest,
							"entity_definitions",
							candidate,
							EMPTY,
						))
							inlined.push({ ...owned, label: `${label}: ${owned.label}` });
						// `metadata_attachments` is owned dynamically, by whichever
						// `target_kind`/`target_ref` it names (row-kind-coverage.toml:
						// owner "*"), so the fixed-table `ownedFacets` above never reaches
						// it. Joined by hand here, and only added when `projectAttachments`
						// actually resolves art for it — a hosted definition with no art,
						// or an attachment kind this pass cannot render, adds nothing rather
						// than a broken image (sk-jay0.3.5.76: a row is only credited to a
						// page that provably shows it). `asset_href` is resolved, not
						// authored, so it rides `derived` the same way a map layer's does.
						const hostedAttachmentRows = rows(definition.manifest, "metadata_attachments").filter(
							(row) => row.target_kind === "entity_definition" && row.target_ref === candidate,
						);
						if (hostedAttachmentRows.length > 0) {
							const projectedAttachments = projectAttachments(
								definition.manifest,
								"entity_definition",
								candidate,
								definition.assetMounts,
								true,
							);
							const art = hostedAttachmentRows
								.map((row, index) => ({ row, assetHref: projectedAttachments[index]?.asset_href }))
								.filter(
									(entry): entry is { row: Record<string, unknown>; assetHref: string } =>
										typeof entry.assetHref === "string" && entry.assetHref !== "",
								)
								.map(({ row, assetHref }) => ({ ...row, asset_href: assetHref }));
							if (art.length > 0)
								inlined.push({
									label: `${label}: art`,
									rows: art,
									table: "metadata_attachments",
									derived: ["asset_href"],
								});
						}
					}
				}
			}
		}
		if (hosted.length + inlined.length > 0)
			target.facets = [...(target.facets ?? []), ...hosted, ...inlined];
	}

	// Tag membership is assigned LAST, after the hosted definitions above have
	// added themselves. A hosted definition is not a catalogue entry, so the pass
	// over `catalogueTargets` cannot see it — and leaving it out meant the
	// allosaurus bite carried `srd.weapon` while the weapon tag's own page had
	// never heard of it. It links to the page hosting it, which is where a reader
	// goes to read it (owner's call, 2026-09-10: it appears on all four of its
	// tags).
	for (const target of catalogueTargets) {
		if (target.kind !== "tag_value_definition") continue;
		const members = membersByTag.get(target.ref);
		if (!members?.length) continue;
		// One entry per subject: a dependency's manifest is loaded once per
		// closure, so a hosted definition arrives once per root that carries it.
		const seenMembers = new Set<string>();
		target.members = members
			.filter((member) => {
				const key = `${member.kind ?? ""}:${member.ref}`;
				if (seenMembers.has(key)) return false;
				seenMembers.add(key);
				return true;
			})
			.toSorted((left, right) => left.display_name.localeCompare(right.display_name));
	}

	// `tag_capability_grant`: a tag hands out a capability. The edge runs
	// tag -> capability, which is the opposite direction from every other tag
	// junction, so it cannot ride the uniform pass — there, the tag is the thing
	// worn; here it is the thing doing the granting. Both ends are page-surfaced,
	// so both ends get a list.
	for (const grant of capabilityGrants) {
		const key = `${grant.tag}\u0000${grant.capability}`;
		if (seenGrants.has(key)) continue;
		seenGrants.add(key);
		const tagEntry = catalogueByIdentity.get(`tag_value_definition:${grant.tag}`);
		const capabilityEntry = catalogueByIdentity.get(`capability_definition:${grant.capability}`);
		// An ambiguous identity resolves to null and stays unlisted rather than
		// guessing, exactly as relations and tag links do above.
		if (tagEntry && capabilityEntry) {
			tagEntry.granted_capabilities = [
				...(tagEntry.granted_capabilities ?? []),
				{
					ref: capabilityEntry.ref,
					family: capabilityEntry.family,
					display_name: capabilityEntry.display_name,
					description: capabilityEntry.description,
					href: capabilityEntry.href,
				},
			];
		}
		if (capabilityEntry)
			capabilityEntry.granting_tags = [
				...(capabilityEntry.granting_tags ?? []),
				tagEntry
					? {
							tag: grant.tag,
							href: tagEntry.href,
							display_name: tagEntry.display_name,
							description: tagEntry.description,
						}
					: { tag: grant.tag },
			];
	}
	for (const target of catalogueTargets)
		if (target.granted_capabilities)
			target.granted_capabilities = target.granted_capabilities.toSorted((left, right) =>
				left.display_name.localeCompare(right.display_name),
			);

	// The two-directional reference graph, built the same way and in the same
	// place as the tag reverse index above: one pass over every catalogue entry
	// across every page and section. See `reference-graph.ts` for why a plain
	// scan of columns and quoted DSL identifiers is complete without a parser.
	// Like `members`, both directions ship only in the per-entry artifact.
	const graph = buildReferenceGraph(catalogueTargets);
	// Every catalogue subject carrying a given id — an id alone is NOT unique
	// across kinds (see `reference-graph.ts`: 76 ids name two subjects at once,
	// e.g. `srd/str` is both a resource and a modifier target). `hrefForId`
	// used to drop such ids entirely, leaving `'srd/str'` unlinked in DSL text
	// while the reference graph below honestly listed both subjects; the DSL
	// tokens now carry every target and the reader offers the choice instead.
	const targetsByRef = new Map<string, DocsDslTarget[]>();
	for (const target of catalogueTargets) {
		const row: DocsDslTarget = {
			title: target.display_name,
			kind: readableKind(target.kind),
			href: target.href,
		};
		targetsByRef.set(target.ref, [...(targetsByRef.get(target.ref) ?? []), row]);
	}
	const targetsForId: DslTargetsForId = (id) => targetsByRef.get(id);
	for (const target of catalogueTargets) {
		const key = referenceGraphKey(target.kind, target.ref);
		const references = graph.references.get(key);
		if (references?.length) target.references = references;
		const referencedBy = graph.referencedBy.get(key);
		if (referencedBy?.length) target.referenced_by = referencedBy;
		const dsl = projectDslFields(target.record ?? {}, targetsForId);
		if (dsl) target.dsl = dsl;
	}
	for (const page of pages) {
		for (const section of page.sections) {
			for (const entry of (section.catalogue ?? []) as DocsCatalogueEntry[]) {
				if (!entry.relations) continue;
				entry.relations = entry.relations.map((relation) => {
					const target = catalogueByIdentity.get(`${relation.kind}:${relation.ref}`);
					if (!target) return relation;
					const projected =
						relation.kind === "resource_definition" && target.resource
							? { resource: trimRelationResource(target.resource) }
							: relation.kind === "entity_definition" && target.subject
								? { subject: trimRelationSubject(target.subject) }
								: {};
					return { ...relation, href: target.href, ...projected };
				});
			}
		}
	}
	return { version: 1, pages };
}

/**
 * The overflow basin: the manifest rows that reach a reader nowhere else.
 *
 * `shown` is the set of occurrence keys some rich page provably renders, from
 * `collectWitnesses`. Every row whose key is in it is dropped here, because a
 * reader already has a better place to read it. Omit `shown` and this returns
 * the whole authored corpus, which is what the coverage validator needs in
 * order to check the two halves against each other.
 *
 * Membership is therefore MEASURED, never derived from `row-kind-coverage.toml`.
 * A row whose kind is classified as belonging on a page it never reached stays
 * in this build-time basin instead of disappearing from measurement
 * (sk-jay0.3.5.71.2). This helper retains complete private rows. The public
 * writer in `projectMetadataDocsIndex` refuses uncovered kinds with an authored
 * `public_fields` allowlist rather than publishing their raw fallback; the
 * actual writer boundary is proved by `role-binding-privacy.test.ts`.
 */
export function buildTechnicalDocsProjection(
	roots: readonly DocsProjectionRoot[],
	shown?: ReadonlySet<string>,
	corpus?: InspectedDocsCorpus,
): {
	sources: DocsTechnicalSourceSummary[];
	tables: Map<string, Map<string, Record<string, unknown>[]>>;
} {
	const tableRows = new Map<string, Map<string, Record<string, unknown>[]>>();
	const bundleIdsBySource = new Map<string, string[]>();
	const visited = new Set<string>();
	for (const root of roots) {
		const inspected = inspectRoot(root, corpus);
		if (inspected.diagnostics.length > 0) {
			throw new Error(inspected.diagnostics.map((row) => `${row.path}: ${row.message}`).join("\n"));
		}
		for (const source of inspected.loaded.sources) {
			const sourcePath = resolve(source.manifestPath);
			if (visited.has(sourcePath)) continue;
			visited.add(sourcePath);
			const sourceId = [...source.bundleIds].sort().join("+");
			if (!sourceId) throw new Error(`technical manifest source '${sourcePath}' has no bundle id`);
			if (tableRows.has(sourceId))
				throw new Error(`technical source id '${sourceId}' is ambiguous`);
			const parsed = inspectFlattenedManifest(sourcePath, corpus?.rawManifests);
			const tables = new Map<string, Record<string, unknown>[]>();
			for (const [table, value] of Object.entries(parsed)) {
				if (!Array.isArray(value) || table === "include") continue;
				const rows = value.map(recordOf);
				tables.set(
					table,
					shown === undefined
						? rows
						: rows.filter((row) => !shown.has(occurrenceKey(table, row, DELIVERY_KEYS))),
				);
			}
			const metadataEnvelopes: Record<string, unknown>[] = [];
			if (Object.keys(source.metadata).length > 0)
				metadataEnvelopes.push({ scope: "root", metadata: source.metadata });
			for (const fragment of source.fragments) {
				if (Object.keys(fragment.metadata).length > 0)
					metadataEnvelopes.push({
						scope: "include",
						path: fragment.path,
						metadata: fragment.metadata,
					});
			}
			if (metadataEnvelopes.length > 0) {
				assertSafeIntegers(metadataEnvelopes, `technical metadata source '${sourceId}'`);
				tables.set("manifest_metadata", metadataEnvelopes);
			}
			tableRows.set(sourceId, tables);
			bundleIdsBySource.set(sourceId, [...source.bundleIds]);
		}
	}
	const sources: DocsTechnicalSourceSummary[] = [...tableRows.entries()]
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([sourceId, tables]) => {
			const summaries = [...tables.entries()]
				.filter(([, values]) => values.length > 0)
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([table, values]) => ({
					table,
					count: values.length,
					href: `/compendium/docs/technical/${encodeURIComponent(sourceId)}/${table}.json`,
				}));
			return {
				source_id: sourceId,
				bundle_ids: bundleIdsBySource.get(sourceId) ?? [],
				row_count: summaries
					.filter((item) => item.table !== "manifest_metadata")
					.reduce((sum, item) => sum + item.count, 0),
				href: `/docs/technical/${encodeURIComponent(sourceId)}`,
				tables: summaries,
			};
		});
	return { sources, tables: tableRows };
}

/** Validate every root first, then atomically replace the deterministic static artifact. */
export function projectMetadataDocsIndex(
	roots: readonly DocsProjectionRoot[],
	outputPath: string,
): DocsIndexV1 {
	// Inspect/parse each root once and hand the same corpus to both builders
	// below — `buildMetadataDocsIndex` and `buildTechnicalDocsProjection` each
	// independently call `inspectMetadataDocs` (parses the TOML corpus, renders
	// every docs article body) and re-parse each root/source's own flattened
	// manifest; without sharing, one projection run paid for both twice.
	const corpus = inspectDocsCorpus(roots);
	const baseIndex = buildMetadataDocsIndex(roots, corpus);
	const absoluteOutput = resolve(outputPath);
	const technicalRoot = resolve(dirname(absoluteOutput), "technical");
	const articleRoot = resolve(dirname(absoluteOutput), "articles");
	const catalogueRoot = resolve(dirname(absoluteOutput), "catalogue");
	const cataloguesRoot = resolve(dirname(absoluteOutput), "catalogues");
	const documentRoot = resolve(dirname(absoluteOutput), "documents");
	// Every entry that reaches a reader, in exactly the form it is serialized.
	// The basin is filtered against these below, and `measureDelivery` re-derives
	// the same set by reading the written artifacts back — two independent paths
	// through one rule, so an over-generous filter shows up as a row that is in
	// neither the pages nor the basin.
	const projectedEntries: DocsCatalogueEntry[] = [];
	const projectedArticles: DocsArticle[] = [];
	const compactPages = baseIndex.pages.map((page) => ({
		...page,
		sections: page.sections.map((section) => {
			const catalogue = section.catalogue?.map((summary) => {
				const entry = summary as DocsCatalogueEntry;
				projectedEntries.push(entry);
				const target = resolve(
					catalogueRoot,
					encodeURIComponent(page.page_id),
					encodeURIComponent(section.id),
					`${encodeURIComponent(entry.slug)}.json`,
				);
				mkdirSync(dirname(target), { recursive: true });
				const temporary = `${target}.tmp-${process.pid}`;
				writeFileSync(temporary, `${JSON.stringify(entry, null, 2)}\n`, "utf8");
				renameSync(temporary, target);
				const {
					record: _record,
					resource: _resource,
					subject: _subject,
					featured_article: _featuredArticle,
					members: _members,
					references: _references,
					referenced_by: _referencedBy,
					dsl: _dsl,
					...compact
				} = entry;
				return compact;
			});
			let catalogueHref: string | undefined;
			if (catalogue?.length) {
				catalogueHref = `/compendium/docs/catalogues/${encodeURIComponent(page.page_id)}/${encodeURIComponent(section.id)}.json`;
				const target = resolve(
					cataloguesRoot,
					encodeURIComponent(page.page_id),
					`${encodeURIComponent(section.id)}.json`,
				);
				mkdirSync(dirname(target), { recursive: true });
				const temporary = `${target}.tmp-${process.pid}`;
				writeFileSync(temporary, `${JSON.stringify(catalogue, null, 2)}\n`, "utf8");
				renameSync(temporary, target);
			}
			const { catalogue: _catalogue, ...sectionSummary } = section;
			const primaryFamilies = primaryFamiliesForSection(section.id);
			return {
				...sectionSummary,
				...(catalogueHref
					? {
							catalogue_href: catalogueHref,
							catalogue_count: catalogue?.length,
							catalogue_slugs: catalogue?.map((entry) => entry.slug),
						}
					: {}),
				...(primaryFamilies !== undefined ? { primary_families: primaryFamilies } : {}),
				documents: section.documents?.map((summary) => {
					// A document always owns its own route (sk-jay0.7.93).
					const document = summary as DocsArticle & {
						href: string;
						ref: string;
						slug: string;
						family: string;
					};
					const target = resolve(
						documentRoot,
						encodeURIComponent(page.page_id),
						encodeURIComponent(section.id),
						`${encodeURIComponent(document.id)}.json`,
					);
					mkdirSync(dirname(target), { recursive: true });
					const temporary = `${target}.tmp-${process.pid}`;
					writeFileSync(temporary, `${JSON.stringify(document, null, 2)}\n`, "utf8");
					renameSync(temporary, target);
					const {
						body: _body,
						source: _source,
						blocks: _blocks,
						resources: _resources,
						subjects: _subjects,
						...compact
					} = document;
					return compact;
				}),
				pages: section.pages?.map((summary) => {
					const article = summary as DocsArticle;
					projectedArticles.push(article);
					const target = resolve(
						articleRoot,
						encodeURIComponent(page.page_id),
						encodeURIComponent(section.id),
						`${encodeURIComponent(article.id)}.json`,
					);
					mkdirSync(dirname(target), { recursive: true });
					const temporaryArticle = `${target}.tmp-${process.pid}`;
					writeFileSync(temporaryArticle, `${JSON.stringify(article, null, 2)}\n`, "utf8");
					renameSync(temporaryArticle, target);
					return {
						id: article.id,
						title: article.title,
						href: article.href,
						artifact_href: article.artifact_href,
						...(article.featured_reference
							? { featured_reference: article.featured_reference }
							: {}),
						...(article.resources?.length
							? { resource_routes: article.resources.map(({ ref, href }) => ({ ref, href })) }
							: {}),
						...(article.resources?.length ? { compact_resources: article.resources } : {}),
						...(article.subjects?.length
							? {
									subject_routes: article.subjects.map(({ kind, ref, href }) => ({
										kind,
										ref,
										href,
									})),
								}
							: {}),
					};
				}),
			};
		}),
	}));
	const fullTechnical = buildTechnicalDocsProjection(roots, undefined, corpus);
	const witnesses = collectWitnesses(
		projectedEntries,
		projectedArticles,
		DELIVERY_KEYS,
		CATALOGUE_IDENTITIES,
		baseIndex.pages,
		authoredSourceRows(fullTechnical.tables),
	);
	if (witnesses.violations.length > 0) throw new Error(witnesses.violations.join("\n"));
	// Earlier projections may have emitted raw administrative tables. Remove
	// their generated artifacts even when the new index no longer links them:
	// an unreferenced file would still ship through the public-directory copy.
	if (existsSync(technicalRoot))
		for (const source of readdirSync(technicalRoot, { withFileTypes: true })) {
			if (!source.isDirectory()) continue;
			for (const kind of rowKindCoverage())
				if (kind.public_fields !== undefined)
					rmSync(resolve(technicalRoot, source.name, `${encodeURIComponent(kind.kind)}.json`), {
						force: true,
					});
		}
	const technical = buildTechnicalDocsProjection(roots, witnesses.keys, corpus);
	const index: DocsIndexV1 = {
		...baseIndex,
		pages: compactPages,
		search_href: "/compendium/docs/search.json",
		technical_sources: technical.sources,
		family_headings: Object.fromEntries(FAMILY_HEADINGS),
		family_nouns: Object.fromEntries(FAMILY_NOUNS),
		identity_namespaces: Object.fromEntries(IDENTITY_NAMESPACES),
	};
	mkdirSync(dirname(absoluteOutput), { recursive: true });
	for (const source of technical.sources) {
		const tables = technical.tables.get(source.source_id);
		if (!tables) continue;
		for (const summary of source.tables) {
			const rows = tables.get(summary.table) ?? [];
			// The projection helper also serves private build-time measurement.
			// Refuse uncovered private rows here, at the public artifact boundary.
			if (rowKindCoverageFor(summary.table)?.public_fields !== undefined && rows.length > 0)
				throw new Error(
					`public documentation refuses an uncovered redacted ${summary.table} row; raw technical fallback is forbidden`,
				);
			const artifact: DocsTechnicalTable = {
				version: 1,
				source_id: source.source_id,
				bundle_ids: source.bundle_ids,
				table: summary.table,
				rows,
			};
			const target = resolve(
				technicalRoot,
				encodeURIComponent(source.source_id),
				`${summary.table}.json`,
			);
			mkdirSync(dirname(target), { recursive: true });
			const temporaryTable = `${target}.tmp-${process.pid}`;
			writeFileSync(temporaryTable, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
			renameSync(temporaryTable, target);
		}
	}
	const temporary = `${absoluteOutput}.tmp-${process.pid}`;
	const searchPath = resolve(dirname(absoluteOutput), "search.json");
	const temporarySearch = `${searchPath}.tmp-${process.pid}`;
	writeFileSync(
		temporarySearch,
		`${JSON.stringify(buildDocsSearchIndex(baseIndex), null, 2)}\n`,
		"utf8",
	);
	renameSync(temporarySearch, searchPath);
	const referencePath = resolve(dirname(absoluteOutput), "references.json");
	const temporaryReferences = `${referencePath}.tmp-${process.pid}`;
	writeFileSync(
		temporaryReferences,
		`${JSON.stringify(buildReferenceVocabulary(baseIndex))}\n`,
		"utf8",
	);
	renameSync(temporaryReferences, referencePath);
	writeFileSync(temporary, `${JSON.stringify(index, null, 2)}\n`, "utf8");
	renameSync(temporary, absoluteOutput);
	return index;
}
