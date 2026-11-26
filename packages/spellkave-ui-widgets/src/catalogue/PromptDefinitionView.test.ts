import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import PromptDefinitionView, { promptDefinitionRowView } from "./PromptDefinitionView.svelte";

/**
 * `dm/prompt/creation/confirm`, copied field-for-field from
 * `packages/spellkave-srd-cc/fixtures/dm/manifest.toml`. A single-element
 * `response_action_ids` — the common case, one linked entry, plain label.
 */
const CONFIRM: Record<string, unknown> = {
	accepts_global_storm: false,
	audience_kind_ref: "core/audience/directed_trace",
	bundle_id: "dm",
	contract_version: 1,
	open_predicate_source: "actor.stat('dm/creation/phase') == 5",
	prompt_def_id: "dm/prompt/creation/confirm",
	response_action_ids: ["dm/creation/confirm"],
	source_selector: "srd.dm_npc.creation",
	trace_window_ticks: 20,
};

/**
 * `dm/prompt/creation/background`, same fixture file. Its own
 * `response_action_ids` carries FOUR sibling ids — exercises the "more than
 * one element" numbering.
 */
const BACKGROUND: Record<string, unknown> = {
	accepts_global_storm: false,
	audience_kind_ref: "core/audience/directed_trace",
	bundle_id: "dm",
	contract_version: 1,
	open_predicate_source: "actor.stat('dm/creation/phase') == 2",
	prompt_def_id: "dm/prompt/creation/background",
	response_action_ids: [
		"dm/creation/background/acolyte",
		"dm/creation/background/criminal",
		"dm/creation/background/sage",
		"dm/creation/background/soldier",
	],
	source_selector: "srd.dm_npc.creation",
	trace_window_ticks: 20,
};

const link = (ref: string): string | undefined => `/docs/dm/mechanics/actions/${ref}`;

describe("promptDefinitionRowView", () => {
	it("preserves selector, open condition, audience and identity", () => {
		const row = promptDefinitionRowView(CONFIRM, "/docs/dm/mechanics/prompts/x", link);
		expect(row.ref).toBe("dm/prompt/creation/confirm");
		expect(row.fields).toEqual([
			{ label: "Selects", value: "srd.dm_npc.creation" },
			{ label: "Open condition", value: "actor.stat('dm/creation/phase') == 5" },
			{
				label: "Response option",
				value: "dm/creation/confirm",
				code: true,
				href: "/docs/dm/mechanics/actions/dm/creation/confirm",
			},
			{
				label: "Audience kind",
				value: "core/audience/directed_trace",
				code: true,
				href: "/docs/dm/mechanics/actions/core/audience/directed_trace",
			},
			{ label: "Trace window", value: "20 ticks" },
			{ label: "Contract version", value: "1" },
			{ label: "Prompt ID", value: "dm/prompt/creation/confirm", code: true },
			{ label: "Owning bundle", value: "dm" },
		]);
	});

	it("numbers each response option when more than one is authored", () => {
		const row = promptDefinitionRowView(BACKGROUND, undefined, link);
		const options = row.fields.filter((field) => field.label.startsWith("Response option"));
		expect(options.map((field) => field.label)).toEqual([
			"Response option (1 of 4)",
			"Response option (2 of 4)",
			"Response option (3 of 4)",
			"Response option (4 of 4)",
		]);
		expect(options.map((field) => field.value)).toEqual(BACKGROUND.response_action_ids);
	});

	it("omits accepts_global_storm, trace window and contract version at their default", () => {
		const row = promptDefinitionRowView({ prompt_def_id: "srd/prompt/minimal" }, undefined, link);
		expect(row.fields).toEqual([{ label: "Prompt ID", value: "srd/prompt/minimal", code: true }]);
	});

	it("shows accepts_global_storm only when true", () => {
		const row = promptDefinitionRowView(
			{ prompt_def_id: "srd/prompt/storm", accepts_global_storm: true },
			undefined,
			link,
		);
		expect(row.fields.find((f) => f.label === "Accepts global storm")?.value).toBe("Yes");
	});

	it("uses the identity as title when no display title is supplied", () => {
		const row = promptDefinitionRowView(CONFIRM, undefined, link);
		expect(row.title).toBe("dm/prompt/creation/confirm");
	});
});

describe("PromptDefinitionView", () => {
	const row = promptDefinitionRowView(CONFIRM, "/docs/dm/mechanics/prompts/x", link);

	it("renders inline as a linked one-liner carrying the raw ref", () => {
		const { unmount } = render(PromptDefinitionView, { row, view: "inline" });
		expect(screen.getByRole("link", { name: "dm/prompt/creation/confirm" })).toBeTruthy();
		unmount();
	});

	it("renders compact as a card naming its kind", () => {
		const { unmount } = render(PromptDefinitionView, { row, view: "compact" });
		expect(screen.getAllByText("Prompt").length).toBeGreaterThan(0);
		unmount();
	});

	it("renders full with its fields", () => {
		const { unmount } = render(PromptDefinitionView, { row, view: "full", chrome: true });
		expect(screen.getByText("Selects")).toBeTruthy();
		expect(screen.getByText("srd.dm_npc.creation")).toBeTruthy();
		unmount();
	});

	it("renders full for the minimal identity-only row without crashing", () => {
		const minimalRow = promptDefinitionRowView(
			{ prompt_def_id: "srd/prompt/minimal" },
			undefined,
			link,
		);
		const { unmount } = render(PromptDefinitionView, {
			row: minimalRow,
			view: "full",
			chrome: false,
		});
		expect(screen.getByTestId("entry-heading-ref").textContent).toContain("srd/prompt/minimal");
		unmount();
	});
});
