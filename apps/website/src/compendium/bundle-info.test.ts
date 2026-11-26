import { beforeAll, describe, expect, it } from "vitest";
import type { CompendiumCensus } from "./compendium-census";
import committedCensus from "./compendium-census.json";
import type { DocsFacet, DocsIndexV1, DocsPage } from "./docs-types";
import { realDocsProjection } from "./real-docs-projection";

const census = committedCensus as unknown as CompendiumCensus;
/** Shown on every drift so a red run always names the fix, never just a number. */
const DRIFT = "compendium census drift: run `just website-census`";

/**
 * "About this bundle": every registered root's own docs page carries its own
 * `[[bundles]]` row plus the rows it owns (`movement_defaults`,
 * `metadata_namespaces`), read from the root's OWN manifest source rather
 * than the merged dependency closure — a dependent bundle's page must never
 * show a dependency's own bundle info (sk-jay0.3.5.76).
 */

let index: DocsIndexV1;

beforeAll(async () => {
	index = realDocsProjection().index;
}, 180_000);

function page(pageId: string): DocsPage {
	const found = index.pages.find((candidate) => candidate.page_id === pageId);
	if (!found) throw new Error(`no docs page '${pageId}'`);
	return found;
}

function facet(bundle: NonNullable<DocsPage["bundle"]>, label: string): DocsFacet {
	const found = bundle.facets.find((candidate) => candidate.label === label);
	if (!found) throw new Error(`'${bundle.ref}' bundle has no '${label}' facet`);
	return found;
}

describe("about this bundle", () => {
	it("shows the SRD root's own bundle row, movement defaults, namespaces and hosted session", () => {
		const bundle = page("srd").bundle;
		if (!bundle) throw new Error("srd page has no bundle block");
		expect(bundle.ref).toBe("srd");
		expect(bundle.display_name).not.toBe("");
		expect(bundle.version).not.toBe("");
		expect(bundle.author).not.toBe("");
		expect(bundle.depends_on).toEqual([]);
		expect(facet(bundle, "Movement defaults").rows, DRIFT).toHaveLength(
			census.bundle_info.srd_movement_defaults,
		);
		expect(facet(bundle, "Metadata namespaces").rows, DRIFT).toHaveLength(
			census.bundle_info.srd_metadata_namespaces,
		);
		// `srd/long_running_move` is the session `srd`'s own movement default
		// names inside `bindings_json` — page-less itself, hosted beside the
		// movement default that names it rather than left in the basin.
		const sessions = facet(bundle, "Session definitions").rows;
		expect(sessions.map((row) => row.session_def_id)).toContain("srd/long_running_move");
		// Long Rest opens a session through its action row rather than movement
		// bindings; its complete definition must also reach this bundle page.
		expect(sessions).toContainEqual(
			expect.objectContaining({
				session_def_id: "srd/long_rest",
				termination_pred:
					"world.tick - session.stat('opened_at') >= session.stat('promoted_duration_ticks')",
			}),
		);
	});

	it("shows Elven Mini's own bundle row and its own movement defaults and namespaces, not SRD's or DM's", () => {
		const bundle = page("elven-mini").bundle;
		if (!bundle) throw new Error("elven-mini page has no bundle block");
		expect(bundle.ref).toBe("elven_mini");
		expect(bundle.depends_on).toEqual(["srd", "dm"]);
		expect(facet(bundle, "Movement defaults").rows, DRIFT).toHaveLength(
			census.bundle_info.elven_mini_movement_defaults,
		);
		expect(facet(bundle, "Metadata namespaces").rows.map((row) => row.namespace)).toEqual([
			"place.note",
			"elven_mini.art.image",
			"elven_mini.maps.poi",
		]);
		// Elven Mini's own movement default also names `srd/long_running_move`
		// inside its `bindings_json`, but that session is SRD's own authored
		// row, not Elven Mini's — the dependency-closure trap this block exists
		// to avoid, so no "Session definitions" facet is hosted here.
		expect(bundle.facets.some((candidate) => candidate.label === "Session definitions")).toBe(
			false,
		);
	});

	it("gives DM's root page a bundle block with only its own record", () => {
		const bundle = page("runtime").bundle;
		if (!bundle) throw new Error("runtime page has no bundle block");
		expect(bundle.ref).toBe("dm");
		expect(bundle.depends_on).toEqual(["srd"]);
		// dm authors no movement defaults of its own. The seed bundle keeps only
		// the public affordance-input contract and audience-trace prompt schema;
		// authored menu acts supply each current occurrence's presentation.
		expect(bundle.facets.map((facet) => facet.label)).toEqual([
			"Bundle record",
			"Metadata namespaces",
		]);
		expect(bundle.facets[0]?.rows).toEqual([expect.objectContaining({ bundle_id: "dm" })]);
		expect(facet(bundle, "Metadata namespaces").rows.map((row) => row.namespace)).toEqual([
			"ui.affordance_input",
			"dialogue.prompt",
		]);
	});
});
