import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import StackingDisciplineView, { stackingDisciplineRowView } from "./StackingDisciplineView.svelte";

/**
 * The ONLY `stacking_discipline_definitions` row in the whole corpus,
 * copied field-for-field from
 * `packages/spellkave-srd-cc/fixtures/base/playing-the-game/cover-conditions.toml`.
 * Both `srd/cover/half` and `srd/cover/three-quarters` point at it via
 * their own `stacking_rule` column.
 */
const SINGLE_DISCIPLINE: Record<string, unknown> = {
	bundle_id: "srd",
	discipline_id: "srd/stacking/single",
	display_name: "Single active row",
	expires_at_tick_outcome_source: "-1",
	stack_count_outcome_source: "stack_count",
};

const link = (): string | undefined => undefined;

describe("stackingDisciplineRowView", () => {
	it("titles the page from display_name and keeps the discipline id as its ref", () => {
		const row = stackingDisciplineRowView(
			SINGLE_DISCIPLINE,
			"/docs/srd/mechanics/stacking-disciplines/x",
			link,
		);
		expect(row.title).toBe("Single active row");
		expect(row.ref).toBe("srd/stacking/single");
		expect(row.kind_label).toBe("Stacking discipline");
	});

	it("names the two expression sources that govern how a repeated condition combines", () => {
		const row = stackingDisciplineRowView(SINGLE_DISCIPLINE, undefined, link);
		expect(row.fields.map((field) => field.label)).toEqual([
			"Stack count source",
			"Expiry tick source",
			"Discipline ID",
			"Owning bundle",
		]);
		expect(row.fields.find((f) => f.label === "Stack count source")?.value).toBe("stack_count");
		expect(row.fields.find((f) => f.label === "Expiry tick source")?.value).toBe("-1");
	});

	it("does not treat the expression sources as linkable ids", () => {
		const row = stackingDisciplineRowView(SINGLE_DISCIPLINE, undefined, link);
		const stackCount = row.fields.find((f) => f.label === "Stack count source");
		expect(stackCount?.code).toBeUndefined();
		expect(stackCount?.href).toBeUndefined();
	});
});

describe("StackingDisciplineView", () => {
	const row = stackingDisciplineRowView(
		SINGLE_DISCIPLINE,
		"/docs/srd/mechanics/stacking-disciplines/x",
		link,
	);

	it("renders inline as a linked one-liner carrying the raw ref", () => {
		const { unmount } = render(StackingDisciplineView, { row, view: "inline" });
		expect(screen.getByRole("link", { name: "Single active row" })).toBeTruthy();
		expect(screen.getByText("srd/stacking/single")).toBeTruthy();
		unmount();
	});

	it("renders compact as a card naming its kind", () => {
		const { unmount } = render(StackingDisciplineView, { row, view: "compact" });
		expect(screen.getAllByText(/Single active row/).length).toBeGreaterThan(0);
		expect(screen.getAllByText("Stacking discipline").length).toBeGreaterThan(0);
		unmount();
	});

	it("renders full with its title and its fields", () => {
		const { unmount } = render(StackingDisciplineView, { row, view: "full", chrome: true });
		expect(screen.getAllByText(/Single active row/).length).toBeGreaterThan(0);
		expect(screen.getByText("Stack count source")).toBeTruthy();
		unmount();
	});

	it("keeps the ref visible at full view even with chrome off, where the title is deliberately omitted", () => {
		const { unmount } = render(StackingDisciplineView, {
			row,
			view: "full",
			chrome: false,
			sections: { details: false },
		});
		expect(screen.getByText("srd/stacking/single")).toBeTruthy();
		expect(screen.queryByText("Stack count source")).toBeNull();
		unmount();

		render(StackingDisciplineView, {
			row,
			view: "full",
			chrome: false,
			sections: { header: false },
		});
		expect(screen.getByText("Stack count source")).toBeTruthy();
	});
});
