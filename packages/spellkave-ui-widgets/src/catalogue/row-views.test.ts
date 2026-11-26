import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { registeredRowViewKinds, rowViewFor } from "./row-views";

const KINDS = registeredRowViewKinds();

/**
 * A record carrying every shape a projector might read its title from, plus
 * each kind's own identity column, so the assertions below hold whichever
 * column a given kind actually uses.
 */
const TITLED_ROW: Record<string, unknown> = {
	action_id: "srd/probe/row",
	template_id: "srd/probe/row",
	outcome_template_id: "srd/probe/row",
	niche_id: "srd/probe/row",
	display_name: "Authored Name",
	title: "Derived Title",
	bundle_id: "srd",
};

describe("row view registration", () => {
	// Which kinds must be registered is asserted in `reader-coverage.test.ts`,
	// against what the catalogue actually publishes. Repeating the list here
	// would be a second copy that rots on the next component — this file only
	// holds what every registration must satisfy.
	it("returns nothing for a kind with no component, so the page falls back to the technical dump", () => {
		expect(rowViewFor("entity_definition_tag")).toBeUndefined();
	});

	it("keeps the registry sorted, so a new component lands in an obvious place", () => {
		expect(KINDS).toEqual([...KINDS].sort());
	});
});

describe.each(KINDS)("%s", (kind) => {
	const registration = rowViewFor(kind);
	if (registration === undefined) throw new Error(`no registration for ${kind}`);

	it("never renders an untitled page", () => {
		const row = registration.project(TITLED_ROW, undefined, () => undefined);
		expect(row.title.length).toBeGreaterThan(0);
		expect(row.kind_label.length).toBeGreaterThan(0);
	});

	// All three levels are mandatory for every per-kind component. The ref is
	// the one thing every level shows: `full` with `chrome: false` omits the
	// title on purpose, because the owning page already rendered it.
	it("renders at all three view levels, each identifying the row", () => {
		const row = registration.project(TITLED_ROW, "/docs/x", () => undefined);
		for (const view of ["inline", "compact", "full"] as const) {
			const { container, unmount } = render(registration.component, {
				row,
				view,
				chrome: false,
			});
			const text = container.textContent ?? "";
			expect(text.length, `${kind} rendered nothing at view "${view}"`).toBeGreaterThan(0);
			expect(text, `${kind} at view "${view}" identifies neither its title nor its ref`).toMatch(
				new RegExp(`${row.title}|${row.ref}`),
			);
			unmount();
		}
	});
});

/**
 * The one kind whose manifest table has no `display_name` column at all —
 * measured: 478 of 478 `consequence_templates` rows. Its title is
 * compiler-derived and lives on the catalogue ENTRY, not on the manifest row,
 * so `CatalogueEntryPage` merges it into the projector's input under `title`.
 * A projector that read only `display_name` would leave 409 pages untitled;
 * this is the assertion that says so out loud.
 */
describe("consequence_template", () => {
	it("takes its title from the derived copy, not from a display_name it never has", () => {
		const registration = rowViewFor("consequence_template");
		if (registration === undefined) throw new Error("consequence_template is not registered");
		const row = registration.project(
			{
				template_id: "srd/attack/opportunity-attack/success",
				title: "Opportunity Attack — Success",
			},
			undefined,
			() => undefined,
		);
		expect(row.title).toBe("Opportunity Attack — Success");
	});
});
