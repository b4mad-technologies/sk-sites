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
	type DeliveryKeys,
	emittedArticles,
	emittedCatalogueEntries,
} from "./delivery";
import type { DocsArticle, DocsCatalogueEntry, DocsSubject } from "./docs-types";
import { realDocsProjection } from "./real-docs-projection";

/**
 * `::subject{...view="full"|"compact"}` embeds a subject inline on an article
 * (sk-jay0.3.5.76). Only `"full"` renders the attachments
 * block (`SubjectView.svelte`); `"compact"` renders a `ReferenceCard`
 * thumbnail and nothing else. The witness must match that exactly — crediting
 * a compact embed's attachments would file the row out of the basin while no
 * reader ever sees more than a thumbnail.
 */

let entries: DocsCatalogueEntry[] = [];
let articles: DocsArticle[] = [];
let keys: DeliveryKeys;
let identities: ReturnType<typeof catalogueIdentities>;
let outputRoot = "";

beforeAll(async () => {
	const shared = realDocsProjection();
	outputRoot = shared.outputRoot;
	const index = shared.index;
	entries = [...emittedCatalogueEntries(index, outputRoot)];
	articles = [...emittedArticles(index, outputRoot)];
	keys = {
		natural: rowIdentityColumns(ROW_KIND_NATURAL_KEY),
		composite: rowCompositeColumns(ROW_KIND_COMPOSITE_KEY),
	};
	identities = catalogueIdentities(ROW_KIND_NATURAL_KEY);
}, 180_000);

describe("full-view embedded subjects", () => {
	it("credits an attachment authored only for the embed, not reachable from the subject's own page", () => {
		// Kavemouth's `adventure-subjects/srd-subjects` article embeds
		// `srd/armor/shield` at `view="full"` to show the art it attaches to the
		// SRD entity. That attachment (`kavemouth.art.image`) exists only in
		// Kavemouth's own flattened manifest — the SRD entity's own catalogue
		// page is built from the SRD-only manifest and never carries it.
		const withoutArticles = collectWitnesses(entries, [], keys, identities).keys;
		const withArticles = collectWitnesses(entries, articles, keys, identities).keys;
		const key = compositeKey(
			"metadata_attachments",
			"entity_definition",
			"srd/armor/shield",
			"kavemouth.art.image",
		);
		expect(withoutArticles.has(key)).toBe(false);
		expect(withArticles.has(key)).toBe(true);
	});

	it("credits every full-view embed's attachments, derived from the real article corpus", () => {
		const expected = new Set<string>();
		for (const article of articles)
			for (const block of article.blocks ?? []) {
				if (block.kind !== "subject" || block.view !== "full") continue;
				const subject = article.subjects?.find(
					(candidate) => candidate.kind === block.subjectKind && candidate.ref === block.ref,
				);
				if (subject === undefined) continue;
				for (const attachment of subject.attachments)
					expected.add(
						compositeKey("metadata_attachments", subject.kind, subject.ref, attachment.namespace),
					);
			}
		expect(expected.size).toBeGreaterThan(0);
		const witnessed = collectWitnesses(entries, articles, keys, identities).keys;
		for (const key of expected) expect(witnessed.has(key)).toBe(true);
	});

	it("finds at least one real compact embed carrying attachments, to keep the negative case honest", () => {
		// If this ever finds none, the corpus stopped exercising the branch below
		// and the unit-level test underneath becomes the only coverage.
		const compactWithAttachments = articles.flatMap((article) =>
			(article.blocks ?? []).flatMap((block) => {
				if (block.kind !== "subject" || block.view !== "compact") return [];
				const subject = article.subjects?.find(
					(candidate) => candidate.kind === block.subjectKind && candidate.ref === block.ref,
				);
				return subject && subject.attachments.length > 0 ? [subject.ref] : [];
			}),
		);
		expect(compactWithAttachments.length).toBeGreaterThan(0);
	});
});

describe("compact-view embedded subjects (isolated)", () => {
	// The real corpus has no subject whose attachments are reachable ONLY
	// through a compact embed (every compact-embedded subject with attachments
	// also owns a catalogue page of its own, which already credits them) — so
	// crediting compact would be silently unobservable end-to-end. This
	// isolates the branch directly against the shapes `collectWitnesses`
	// actually reads, so a regression that starts crediting a compact embed's
	// attachments fails here even though it would pass unnoticed above.
	it('credits nothing for a subject embedded at view="compact"', () => {
		const subject: DocsSubject = {
			kind: "entity",
			ref: "kavemouth/adventure/compact-only",
			bundle_id: "kavemouth",
			display_name: "Compact-only NPC",
			description: "",
			href: "/docs/adventures/kavemouth/cast/subject/entity/compact-only",
			tags: [],
			attachments: [
				{
					bundle_id: "kavemouth",
					namespace: "kavemouth.art.image",
					payload: { path: "kavemouth-art/characters/compact-only.webp" },
				},
			],
			facets: [],
		};
		const article: DocsArticle = {
			id: "compact-only-article",
			title: "Compact-only article",
			href: "/docs/adventures/kavemouth/cast/compact-only-article",
			artifact_href: "/compendium/docs/articles/kavemouth/cast/compact-only-article.json",
			body: "",
			source: { path: "test", anchor: "test", license: "LicenseRef-Spellkave-Proprietary" },
			blocks: [{ kind: "subject", subjectKind: "entity", ref: subject.ref, view: "compact" }],
			subjects: [subject],
		};
		const witnessed = collectWitnesses([], [article], keys, identities).keys;
		expect(
			witnessed.has(
				compositeKey("metadata_attachments", subject.kind, subject.ref, "kavemouth.art.image"),
			),
		).toBe(false);
		expect(witnessed.size).toBe(0);
	});
});
