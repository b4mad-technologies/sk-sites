import { beforeAll, describe, expect, it } from "vitest";
import type { CompendiumCensus } from "./compendium-census";
import committedCensus from "./compendium-census.json";
import { emittedCatalogueEntries } from "./delivery";
import type { DocsCatalogueEntry } from "./docs-types";
import { realDocsProjection } from "./real-docs-projection";

const census = committedCensus as unknown as CompendiumCensus;
/** Shown on every drift so a red run always names the fix, never just a number. */
const DRIFT = "compendium census drift: run `just website-census`";

/**
 * `tag_capability_grant` runs tag -> capability, the opposite direction from
 * every other tag junction: the tag hands the capability out rather than being
 * worn by it. It therefore cannot ride the uniform tag pass, and the thing worth
 * asserting is that BOTH ends carry the edge — a grant listed only on the tag's
 * page is exactly the half-delivered state sk-jay0.3.5.71.4 exists to end.
 */

let entries: DocsCatalogueEntry[] = [];
let outputRoot = "";

beforeAll(async () => {
	const shared = realDocsProjection();
	outputRoot = shared.outputRoot;
	const index = shared.index;
	entries = [...emittedCatalogueEntries(index, outputRoot)];
}, 180_000);

describe("capability grants", () => {
	it("carries every grant from both ends — every tag now has a page (sk-jay0.3.5.76)", () => {
		// The `no_page_namespaces` carve-out that used to keep `srd.dm_npc.*` off
		// the reader is retired: every tag gets a page, so a grant's tag-side and
		// capability-side counts must match exactly, with no more "granted from
		// the capability and nowhere else" gap. The absolute total lives in
		// `compendium-census.json` (`just website-census` regenerates it).
		const backward = entries.flatMap((e) => e.granting_tags ?? []);
		const forward = entries.reduce((sum, e) => sum + (e.granted_capabilities?.length ?? 0), 0);
		expect(backward, DRIFT).toHaveLength(census.capability_grants.backward);
		expect(forward).toBe(backward.length);
	});

	it("makes every direction a link — no tag chip is pageless anymore", () => {
		for (const entry of entries) {
			for (const granted of entry.granted_capabilities ?? []) expect(granted.href).toBeTruthy();
			// A bare chip used to be correct for a tag `no_page_namespaces`
			// deliberately kept off the reader. That carve-out is retired, so ANY
			// bare chip now is a dead label and worth stopping for — the
			// sk-jay0.3.5.73 shape, a tag used and never declared.
			for (const tag of entry.granting_tags ?? []) expect(tag.href, tag.tag).toBeTruthy();
		}
	});

	it("pairs each end with the other, not with itself", () => {
		const pairs = new Set<string>();
		for (const entry of entries)
			for (const granted of entry.granted_capabilities ?? [])
				pairs.add(`${entry.ref} ${granted.ref}`);
		for (const entry of entries)
			for (const tag of entry.granting_tags ?? [])
				expect(pairs.has(`${tag.tag} ${entry.ref}`), tag.tag).toBe(true);
	});

	it("never turns a grant into a claim of membership", () => {
		// "Tagged with X" means the entry WEARS the tag. A granted capability does
		// not wear it, and folding the two together would make the tag page assert
		// a membership the manifest never authored. A granted capability may still
		// appear in the member list — but only when it really does carry the tag.
		const tagsOf = new Map(
			entries.map((entry) => [`${entry.kind}:${entry.ref}`, entry.tags ?? []]),
		);
		for (const entry of entries) {
			if (!entry.granted_capabilities?.length) continue;
			const members = new Set((entry.members ?? []).map((row) => row.ref));
			for (const granted of entry.granted_capabilities) {
				if (!members.has(granted.ref)) continue;
				expect(
					tagsOf.get(`capability_definition:${granted.ref}`),
					`${granted.ref} is listed as wearing ${entry.ref} but does not carry it`,
				).toContain(entry.ref);
			}
		}
	});
});
