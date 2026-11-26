import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
	catalogueIdentities,
	POLYMORPHIC_OWNER,
	rowCompositeColumns,
	rowIdentityColumns,
	rowKindCoverage,
} from "@spellkave/srd-cc/docs/row-kind-coverage";
import {
	inspectManifest,
	loadFlattened,
	ROW_KIND_COMPOSITE_KEY,
	ROW_KIND_NATURAL_KEY,
} from "@spellkave/world-author";
import { beforeAll, describe, expect, it } from "vitest";
import {
	type DeliveryReport,
	emittedCatalogueEntries,
	measureDelivery,
	publicRow,
	sourceDigest,
} from "./delivery";
import committed from "./delivery-report.json";
import type { DocsIndexV1 } from "./docs-types";
import { buildTechnicalDocsProjection, type DocsProjectionRoot } from "./project-metadata-docs";
import { realDocsProjection } from "./real-docs-projection";

/**
 * How many manifest rows a reader can actually see, pinned the way the census
 * pins content.
 *
 * The number is expected to IMPROVE — undelivered rows fall as owner rows and
 * relation edges get delivered (sk-jay0.3.5.71). A rise is the case worth
 * stopping for: something that used to be shown stopped being shown.
 */

let report: DeliveryReport;
let outputRoot = "";
let index: DocsIndexV1;
let manifest: Record<string, unknown>;
let roots: readonly DocsProjectionRoot[] = [];

beforeAll(async () => {
	const shared = realDocsProjection();
	outputRoot = shared.outputRoot;
	const registry = (await import(
		pathToFileURL(resolve(import.meta.dirname, "../../scripts/metadata-docs-registry.mts")).href
	)) as { DOCS_PROJECTION_ROOTS: readonly DocsProjectionRoot[] };
	roots = registry.DOCS_PROJECTION_ROOTS;
	index = shared.index;
	manifest = inspectManifest(
		loadFlattened(
			resolve(import.meta.dirname, "../../../../packages/spellkave-srd-cc/fixtures"),
			"manifest.toml",
		),
	).manifest as Record<string, unknown>;
	report = measureDelivery(
		manifest,
		index,
		outputRoot,
		{
			natural: rowIdentityColumns(ROW_KIND_NATURAL_KEY),
			composite: rowCompositeColumns(ROW_KIND_COMPOSITE_KEY),
		},
		catalogueIdentities(ROW_KIND_NATURAL_KEY),
	);
}, 180_000);

const expected = committed as unknown as DeliveryReport;

describe("reader delivery", () => {
	it("matches the committed report, naming any kind that moved", () => {
		const before = new Map(expected.kinds.map((kind) => [kind.kind, kind]));
		const after = new Map(report.kinds.map((kind) => [kind.kind, kind]));
		const moved: string[] = [];
		for (const kind of new Set([...before.keys(), ...after.keys()])) {
			const left = before.get(kind);
			const right = after.get(kind);
			if (!left) moved.push(`${kind}: new kind (${right?.undelivered} undelivered)`);
			else if (!right) moved.push(`${kind}: kind gone`);
			else if (left.undelivered !== right.undelivered)
				moved.push(`${kind}: ${left.undelivered} -> ${right.undelivered} undelivered`);
		}
		expect(
			moved,
			moved.length > 0
				? `reader delivery changed — regenerate deliberately with 'just website-census' after confirming the change is intended:\n${moved.join("\n")}`
				: "",
		).toEqual([]);
	}, 180_000);

	it("never lets fewer rows reach a reader than the committed report records", () => {
		// The one-way ratchet. The pin above catches any movement; this catches
		// the direction that is always a regression, even if someone regenerates
		// the pin without reading it.
		expect(report.delivered).toBeGreaterThanOrEqual(expected.delivered);
	});

	it("counts a kind as delivered only when a witness proves it", () => {
		// The whole design in one assertion: no witness, no credit. A kind that
		// is merely CLASSIFIED as belonging somewhere must still read as
		// undelivered until something shows it.
		for (const kind of report.kinds) if (kind.witness === null) expect(kind.delivered).toBe(0);
	});

	it("only lets a facet claim a table whose rows it actually holds", () => {
		// A facet's `table` is what turns "some rows are dumped on this page" into
		// "these owner-surfaced rows reach a reader". The label is presentation and
		// must never be the source of that claim, so the claim is checked instead:
		// every row of a facet declaring a table must appear, byte for byte once
		// the projection's own additions are removed, in that manifest table.
		//
		// This is the half the page/basin partition cannot catch on its own. Both
		// sides of that partition consult the same witness, so a witness that
		// credits too much filters the row out of the basin as well and the two
		// stay consistent while the reader sees nothing.
		// Across EVERY loaded source, not just the SRD: a facet belongs to whichever
		// bundle authored its subject, and checking one manifest calls every elven
		// mini actor row an invention.
		const manifestRows = new Map<string, Set<string>>();
		for (const tables of buildTechnicalDocsProjection(roots).tables.values())
			for (const [table, tableRows] of tables) {
				const seen = manifestRows.get(table) ?? new Set<string>();
				for (const row of tableRows) {
					seen.add(JSON.stringify(row));
					// Allowlisted facets prove both full-source identity and the
					// exact public projection, including containment policy links.
					seen.add(JSON.stringify([sourceDigest(table, row), publicRow(table, row)]));
				}
				manifestRows.set(table, seen);
			}
		const offenders: string[] = [];
		for (const entry of emittedCatalogueEntries(index, outputRoot))
			for (const facet of [...(entry.facets ?? []), ...(entry.subject?.facets ?? [])]) {
				if (facet.table === undefined) continue;
				const authored = manifestRows.get(facet.table);
				for (const [index, row] of facet.rows.entries()) {
					const stripped = Object.fromEntries(
						Object.entries(row).filter(([key]) => !(facet.derived ?? []).includes(key)),
					);
					const claimed =
						facet.source_digests === undefined ? stripped : [facet.source_digests[index], stripped];
					if (!authored?.has(JSON.stringify(claimed)))
						offenders.push(`${entry.ref}: facet '${facet.label}' claims '${facet.table}'`);
				}
			}
		expect([...new Set(offenders)]).toEqual([]);
	}, 180_000);

	it("links every owned row to its owner by its declared join column", () => {
		// The premise of the generic owner-facet pass. `row-kind-coverage.toml`
		// names the table a kind belongs to, and the column joining them is that
		// owner's natural key from the kernel — unless the kind authors an
		// `owner_field` for the few whose own column disagrees with the owner's
		// key name. No table of parent columns lives here, and none should ever
		// appear. Measured across the SRD corpus the rule is exact, so a new
		// owner-surfaced kind that does not follow it should stop this test
		// rather than quietly render nothing on its owner's page.
		const offenders: string[] = [];
		for (const owned of rowKindCoverage()) {
			if (owned.surface !== "owner" || owned.owner === undefined) continue;
			if (owned.owner === POLYMORPHIC_OWNER) continue;
			const ownedRows = manifest[owned.kind];
			if (!Array.isArray(ownedRows) || ownedRows.length === 0) continue;
			const joinField = owned.owner_field ?? ROW_KIND_NATURAL_KEY[owned.owner];
			if (joinField === undefined) {
				offenders.push(`${owned.kind}: owner '${owned.owner}' has no kernel identity column`);
				continue;
			}
			const ownerKey = ROW_KIND_NATURAL_KEY[owned.owner];
			const ownerIds = new Set(
				((manifest[owned.owner] ?? []) as Record<string, unknown>[]).map((row) =>
					ownerKey === undefined ? undefined : row[ownerKey],
				),
			);
			const unresolved = (ownedRows as Record<string, unknown>[]).filter(
				(row) => !ownerIds.has(row[joinField]),
			).length;
			if (unresolved > 0)
				offenders.push(
					`${owned.kind}: ${unresolved} of ${ownedRows.length} rows name no '${owned.owner}' through '${joinField}'`,
				);
		}
		expect(offenders).toEqual([]);
	});

	it("hosts a page-less family wherever the manifest names it, never beside its own page", () => {
		// sk-jay0.3.5.72: some entity definitions deliberately get no page — a
		// monster's bite, a fighting-style menu member — and render on the page of
		// the thing they belong to instead.
		//
		// SEVERAL HOSTS ARE CORRECT, and this assertion used to forbid them. The
		// reader shows what the manifest says, and the manifest says an expertise
		// option is granted by rogue AND bard, six of them also by wizard; it
		// appears on each. Its own tag claims only `srd.class.rogue`, which is a
		// content bug (sk-jay0.3.5.74), not a reason to show the reader a single
		// arbitrary owner.
		//
		// What stays forbidden is a row hosted somewhere while ALSO holding a page
		// of its own — the duplication the hosting exists to avoid.
		const hostsById = new Map<string, Set<string>>();
		const pagedDefinitions = new Set<string>();
		const duplicatedOnOnePage: string[] = [];
		for (const entry of emittedCatalogueEntries(index, outputRoot)) {
			if (entry.kind === "entity_definition") pagedDefinitions.add(entry.ref);
			const onThisPage = new Set<string>();
			for (const facet of entry.facets ?? []) {
				if (facet.table !== "entity_definitions") continue;
				for (const row of facet.rows) {
					const id = row.entity_def_id;
					if (typeof id !== "string") continue;
					if (onThisPage.has(id)) duplicatedOnOnePage.push(`${entry.ref}: ${id}`);
					onThisPage.add(id);
					hostsById.set(id, (hostsById.get(id) ?? new Set()).add(entry.ref));
				}
			}
		}
		expect([...hostsById.keys()].filter((id) => pagedDefinitions.has(id))).toEqual([]);
		// And never twice on the SAME page. The grouped listing's own rows name
		// every member, so a scan that also inlines what it finds prints each
		// advancement choice both in the group and as its own block — ninety
		// collapsed blocks under a list of ninety. Caught by opening the page, not
		// by any number.
		expect(duplicatedOnOnePage).toEqual([]);
		// The late-spawn companion no longer installs item instances at load.
		// These three starter-kit definitions now have their own authored pages,
		// so each must remain readable there and must not also be hosted.
		const starterKitPages = [
			"elven_mini/item/field_kit",
			"elven_mini/item/rations",
			"elven_mini/item/torch",
		];
		for (const id of starterKitPages) {
			expect(pagedDefinitions.has(id), `${id} has its own starter-kit page`).toBe(true);
			expect(hostsById.has(id), `${id} is not duplicated on a host`).toBe(false);
		}
		// Measured: 279 advancement choices on their class, natural weapons on
		// the creature wielding them (105 CR 0–4 plus the sk-jay0.3.10.1 CR 5+
		// seeds), 24 expertise/skill options on every class that grants them, and
		// adventure items. Preserve the complete 584-definition census across
		// the three items' move from instance-hosted definitions to their own
		// pages; every hosted definition is still checked above.
		expect(hostsById.size + starterKitPages.length).toBe(584);
	}, 180_000);

	it("accounts for every authored row exactly once", () => {
		for (const kind of report.kinds) expect(kind.delivered + kind.undelivered).toBe(kind.authored);
		expect(report.delivered + report.undelivered).toBe(report.authored);
	});
});
