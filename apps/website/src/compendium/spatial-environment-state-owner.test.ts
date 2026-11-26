import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { emittedCatalogueEntries } from "./delivery";
import type { DocsCatalogueEntry, DocsTechnicalTable } from "./docs-types";
import { type DocsProjectionRoot, projectMetadataDocsIndex } from "./project-metadata-docs";

/**
 * `spatial_environment_state` is three-way polymorphic: a row sets exactly one
 * of `place_node_id` / `place_edge_key` / `location_def_id`
 * (`SpatialEnvironmentStateRow`, `crates/spellkave-schema/src/lib.rs`).
 * The edge-keyed case already rides beside its edge (`cross-map-place-edges
 * .test.ts`); no registered root authors a node-keyed or location-keyed row
 * today (sk-jay0.3.5.78 measured zero), so this constructs its own fixture
 * rather than relying on real content to exercise either.
 */

let dir = "";
const temporaryDirs: string[] = [];
afterEach(() => {
	for (const path of temporaryDirs.splice(0)) rmSync(path, { recursive: true, force: true });
});

function setup(): { root: string; outputRoot: string } {
	dir = mkdtempSync(join(tmpdir(), "spellkave-spatial-state-owner-"));
	temporaryDirs.push(dir);
	const outputRoot = mkdtempSync(join(tmpdir(), "spellkave-spatial-state-owner-out-"));
	temporaryDirs.push(outputRoot);
	const root = join(dir, "manifest.toml");
	writeFileSync(
		root,
		`#:schema https://spellkave.dev/schema/world-manifest-1.0.0.json
schema_version = "1.0.0"
[[bundles]]
bundle_id = "guide"
display_name = "guide"
author = "test"
version = "1.0.0"
depends_on = []
description = "test"
[metadata.docs]
version = 1
page_id = "guide"
title = "guide title"
nav_group = "reference"
intro = "guide intro"
[[metadata.docs.sections]]
id = "zeta"
title = "Zeta"
intro = "Zeta intro"
[[metadata.docs.sections.catalogue]]
kind = "place_graph"
ref = "guide/region"
family = "place"
slug = "region"

[[place_graphs]]
place_graph_id = "guide/region"
display_name = "Region"
description = "Region description."
bundle_id = "guide"
substrate_id = "indoor"
anchor_node_id = ""
parent_graph_id = ""
blueprint_id = ""
is_ephemeral_instance = false
bearing = 0.0
metres_per_unit = 1.0
origin_cell_res4 = 0
origin_cell_res7 = 0
origin_cell_res10 = 0

[[place_nodes]]
node_id = "guide/region/room"
bundle_id = "guide"
place_graph_id = "guide/region"
local_id = "room"
substrate_id = "indoor"
display_name = "Room"

[[spatial_environment_state]]
bundle_id = "guide"
place_node_id = "guide/region/room"
place_edge_key = ""
location_def_id = ""
state_id = "guide/state/lit"
value_bool = true
updated_tick = 0

[[spatial_environment_state]]
bundle_id = "guide"
place_node_id = ""
place_edge_key = ""
location_def_id = "guide/nowhere"
state_id = "guide/state/haunted"
value_bool = true
updated_tick = 0
`,
	);
	return { root, outputRoot };
}

describe("spatial_environment_state owner candidates", () => {
	it("credits a node-keyed row on its graph's page, beside the place node it names", async () => {
		const { root, outputRoot } = setup();
		const index = projectMetadataDocsIndex(
			[{ rootManifestPath: root } satisfies DocsProjectionRoot],
			join(outputRoot, "index.json"),
		);
		const entries = [...emittedCatalogueEntries(index, outputRoot)];
		const region = entries.find(
			(entry) => entry.kind === "place_graph" && entry.ref === "guide/region",
		) as DocsCatalogueEntry;
		expect(region).toBeDefined();
		const facet = region.facets?.find((candidate) => candidate.label === "Place node state");
		expect(facet).toBeDefined();
		expect(facet?.rows.map((row) => row.state_id)).toEqual(["guide/state/lit"]);
	});

	it("leaves a location-keyed row in the overflow basin: no page kind renders location_definitions", async () => {
		const { root, outputRoot } = setup();
		const index = projectMetadataDocsIndex(
			[{ rootManifestPath: root } satisfies DocsProjectionRoot],
			join(outputRoot, "index.json"),
		);
		const entries = [...emittedCatalogueEntries(index, outputRoot)];
		const region = entries.find(
			(entry) => entry.kind === "place_graph" && entry.ref === "guide/region",
		) as DocsCatalogueEntry;
		const stateFacet = region.facets?.find((candidate) => candidate.label === "Place node state");
		expect(stateFacet?.rows.map((row) => row.state_id)).not.toContain("guide/state/haunted");
		const basinRows: Record<string, unknown>[] = [];
		for (const source of index.technical_sources ?? [])
			for (const summary of source.tables) {
				if (summary.table !== "spatial_environment_state") continue;
				const artifact = JSON.parse(
					readFileSync(join(outputRoot, summary.href.slice("/compendium/docs/".length)), "utf8"),
				) as DocsTechnicalTable;
				basinRows.push(...artifact.rows);
			}
		expect(basinRows.map((row) => row.state_id)).toContain("guide/state/haunted");
	});
});
