import { beforeAll, describe, expect, it } from "vitest";
import { describeAttachmentAudience } from "./audience-label";
import { emittedCatalogueEntries } from "./delivery";
import type { DocsCatalogueEntry } from "./docs-types";
import { realDocsProjection } from "./real-docs-projection";

/**
 * A catalogue entry with no `DocsSubject`/`DocsResource` carrier used to have
 * nowhere to show the attachments that target it, so Elven Mini's place notes
 * and the SRD's affordance groups reached no reader (sk-jay0.3.5.76). They now
 * ride on the entry itself, and a non-public one says so.
 */

let entries: DocsCatalogueEntry[] = [];
let outputRoot = "";

beforeAll(async () => {
	const shared = realDocsProjection();
	outputRoot = shared.outputRoot;
	const index = shared.index;
	entries = [...emittedCatalogueEntries(index, outputRoot)];
}, 180_000);

describe("attachments on a carrier-less catalogue entry", () => {
	it("shows a place graph's author note on its page, labelled with its audience", () => {
		const region = entries.find(
			(entry) => entry.kind === "place_graph" && entry.ref === "elven_mini/region",
		);
		expect(region?.attachments).toEqual([
			expect.objectContaining({ namespace: "place.note", audience: "frontier.apply_manifest" }),
		]);
		expect(describeAttachmentAudience(region?.attachments?.[0]?.audience ?? "")).toEqual({
			label: "Authors",
			token: "frontier.apply_manifest",
			tier: "warning",
		});
	});

	it("shows metadata targeting a place node on that node's graph page", () => {
		const region = entries.find(
			(entry) => entry.kind === "place_graph" && entry.ref === "elven_mini/region",
		);
		const metadata = region?.facets?.find((facet) => facet.label === "Place node metadata");
		expect(metadata?.table).toBe("metadata_attachments");
		expect(metadata?.rows).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					target_kind: "place_node",
					target_ref: "elven_mini/region/crossroads",
					namespace: "elven_mini.maps.poi",
				}),
			]),
		);
		expect(metadata?.rows).not.toEqual(
			expect.arrayContaining([
				expect.objectContaining({ target_ref: "elven_mini/hamlet/inn_front" }),
			]),
		);
	});

	it("labels a visibility-class-token audience with its human name and reference tier", () => {
		expect(describeAttachmentAudience("hidden")).toEqual({
			label: "Everyone who can see the subject",
			token: "hidden",
			tier: "reference",
		});
	});

	it("carries no audience for a public namespace", () => {
		const grouped = entries.flatMap((entry) =>
			(entry.attachments ?? []).filter((row) => row.namespace === "ui.affordance_group"),
		);
		expect(grouped.length).toBeGreaterThan(0);
		for (const row of grouped) expect(row.audience).toBeUndefined();
	});

	it("never repeats an attachment a subject or resource already carries", () => {
		for (const entry of entries)
			if (entry.subject || entry.resource) expect(entry.attachments).toBeUndefined();
	});
});
