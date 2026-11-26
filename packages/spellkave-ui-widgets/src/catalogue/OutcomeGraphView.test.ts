import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import OutcomeGraphView, { outcomeGraphRowView } from "./OutcomeGraphView.svelte";

/**
 * `demo_graph/staged_skill_check` and its two nodes, copied from
 * `openspec/changes/archive/2026-06-14-arbitration-outcome-graph-authoring/fixtures/authored-outcome-graph.toml`.
 */
const STAGED_SKILL_CHECK: Record<string, unknown> = {
	bundle_id: "demo_graph",
	display_name: "Staged skill check",
	max_depth: 3,
	max_draws: 4,
	max_nodes: 8,
	outcome_graph_id: "demo_graph/staged_skill_check",
	root_node_id: "approach",
};

const NODES: Record<string, unknown>[] = [
	{
		authored_order: 0,
		node_id: "approach",
		outcome_graph_id: "demo_graph/staged_skill_check",
		outcome_graph_node_id: "demo_graph/staged_skill_check/approach",
		outcome_template_id: "demo_graph/partial",
		terminal: false,
	},
	{
		authored_order: 1,
		node_id: "success",
		outcome_graph_id: "demo_graph/staged_skill_check",
		outcome_graph_node_id: "demo_graph/staged_skill_check/success",
		outcome_template_id: "demo_graph/success",
		terminal: true,
	},
];

/** The realistic minimal case: only the identity column authored. */
const MINIMAL: Record<string, unknown> = {
	outcome_graph_id: "demo_graph/unnamed",
};

const link = (ref: string): string | undefined =>
	ref === "demo_graph/success" ? "/docs/srd/mechanics/outcomes/demo-graph-success" : undefined;

describe("outcomeGraphRowView", () => {
	it("titles the page from display_name directly, not a merged title", () => {
		const row = outcomeGraphRowView(
			STAGED_SKILL_CHECK,
			"/docs/srd/mechanics/outcome-graphs/x",
			link,
		);
		expect(row.title).toBe("Staged skill check");
		expect(row.ref).toBe("demo_graph/staged_skill_check");
		expect(row.kind_label).toBe("Outcome graph");
	});

	it("falls back to the raw ref when display_name is absent", () => {
		const { display_name: _dropped, ...withoutName } = STAGED_SKILL_CHECK;
		const row = outcomeGraphRowView(withoutName, undefined, link);
		expect(row.title).toBe("demo_graph/staged_skill_check");
	});

	it("reads root_node_id as plain code, not a link (it names a node inside this same graph)", () => {
		const row = outcomeGraphRowView(STAGED_SKILL_CHECK, undefined, link);
		const field = row.fields.find((f) => f.label === "Root node");
		expect(field?.value).toBe("approach");
		expect(field?.code).toBe(true);
		expect(field?.href).toBeUndefined();
	});

	it("shows max_depth/max_nodes/max_draws even though the defaults are meaningful numbers, not omitted", () => {
		const row = outcomeGraphRowView(STAGED_SKILL_CHECK, undefined, link);
		expect(row.fields.find((f) => f.label === "Max depth")?.value).toBe("3");
		expect(row.fields.find((f) => f.label === "Max nodes")?.value).toBe("8");
		expect(row.fields.find((f) => f.label === "Max draws")?.value).toBe("4");
	});

	it("renders sensibly for a row carrying only its identity column", () => {
		const row = outcomeGraphRowView(MINIMAL, undefined, link);
		expect(row.title).toBe("demo_graph/unnamed");
		expect(row.fields.find((f) => f.label === "Outcome Graph ID")?.value).toBe(
			"demo_graph/unnamed",
		);
		expect(row.fields.find((f) => f.label === "Root node")).toBeUndefined();
		expect(row.fields.find((f) => f.label === "Max depth")).toBeUndefined();
	});
});

describe("OutcomeGraphView", () => {
	const row = outcomeGraphRowView(STAGED_SKILL_CHECK, "/docs/srd/mechanics/outcome-graphs/x", link);

	it("renders inline as a linked one-liner carrying the raw ref", () => {
		const { unmount } = render(OutcomeGraphView, { row, view: "inline" });
		expect(screen.getByRole("link", { name: "Staged skill check" })).toBeTruthy();
		expect(screen.getByText("demo_graph/staged_skill_check")).toBeTruthy();
		unmount();
	});

	it("renders compact as a card naming its kind", () => {
		const { unmount } = render(OutcomeGraphView, { row, view: "compact" });
		expect(screen.getAllByText(/Staged skill check/).length).toBeGreaterThan(0);
		expect(screen.getAllByText("Outcome graph").length).toBeGreaterThan(0);
		unmount();
	});

	it("renders full with its title and its fields, without a nodes table when none are given", () => {
		const { unmount } = render(OutcomeGraphView, { row, view: "full", chrome: true });
		expect(screen.getAllByText(/Staged skill check/).length).toBeGreaterThan(0);
		expect(screen.getByText("Root node")).toBeTruthy();
		expect(screen.queryByTestId("outcome-graph-nodes")).toBeNull();
		unmount();
	});

	it("renders full for the minimal identity-only row without crashing", () => {
		const minimalRow = outcomeGraphRowView(MINIMAL, undefined, link);
		const { unmount } = render(OutcomeGraphView, { row: minimalRow, view: "full", chrome: false });
		expect(screen.getByTestId("entry-heading-ref").textContent).toContain("demo_graph/unnamed");
		unmount();
	});

	it("renders the owner-surfaced nodes as a table, ordered by authored_order, with a linked outcome template", () => {
		const { unmount } = render(OutcomeGraphView, {
			row,
			view: "full",
			chrome: true,
			nodes: NODES,
			link,
		});
		const table = screen.getByTestId("outcome-graph-nodes");
		expect(table.textContent).toContain("approach");
		expect(table.textContent).toContain("success");
		expect(screen.getByRole("link", { name: "demo_graph/success" })).toBeTruthy();
		// demo_graph/partial has no catalogue page (link() returns undefined for it) — plain code, not a link.
		expect(screen.queryByRole("link", { name: "demo_graph/partial" })).toBeNull();
		expect(table.textContent).toContain("demo_graph/partial");
		unmount();
	});

	it("does not render the nodes table outside the details section", () => {
		const { unmount } = render(OutcomeGraphView, {
			row,
			view: "full",
			chrome: false,
			sections: { details: false },
			nodes: NODES,
		});
		expect(screen.queryByTestId("outcome-graph-nodes")).toBeNull();
		unmount();
	});
});
