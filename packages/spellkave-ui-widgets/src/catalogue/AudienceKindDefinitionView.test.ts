import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import AudienceKindDefinitionView, {
	audienceKindDefinitionRowView,
} from "./AudienceKindDefinitionView.svelte";

/**
 * `directed_trace`, one of the two `core` bundle seed rows
 * (`server/src/world_interaction/layer3/audience_kind_definition.rs`'s
 * `CORE_AUDIENCE_KINDS`). No bundle authors a row of its own yet.
 */
const DIRECTED_TRACE: Record<string, unknown> = {
	audience_kind_id: "core/audience/directed_trace",
	resolution_shape: "DirectedTrace",
	bundle_id: "core",
	description:
		"addressee of the speaker's most recent directed speech trace within trace_window_ticks",
	title: "Directed trace",
};

/** The realistic minimal case: only the identity column authored. */
const MINIMAL: Record<string, unknown> = {
	audience_kind_id: "core/audience/broadcast",
};

const link = (): string | undefined => undefined;

describe("audienceKindDefinitionRowView", () => {
	it("titles the page from the merged title and keeps the kind id as its ref", () => {
		const row = audienceKindDefinitionRowView(
			DIRECTED_TRACE,
			"/docs/srd/mechanics/audience-kinds/x",
			link,
		);
		expect(row.title).toBe("Directed trace");
		expect(row.ref).toBe("core/audience/directed_trace");
		expect(row.kind_label).toBe("Audience kind");
	});

	it("falls back to the raw ref when no title was merged in", () => {
		const { title: _dropped, ...withoutTitle } = DIRECTED_TRACE;
		const row = audienceKindDefinitionRowView(withoutTitle, undefined, link);
		expect(row.title).toBe("core/audience/directed_trace");
	});

	it("shows the resolution shape as plain text, not a link", () => {
		const row = audienceKindDefinitionRowView(DIRECTED_TRACE, undefined, link);
		const field = row.fields.find((f) => f.label === "Resolution shape");
		expect(field?.value).toBe("DirectedTrace");
		expect(field?.href).toBeUndefined();
	});

	it("renders sensibly for a row carrying only its identity column", () => {
		const row = audienceKindDefinitionRowView(MINIMAL, undefined, link);
		expect(row.title).toBe("core/audience/broadcast");
		expect(row.fields.find((f) => f.label === "Audience Kind ID")?.value).toBe(
			"core/audience/broadcast",
		);
		expect(row.fields.find((f) => f.label === "Resolution shape")).toBeUndefined();
	});
});

describe("AudienceKindDefinitionView", () => {
	const row = audienceKindDefinitionRowView(
		DIRECTED_TRACE,
		"/docs/srd/mechanics/audience-kinds/x",
		link,
	);

	it("renders inline as a linked one-liner carrying the raw ref", () => {
		const { unmount } = render(AudienceKindDefinitionView, { row, view: "inline" });
		expect(screen.getByRole("link", { name: "Directed trace" })).toBeTruthy();
		expect(screen.getByText("core/audience/directed_trace")).toBeTruthy();
		unmount();
	});

	it("renders compact as a card naming its kind", () => {
		const { unmount } = render(AudienceKindDefinitionView, { row, view: "compact" });
		expect(screen.getAllByText(/Directed trace/).length).toBeGreaterThan(0);
		expect(screen.getAllByText("Audience kind").length).toBeGreaterThan(0);
		unmount();
	});

	it("renders full with its title, description and fields", () => {
		const { unmount } = render(AudienceKindDefinitionView, { row, view: "full", chrome: true });
		expect(screen.getAllByText(/Directed trace/).length).toBeGreaterThan(0);
		expect(screen.getByText("Resolution shape")).toBeTruthy();
		expect(screen.getByText(DIRECTED_TRACE.description as string)).toBeTruthy();
		unmount();
	});

	it("renders full for the minimal identity-only row without crashing", () => {
		const minimalRow = audienceKindDefinitionRowView(MINIMAL, undefined, link);
		const { unmount } = render(AudienceKindDefinitionView, {
			row: minimalRow,
			view: "full",
			chrome: false,
		});
		expect(screen.getByTestId("entry-heading-ref").textContent).toContain(
			"core/audience/broadcast",
		);
		unmount();
	});
});
