import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import TraceKindView, { traceKindRowView } from "./TraceKindView.svelte";

/**
 * The `srd/speech` row, copied field-for-field from
 * `packages/spellkave-srd-cc/fixtures/base/playing-the-game/speech.toml`.
 * `perceptible_for_ticks = 0` is the interesting case: it is authored, not
 * omitted, and means the trace exists only while it happens.
 */
const SPEECH_TRACE: Record<string, unknown> = {
	bundle_id: "srd",
	description:
		"A spoken utterance inscribed at the speaker's own place (Local visibility — overhearing falls out for free; carries the dispatched utterance verbatim under a 'text' key, ADR-0021 carry_dispatch_text, and the addressee's entity id under 'addressee' when the utterance was directed at someone). Perceptible only as it is spoken: the anchor says WHERE, the payload says TO WHOM.",
	kind_id: "srd/speech",
	location_kinds: "place_node",
	perceptible_for_ticks: 0,
	schema_json: '{"text":"string","addressee":"integer?"}',
	// The page merges `title` in from the compiler-derived display name —
	// `trace_kind_definitions` itself has no `display_name` column.
	title: "Speech",
};

/**
 * The slime trail row, copied from
 * `packages/spellkave-adventure-elven-mini/fixtures/adventure/story/traces.toml`.
 * `perceptible_for_ticks` is omitted here — a standing mark, the opposite
 * case from the speech row above.
 */
const SLIME_TRAIL_TRACE: Record<string, unknown> = {
	bundle_id: "elven_mini",
	description:
		"A glistening trail of translucent slime, still faintly wet — something crawled through here.",
	kind_id: "elven_mini/adventure/trace/slime_trail",
	location_kinds: "place_node",
	schema_json: "{}",
	title: "Slime Trail",
};

const link = (ref: string): string | undefined =>
	ref === "srd/attack/opportunity-attack" ? "/docs/srd/mechanics/actions/x" : undefined;

describe("traceKindRowView", () => {
	it("titles the page from the merged title and keeps the kind id as its ref", () => {
		const row = traceKindRowView(SPEECH_TRACE, "/docs/srd/mechanics/traces/x", link);
		expect(row.title).toBe("Speech");
		expect(row.ref).toBe("srd/speech");
		expect(row.kind_label).toBe("Trace kind");
	});

	it("falls back to the raw ref when no title was merged in", () => {
		const { title: _dropped, ...withoutTitle } = SPEECH_TRACE;
		const row = traceKindRowView(withoutTitle, undefined, link);
		expect(row.title).toBe("srd/speech");
	});

	it("reads a zero perceptible_for_ticks as instant, not as omitted", () => {
		const row = traceKindRowView(SPEECH_TRACE, undefined, link);
		const field = row.fields.find((f) => f.label === "Perceptible for");
		expect(field?.value).toBe("Only while it happens — no lingering mark");
	});

	it("reads an omitted perceptible_for_ticks as a standing mark", () => {
		const row = traceKindRowView(SLIME_TRAIL_TRACE, undefined, link);
		const field = row.fields.find((f) => f.label === "Perceptible for");
		expect(field?.value).toBe("Standing — lasts until removed");
	});

	it("shows the schema and location fields a real row carries", () => {
		const row = traceKindRowView(SPEECH_TRACE, undefined, link);
		expect(row.fields.find((f) => f.label === "Anchored to")?.value).toBe("place_node");
		expect(row.fields.find((f) => f.label === "Schema")?.value).toBe(
			'{"text":"string","addressee":"integer?"}',
		);
		expect(row.fields.find((f) => f.label === "Schema")?.code).toBe(true);
	});
});

describe("TraceKindView", () => {
	const row = traceKindRowView(SPEECH_TRACE, "/docs/srd/mechanics/traces/x", link);

	it("renders inline as a linked one-liner carrying the raw ref", () => {
		const { unmount } = render(TraceKindView, { row, view: "inline" });
		expect(screen.getByRole("link", { name: "Speech" })).toBeTruthy();
		expect(screen.getByText("srd/speech")).toBeTruthy();
		unmount();
	});

	it("renders compact as a card naming its kind", () => {
		const { unmount } = render(TraceKindView, { row, view: "compact" });
		expect(screen.getAllByText(/Speech/).length).toBeGreaterThan(0);
		expect(screen.getAllByText("Trace kind").length).toBeGreaterThan(0);
		unmount();
	});

	it("renders full with its title and its fields", () => {
		const { unmount } = render(TraceKindView, { row, view: "full", chrome: true });
		expect(screen.getAllByText(/Speech/).length).toBeGreaterThan(0);
		expect(screen.getByText("Anchored to")).toBeTruthy();
		unmount();
	});

	it("shows the description in the header half and the fields in the details half", () => {
		const { unmount } = render(TraceKindView, {
			row,
			view: "full",
			chrome: false,
			sections: { details: false },
		});
		expect(screen.getByText(/Perceptible only as it is spoken/)).toBeTruthy();
		expect(screen.queryByText("Anchored to")).toBeNull();
		unmount();

		render(TraceKindView, { row, view: "full", chrome: false, sections: { header: false } });
		expect(screen.getByText("Anchored to")).toBeTruthy();
		expect(screen.queryByText(/Perceptible only as it is spoken/)).toBeNull();
	});
});
