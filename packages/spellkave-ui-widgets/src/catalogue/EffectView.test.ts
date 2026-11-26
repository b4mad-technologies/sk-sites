import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import EffectView, { effectRowView } from "./EffectView.svelte";

/**
 * The Wild Companion spawn row, copied field-for-field from
 * `packages/spellkave-srd-cc/fixtures/base/classes/caster-features.toml` —
 * one of only 1 of the 7 `effect_definitions` rows in the corpus that
 * authors a `description`. `title` stands in for the field
 * `CatalogueEntryPage.svelte` merges in at read time — this kind carries no
 * `display_name` column, so the real page derives it via `idLabelFromPath`.
 */
const WILD_COMPANION_SPAWN: Record<string, unknown> = {
	bundle_id: "srd",
	description: "Wild Companion: Spawn srd/creature/cat at the caster's node.",
	effect_def_id: "srd/druid/wild-companion/spawn",
	parameters_schema_json:
		'{"blueprint_id":"srd/creature/cat","location_ref":{"kind":"binding","id":"ActorSpatialRef"}}',
	primitives_csv: "Spawn",
	title: "Wild Companion Spawn",
};

const link = (): string | undefined => undefined;

describe("effectRowView", () => {
	it("titles the page from the merged title field and keeps the effect id as its ref", () => {
		const row = effectRowView(WILD_COMPANION_SPAWN, "/docs/srd/mechanics/effects/x", link);
		expect(row.title).toBe("Wild Companion Spawn");
		expect(row.ref).toBe("srd/druid/wild-companion/spawn");
		expect(row.kind_label).toBe("Effect");
	});

	it("leads with the primitive and its call shape", () => {
		const row = effectRowView(WILD_COMPANION_SPAWN, undefined, link);
		expect(row.fields.slice(0, 2).map((field) => field.label)).toEqual([
			"Primitives",
			"Parameters",
		]);
		expect(row.fields[0]?.value).toBe("Spawn");
	});

	it("carries the description when the row authors one", () => {
		const row = effectRowView(WILD_COMPANION_SPAWN, undefined, link);
		expect(row.description).toBe("Wild Companion: Spawn srd/creature/cat at the caster's node.");
	});

	it("carries no description when the row leaves it empty, as 6 of the 7 rows do", () => {
		const { description: _dropped, ...withoutDescription } = WILD_COMPANION_SPAWN;
		expect(effectRowView(withoutDescription, undefined, link).description).toBeUndefined();
	});
});

describe("EffectView", () => {
	const row = effectRowView(WILD_COMPANION_SPAWN, "/docs/srd/mechanics/effects/x", link);

	it("renders inline as a linked one-liner carrying the raw ref", () => {
		const { unmount } = render(EffectView, { row, view: "inline" });
		expect(screen.getByRole("link", { name: "Wild Companion Spawn" })).toBeTruthy();
		expect(screen.getByText("srd/druid/wild-companion/spawn")).toBeTruthy();
		unmount();
	});

	it("renders compact as a card naming its kind", () => {
		const { unmount } = render(EffectView, { row, view: "compact" });
		expect(screen.getAllByText(/Wild Companion Spawn/).length).toBeGreaterThan(0);
		expect(screen.getAllByText("Effect").length).toBeGreaterThan(0);
		unmount();
	});

	it("renders full with its title and its fields", () => {
		const { unmount } = render(EffectView, { row, view: "full", chrome: true });
		expect(screen.getAllByText(/Wild Companion Spawn/).length).toBeGreaterThan(0);
		expect(screen.getByText("Primitives")).toBeTruthy();
		unmount();
	});

	it("shows the ref/kind caption, never the title, when chrome is off", () => {
		const { unmount } = render(EffectView, { row, view: "full", chrome: false });
		expect(screen.getByText("Primitives")).toBeTruthy();
		expect(screen.queryByRole("heading", { name: "Wild Companion Spawn" })).toBeNull();
		unmount();
	});
});
