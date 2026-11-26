import {
	catalogueIdentities,
	rowCompositeColumns,
	rowIdentityColumns,
} from "@spellkave/srd-cc/docs/row-kind-coverage";
import { ROW_KIND_COMPOSITE_KEY, ROW_KIND_NATURAL_KEY } from "@spellkave/world-author";
import { beforeAll, describe, expect, it } from "vitest";
import {
	collectWitnesses,
	compositeKey,
	emittedArticles,
	emittedCatalogueEntries,
} from "./delivery";
import type { DocsCatalogueEntry } from "./docs-types";
import { realDocsProjection } from "./real-docs-projection";

/**
 * Kavemouth's quest-item definitions (`kavemouth/adventure/item/cult_relic`,
 * `.../moonpetal`, `.../tomb_key`) each have an instance with its own
 * catalogue page (`..._1`) and no page of their own — the instance's page
 * already inlines the definition record as a hosted facet
 * (`project-metadata-docs.ts`'s `definitionsById` pass). Their
 * `kavemouth.art.image` attachment used to reach no reader: it targets the
 * page-less definition, not the instance, so nothing carried it (sk-jay0.3.5.76).
 * It now rides the same hosted-facet join, keyed by the attachment's own
 * `target_kind`/`target_ref` so the witness credits the AUTHORED row rather
 * than a synthetic one.
 */

let entries: DocsCatalogueEntry[] = [];
let witnessed: ReadonlySet<string> = new Set();
let outputRoot = "";

beforeAll(async () => {
	const shared = realDocsProjection();
	outputRoot = shared.outputRoot;
	const index = shared.index;
	entries = [...emittedCatalogueEntries(index, outputRoot)];
	const articles = [...emittedArticles(index, outputRoot)];
	const keys = {
		natural: rowIdentityColumns(ROW_KIND_NATURAL_KEY),
		composite: rowCompositeColumns(ROW_KIND_COMPOSITE_KEY),
	};
	witnessed = collectWitnesses(
		entries,
		articles,
		keys,
		catalogueIdentities(ROW_KIND_NATURAL_KEY),
	).keys;
}, 180_000);

describe("a quest-item definition's art, hosted on its instance's page", () => {
	const cases = [
		{
			instanceRef: "kavemouth/adventure/item/cult_relic_1",
			definitionRef: "kavemouth/adventure/item/cult_relic",
		},
		{
			instanceRef: "kavemouth/adventure/item/moonpetal_1",
			definitionRef: "kavemouth/adventure/item/moonpetal",
		},
		{
			instanceRef: "kavemouth/adventure/item/tomb_key_1",
			definitionRef: "kavemouth/adventure/item/tomb_key",
		},
	];

	it("never gives the page-less definition a catalogue entry of its own", () => {
		for (const { definitionRef } of cases)
			expect(
				entries.find((entry) => entry.kind === "entity_definition" && entry.ref === definitionRef),
			).toBeUndefined();
	});

	for (const { instanceRef, definitionRef } of cases) {
		it(`renders and credits ${definitionRef}'s art on ${instanceRef}'s page`, () => {
			const instance = entries.find(
				(entry) => entry.kind === "entity" && entry.ref === instanceRef,
			);
			expect(instance).toBeDefined();
			const artFacet = instance?.facets?.find(
				(facet) => facet.table === "metadata_attachments" && facet.label.endsWith(": art"),
			);
			expect(artFacet).toBeDefined();
			const row = artFacet?.rows.find(
				(candidate) =>
					candidate.target_kind === "entity_definition" && candidate.target_ref === definitionRef,
			);
			expect(row).toBeDefined();
			expect(typeof row?.asset_href).toBe("string");
			expect(row?.asset_href).not.toBe("");
			expect(row?.namespace).toBe("kavemouth.art.image");

			expect(
				witnessed.has(
					compositeKey(
						"metadata_attachments",
						"entity_definition",
						definitionRef,
						"kavemouth.art.image",
					),
				),
			).toBe(true);
		});
	}
});
