import { beforeAll, describe, expect, it } from "vitest";
import { emittedCatalogueEntries } from "./delivery";
import type { DocsCatalogueEntry, DocsFacet } from "./docs-types";
import { realDocsProjection } from "./real-docs-projection";

/**
 * A `place_edges` row with `place_graph_id = ""` connects a node of one place
 * graph to a node of another — Kavemouth's region<->hamlet road, tomb<->
 * deep_tomb stair, and 14 more (sk-jay0.3.5.76). Owner
 * decision: such an edge renders on BOTH endpoint graphs' pages, derived from
 * each end's own node rather than authored twice. `place_edge_affordance`/
 * `spatial_environment_state` rows keyed to that edge ride along beside it,
 * wherever it shows.
 */

let entries: DocsCatalogueEntry[] = [];
let outputRoot = "";

beforeAll(async () => {
	const shared = realDocsProjection();
	outputRoot = shared.outputRoot;
	const index = shared.index;
	entries = [...emittedCatalogueEntries(index, outputRoot)];
}, 180_000);

function placeGraph(ref: string): DocsCatalogueEntry {
	const entry = entries.find(
		(candidate) => candidate.kind === "place_graph" && candidate.ref === ref,
	);
	if (!entry) throw new Error(`no place_graph entry for '${ref}'`);
	return entry;
}

function facet(entry: DocsCatalogueEntry, label: string): DocsFacet {
	const found = entry.facets?.find((candidate) => candidate.label === label);
	if (!found) throw new Error(`'${entry.ref}' has no '${label}' facet`);
	return found;
}

describe("cross-map place edges", () => {
	it("shows both directions of a cross-map edge on both endpoint graphs' pages", () => {
		const region = facet(placeGraph("kavemouth/region"), "Connections to other maps");
		const hamlet = facet(placeGraph("kavemouth/hamlet"), "Connections to other maps");
		for (const key of [
			"kavemouth/region/road_south->kavemouth/hamlet/gate",
			"kavemouth/hamlet/gate->kavemouth/region/road_south",
		]) {
			expect(region.rows.map((row) => row.edge_key)).toContain(key);
			expect(hamlet.rows.map((row) => row.edge_key)).toContain(key);
		}
	});

	it("never shows an in-graph edge as a cross-map connection", () => {
		const region = facet(placeGraph("kavemouth/region"), "Connections to other maps");
		expect(region.rows.map((row) => row.edge_key)).not.toContain(
			"kavemouth/region/waymeet->kavemouth/region/road_north",
		);
	});

	it("credits an in-graph edge offer beside its edge", () => {
		// The Ironfold-warded tomb<->deep_tomb stair carries a cross-map offer;
		// the tomb's own hall<->sealed_vault door carries an in-graph one. Both
		// used to be in the basin — `place_edge_affordance` has no page of its
		// own to render on.
		const offers = facet(placeGraph("kavemouth/tomb"), "Edge offers");
		expect(offers.rows.map((row) => row.edge_key)).toEqual(
			expect.arrayContaining([
				"kavemouth/tomb/hall->kavemouth/tomb/sealed_vault",
				"kavemouth/tomb/sealed_vault->kavemouth/tomb/hall",
			]),
		);
	});

	it("credits a cross-map edge offer, and its state, on both endpoint graphs", () => {
		const edgeKey = "kavemouth/tomb/crypt->kavemouth/deep_tomb/stair_from_tomb";
		for (const ref of ["kavemouth/tomb", "kavemouth/deep_tomb"]) {
			const entry = placeGraph(ref);
			expect(facet(entry, "Edge offers").rows.map((row) => row.edge_key)).toContain(edgeKey);
			expect(facet(entry, "Edge state").rows.map((row) => row.place_edge_key)).toContain(edgeKey);
		}
	});
});
