import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import MacroView, { macroRowView } from "./MacroView.svelte";

/**
 * The `srd/dc_or` row, copied field-for-field from
 * `packages/spellkave-srd-cc/fixtures/base/playing-the-game/macros.toml`
 * (including its two nested `[[dsl_macro_definitions.parameters]]` rows,
 * which TOML folds into a `parameters` array on this row). `title` stands in
 * for the field `CatalogueEntryPage.svelte` merges in at read time — this
 * kind carries no `display_name` column, so the real page derives it via
 * `idLabelFromPath` and hands it to the projector as `record.title`.
 */
const DC_OR: Record<string, unknown> = {
	body_source: "cond(override > 0, override, fallback)",
	bundle_id: "srd",
	description:
		'SRD: "A Difficulty Class (DC) is the target number for an ability check or a saving throw." (cache/markdown/rules-glossary.md:736-738) Uses a positive authored override; otherwise keeps the supplied fallback target number.',
	macro_id: "srd/dc_or",
	parameters: [
		{ name: "override", value_type: "Int" },
		{ name: "fallback", value_type: "Int" },
	],
	return_type: "Int",
	title: "Dc Or",
};

const link = (): string | undefined => undefined;

describe("macroRowView", () => {
	it("titles the page from the merged title field and keeps the macro id as its ref", () => {
		const row = macroRowView(DC_OR, "/docs/srd/mechanics/macros/x", link);
		expect(row.title).toBe("Dc Or");
		expect(row.ref).toBe("srd/dc_or");
		expect(row.kind_label).toBe("Macro");
	});

	it("summarises the call shape: return type, parameters, then the body", () => {
		const row = macroRowView(DC_OR, undefined, link);
		expect(row.fields.map((field) => field.label)).toEqual([
			"Return type",
			"Parameters",
			"Macro body",
			"Macro ID",
			"Owning bundle",
		]);
		expect(row.fields.find((field) => field.label === "Parameters")?.value).toBe(
			"override: Int, fallback: Int",
		);
		expect(row.fields.find((field) => field.label === "Macro body")?.value).toBe(
			"cond(override > 0, override, fallback)",
		);
	});

	it("omits Parameters when a macro authors none", () => {
		const { parameters: _dropped, ...withoutParameters } = DC_OR;
		const row = macroRowView(withoutParameters, undefined, link);
		expect(row.fields.some((field) => field.label === "Parameters")).toBe(false);
	});

	it("falls back to the raw ref when the merged title is missing", () => {
		const { title: _dropped, ...withoutTitle } = DC_OR;
		expect(macroRowView(withoutTitle, undefined, link).title).toBe("srd/dc_or");
	});
});

describe("MacroView", () => {
	const row = macroRowView(DC_OR, "/docs/srd/mechanics/macros/x", link);

	it("renders inline as a linked one-liner carrying the raw ref", () => {
		const { unmount } = render(MacroView, { row, view: "inline" });
		expect(screen.getByRole("link", { name: "Dc Or" })).toBeTruthy();
		expect(screen.getByText("srd/dc_or")).toBeTruthy();
		unmount();
	});

	it("renders compact as a card naming its kind", () => {
		const { unmount } = render(MacroView, { row, view: "compact" });
		expect(screen.getAllByText(/Dc Or/).length).toBeGreaterThan(0);
		expect(screen.getAllByText("Macro").length).toBeGreaterThan(0);
		unmount();
	});

	it("renders full with the identity fields and the body in its own monospace block, not a field row", () => {
		const { unmount } = render(MacroView, { row, view: "full", chrome: true });
		expect(screen.getByText("Return type")).toBeTruthy();
		// "Macro body" is pulled out of the generic field list — it never becomes
		// a <dt> there, only the standalone heading above the <pre> block.
		const fieldList = screen.getByTestId("field-list");
		expect(fieldList.textContent).not.toContain("Macro body");
		expect(screen.getByRole("heading", { name: "Macro body" })).toBeTruthy();
		// ...and the raw DSL text renders inside that monospace block.
		expect(screen.getByTestId("macro-body").textContent).toBe(
			"cond(override > 0, override, fallback)",
		);
		unmount();
	});

	it("shows the description and the ref/kind caption, never the title, when chrome is off", () => {
		const { unmount } = render(MacroView, { row, view: "full", chrome: false });
		expect(screen.getByText(/Difficulty Class \(DC\)/)).toBeTruthy();
		expect(screen.getByTestId("entry-heading-ref").textContent).toContain("Macro");
		unmount();
	});
});
