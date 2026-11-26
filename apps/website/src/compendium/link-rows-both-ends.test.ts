import { beforeAll, describe, expect, it } from "vitest";
import { emittedCatalogueEntries } from "./delivery";
import type { DocsCatalogueEntry, DocsFacet } from "./docs-types";
import { realDocsProjection } from "./real-docs-projection";

/**
 * A handful of manifest rows link two other rows, each naming the other
 * through its own columns rather than through a shared parent: `entity_
 * containment` (a container and what it holds), `place_node_traces` and
 * `spatial_niche_attachments` (a place node and, respectively, a trace kind
 * or a niche), and `turn_scheduler` (a session definition names it through
 * `turn_scheduler_id`, the one row here authored in the opposite direction —
 * `row-kind-coverage.toml`). Each renders on the page(s) of the things it
 * connects, derived from its own columns, never by name similarity.
 */

let entries: DocsCatalogueEntry[] = [];
let outputRoot = "";

beforeAll(async () => {
	const shared = realDocsProjection();
	outputRoot = shared.outputRoot;
	const index = shared.index;
	entries = [...emittedCatalogueEntries(index, outputRoot)];
}, 180_000);

function entry(kind: string, ref: string): DocsCatalogueEntry {
	const found = entries.find((candidate) => candidate.kind === kind && candidate.ref === ref);
	if (!found) throw new Error(`no ${kind} entry for '${ref}'`);
	return found;
}

function facet(candidate: DocsCatalogueEntry, label: string): DocsFacet {
	const facets = candidate.facets ?? candidate.subject?.facets ?? [];
	const found = facets.find((item) => item.label === label);
	if (!found) throw new Error(`'${candidate.ref}' has no '${label}' facet`);
	return found;
}

describe("link rows rendered on both ends", () => {
	it("shows entity_containment on the container's page and the contained item's page", () => {
		const container = entry("entity", "kavemouth/adventure/encounter/sister_maelis_1");
		const item = entry("entity", "kavemouth/adventure/loot/q4_fanatic_longsword_plus_1");
		expect(facet(container, "Contains").rows.map((row) => row.entity_key)).toContain(
			"kavemouth/adventure/loot/q4_fanatic_longsword_plus_1",
		);
		expect(facet(item, "Contained in").rows.map((row) => row.container_entity_key)).toContain(
			"kavemouth/adventure/encounter/sister_maelis_1",
		);
	});

	it("shows place_node_traces on the node's place graph page and the trace kind's own page", () => {
		const graph = entry("place_graph", "kavemouth/tomb");
		const traceKind = entry("trace_kind_definition", "kavemouth/adventure/trace/slime_trail");
		expect(facet(graph, "Place node traces").rows.map((row) => row.node_id)).toContain(
			"kavemouth/tomb/entrance",
		);
		expect(facet(traceKind, "Marks these places").rows.map((row) => row.node_id)).toContain(
			"kavemouth/tomb/entrance",
		);
	});

	it("shows spatial_niche_attachments on the node's place graph page and the niche's own page", () => {
		const graph = entry("place_graph", "kavemouth/tomb");
		const niche = entry("niche_definition", "kavemouth/niche/hazard_pool");
		expect(facet(graph, "Niche attachments").rows.map((row) => row.niche_id)).toContain(
			"kavemouth/niche/hazard_pool",
		);
		expect(facet(niche, "Attached places").rows.map((row) => row.place_node_id)).toContain(
			"kavemouth/tomb/pool",
		);
	});

	it("keeps SRD's edge-attached, undefined-niche spatial_niche_attachments row in the basin", () => {
		// `place_edge_id = "0"`, niche `srd/niche/traversable-square` defined
		// nowhere (sk-jay0.3.5.70) — broken content, not a row this projection
		// may give a home by guessing at what it meant.
		expect(entries.some((candidate) => candidate.ref === "srd/niche/traversable-square")).toBe(
			false,
		);
		const srdGraphs = entries.filter(
			(candidate) => candidate.kind === "place_graph" && candidate.ref.startsWith("srd/"),
		);
		for (const graph of srdGraphs) {
			const nicheFacet = graph.facets?.find((item) => item.label === "Niche attachments");
			expect(
				(nicheFacet?.rows ?? []).some((row) => row.niche_id === "srd/niche/traversable-square"),
			).toBe(false);
		}
	});

	it("hosts turn_scheduler on the session definition that names it via turn_scheduler_id, not by id similarity", () => {
		const session = entry("session_definition", "kavemouth/adventure/session/crypt-fight");
		const scheduler = facet(session, "Turn scheduler").rows;
		expect(scheduler).toHaveLength(1);
		expect(scheduler[0]?.id).toBe("kavemouth/adventure/turn/crypt-fight");
	});
});
