/**
 * What the manifest CORPUS contains, read without any reader in mind.
 *
 * `buildTechnicalDocsProjection` has two modes and this file exercises the
 * unfiltered one: every authored occurrence, exactly once, in stable order.
 * That is deliberately NOT what ships. Since sk-jay0.3.5.71.2 the emitted
 * technical artifacts are an overflow basin holding only the occurrences no
 * rich page shows, and the corpus read here is what the coverage validator
 * checks that basin against — the two halves have to be compared with
 * something, and this is that something.
 *
 * So a count in this file is a claim about the AUTHORED corpus. A count about
 * what a reader can reach belongs in `delivery.test.ts`; a count about what the
 * basin still carries belongs in `docs-coverage-validator.test.ts`.
 */
import { createHash } from "node:crypto";
import { rowIdentityColumns } from "@spellkave/srd-cc/docs/row-kind-coverage";
import {
	loadBundleChainDetailed,
	ROW_KIND_COMPOSITE_KEY,
	ROW_KIND_NATURAL_KEY,
} from "@spellkave/world-author";
import { beforeAll, describe, expect, it } from "vitest";
import type { CompendiumCensus } from "./compendium-census";
import {
	MANIFEST_COVERAGE_PROJECTION_ROOTS as DOCS_PROJECTION_ROOTS,
	manifestRowCount,
	projectedRows,
} from "./compendium-census";
import committedCensus from "./compendium-census.json";
import { occurrenceKey } from "./delivery";
import { buildTechnicalDocsProjection } from "./project-metadata-docs";

const census = committedCensus as unknown as CompendiumCensus;
/** Shown on every drift so a red run always names the fix, never just a number. */
const DRIFT = "compendium census drift: run `just website-census`";

function loadedRegisteredRoots() {
	return DOCS_PROJECTION_ROOTS.map((root) =>
		loadBundleChainDetailed({
			rootManifestPath: root.rootManifestPath,
			resolveDependency: (bundleId) => root.dependencyPaths?.[bundleId],
		}),
	);
}

function canonical(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
	if (value !== null && typeof value === "object") {
		return `{${Object.entries(value as Record<string, unknown>)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
			.join(",")}}`;
	}
	return JSON.stringify(value);
}

let loaded: ReturnType<typeof loadedRegisteredRoots>;
let projection: ReturnType<typeof buildTechnicalDocsProjection>;

beforeAll(() => {
	loaded = loadedRegisteredRoots();
	projection = buildTechnicalDocsProjection(DOCS_PROJECTION_ROOTS);
}, 60_000);

describe("registered manifest corpus", () => {
	it("loads the two intended dependency closures in stable dependency-first order", () => {
		expect(loaded.map((root) => root.sources.flatMap((source) => source.bundleIds))).toEqual([
			["srd"],
			["srd", "dm", "kavemouth"],
		]);
		// The Kavemouth map contract adds one metadata namespace, fifteen
		// node-targeted POI attachments, and one observer actor identity.
		// +19 rows: the telepathy-stone companion lane (sk-jay0.3.4.18 — stone
		// entity def + tag, command capabilities, markers, gift action, grants).
		// +15 rows: the companion command verbs (sk-jay0.1.23.20 — hold/follow/
		// cancel action + outcome + affordance + consequence chains, plus the
		// shared trace kind).
		// +58 / +58 rows: the current SRD corpus adds the missing consequence
		// writes and grants to both registered closures.
		// +245 on the Kavemouth closure: DM creation's stable identity/input
		// affordance cluster (picks, typed forms, adopt handles, metadata).
		// +387 / +387 rows: magic weapon and armor variants now publish their
		// composed effect-badge art attachments in both registered closures.
		// +106 on the DM/Kavemouth closure: ADR-0142 D-5/D-6 — the four
		// `dm/prompt/creation/*` prompt_definitions rows, the `core`-audience
		// `audience_kind_definitions` reference, the `dm/dialog/prompt`
		// resource and its `dm/dialog/prompt/set/*` action family, and the
		// `dialogue.prompt` metadata namespace/attachments carrying their
		// presentation copy.
		// +25 on the Kavemouth closure: the twelve `kavemouth/prompt/quest/*`
		// prompt_definitions rows wired by sk-jay0.2.33.15.7 and their
		// `dialogue.prompt` label attachments.
		// +6 on both closures (sk-jay0.3.17): srd/item/chest — entity_definitions,
		// two entity_definition_initial_state rows (cost/weight), two
		// entity_definition_tag rows (srd.item.gear/srd.item.container), and its
		// srd.text metadata_attachments row.
		// +5 on the Kavemouth closure only (sk-jay0.1.23.36.22.2): the loft
		// chest — 1 chest entity + 2 potion entities + 2 entity_containment
		// rows (loose carriage, no local entity_definition — both instantiate
		// the already-counted SRD blueprints above).
		// +211 on both closures (sk-jay0.3.18): 41 adventuring-gear catalogue
		// items (5 rows each, plus a container tag on the 6 whose capacity unit
		// is solid, volume, weight, or a counted item — not liquid-only).
		// +9 on both closures (sk-jay0.1.23.36.22.4): srd/pickup —
		// capability_definitions, capability_definition_tag, niche_definitions,
		// action_definitions, consequence_templates, consequence_frame_writes,
		// outcome_templates, affordance_templates, and the srd.creature ->
		// srd/action/pickup tag_capability_grant row.
		//
		// The absolute totals live in `compendium-census.json`, regenerated by
		// `just website-census` — the "+N because" trail above belongs to the
		// commit that moved the number, not to this comment.
		expect(
			loaded.map((root) => manifestRowCount(root.manifest)),
			DRIFT,
		).toEqual([census.manifest_rows.srd, census.manifest_rows.kavemouth]);
	});

	it("projects every non-include occurrence once when no basin filter is applied", () => {
		// The Kavemouth closure is the union of the three unique registered
		// sources: SRD, DM, and Kavemouth. The separately registered SRD root is
		// intentionally not projected a second time.
		const expected = manifestRowCount(loaded[1]?.manifest ?? {});
		const actual = projectedRows(projection.tables);

		expect(projection.sources.map((source) => source.source_id)).toEqual([
			"dm",
			"kavemouth",
			"srd",
		]);
		expect(expected, DRIFT).toBe(census.manifest_rows.kavemouth);
		expect(actual).toHaveLength(expected);
		expect(projection.sources.reduce((sum, source) => sum + source.row_count, 0)).toBe(expected);
	});

	it("drops every occurrence a page shows, and only those, when filtered", () => {
		// The filter is keyed on the KERNEL's row identity, not on row equality.
		// `srd/attack_roll` is declared nine times, byte-identically; one witness
		// for that target must remove all nine, because the one page a reader
		// opens is what shows them. Nothing else may move.
		const keys = {
			natural: rowIdentityColumns(ROW_KIND_NATURAL_KEY),
			composite: ROW_KIND_COMPOSITE_KEY,
		};
		const before = projectedRows(projection.tables);
		const shown = before.filter(
			(item) =>
				item.table === "modifier_target_definitions" && item.row.target_id === "srd/attack_roll",
		);
		expect(shown, DRIFT).toHaveLength(census.modifier_target_definitions.attack_roll_occurrences);
		const filtered = buildTechnicalDocsProjection(
			DOCS_PROJECTION_ROOTS,
			new Set([occurrenceKey(shown[0]!.table, shown[0]!.row, keys)]),
		);
		const after = projectedRows(filtered.tables);
		expect(before.length - after.length, DRIFT).toBe(
			census.modifier_target_definitions.attack_roll_occurrences,
		);
		expect(
			after.filter(
				(item) =>
					item.table === "modifier_target_definitions" && item.row.target_id === "srd/attack_roll",
			),
		).toHaveLength(0);
		// Summary counts follow the rows they summarise, or the basin's reported
		// size stops matching what it actually holds.
		expect(filtered.sources.reduce((sum, source) => sum + source.row_count, 0)).toBe(after.length);
	}, 60_000);

	it("retains ownerless satellites instead of treating bundle_id as row identity", () => {
		const rows = projectedRows(projection.tables);
		const counts = (table: string) => rows.filter((item) => item.table === table).length;

		// +2: the gift action's two writes (InsertItem + marker flip).
		// +38: the current SRD corpus's additional consequence writes.
		// +33: DM creation identity/input actions each inscribe a speech
		// trace write on their consequence.
		// +17: ADR-0142 D-5/D-6 — each `dm/dialog/prompt/set/<id>` action's
		// consequence writes the talker's own `dm/dialog/prompt` stat.
		// +1 (sk-jay0.1.23.36.22.4): srd/pickup's own PickupTargetItem write.
		//
		// Absolute totals live in `compendium-census.json`, via `just website-census`.
		expect(counts("consequence_frame_writes"), DRIFT).toBe(
			census.table_occurrences.consequence_frame_writes,
		);
		expect(counts("roll_table_entries"), DRIFT).toBe(census.table_occurrences.roll_table_entries);
		expect(counts("place_edge_affordance"), DRIFT).toBe(
			census.table_occurrences.place_edge_affordance,
		);
		expect(counts("place_node_traces"), DRIFT).toBe(census.table_occurrences.place_node_traces);
		expect(counts("entity_containment"), DRIFT).toBe(census.table_occurrences.entity_containment);
	});

	it("preserves meaningful repeated row occurrences rather than JSON-deduplicating them", () => {
		const rows = projectedRows(projection.tables);
		const modifierTargets = rows.filter(
			(item) => item.table === "modifier_target_definitions" && item.row.bundle_id === "srd",
		);

		// The SRD source contains repeated occurrences, some byte-identical. JSON
		// equality is not a schema identity and must not collapse those authored
		// occurrences.
		expect(modifierTargets, DRIFT).toHaveLength(census.modifier_target_definitions.srd_total);
		expect(
			modifierTargets.filter((item) => item.row.target_id === "srd/attack_roll").length,
			DRIFT,
		).toBe(census.modifier_target_definitions.attack_roll_occurrences);
	});

	it("keeps summary counts equal to their emitted table occurrence counts", () => {
		for (const source of projection.sources) {
			const tables = projection.tables.get(source.source_id);
			expect(tables, source.source_id).toBeDefined();
			for (const summary of source.tables) {
				expect(tables?.get(summary.table), `${source.source_id}/${summary.table}`).toHaveLength(
					summary.count,
				);
			}
		}
	});

	// Canonicalizing both 30k-row corpora needs the same budget as the other
	// whole-corpus checks above, especially alongside projection suites in CI.
	it("preserves the exact per-table row multisets of the unfiltered corpus", () => {
		const closure = loaded[1]?.manifest ?? {};
		const expected = new Map(
			Object.entries(closure)
				.filter(([table, value]) => table !== "include" && Array.isArray(value) && value.length > 0)
				.map(([table, value]) => [table, (value as unknown[]).map(canonical).sort()]),
		);
		const actualByTable = new Map<string, string[]>();
		for (const { table, row } of projectedRows(projection.tables)) {
			const rows = actualByTable.get(table) ?? [];
			rows.push(canonical(row));
			actualByTable.set(table, rows);
		}
		for (const rows of actualByTable.values()) rows.sort();

		const tables = [...new Set([...expected.keys(), ...actualByTable.keys()])].sort();
		const differences = tables.flatMap((table) => {
			const expectedRows = expected.get(table) ?? [];
			const actualRows = actualByTable.get(table) ?? [];
			const digest = (rows: string[]) => createHash("sha256").update(rows.join("\n")).digest("hex");
			return expectedRows.length === actualRows.length &&
				digest(expectedRows) === digest(actualRows)
				? []
				: [
						{
							table,
							expected_count: expectedRows.length,
							actual_count: actualRows.length,
							expected_sha256: digest(expectedRows),
							actual_sha256: digest(actualRows),
						},
					];
		});

		expect(differences).toEqual([]);
	}, 60_000);
});
