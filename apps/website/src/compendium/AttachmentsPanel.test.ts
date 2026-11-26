import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import AttachmentsPanel from "./AttachmentsPanel.svelte";

describe("AttachmentsPanel", () => {
	it("diagnoses a missing attachment license instead of inventing one", () => {
		render(AttachmentsPanel, {
			attachments: [
				{
					namespace: "srd.text",
					target_kind: "entity_definition",
					target_ref: "srd/spell/example",
					payload: { source: "cache/markdown/example", text: "Example" },
				},
			],
			art: null,
		});
		expect(
			screen.getByText("License: Missing attachment payload: srd.text.payload.license."),
		).toBeTruthy();
		expect(screen.getByText("Source: cache/markdown/example")).toBeTruthy();
		expect(screen.getByText("Example")).toBeTruthy();
		expect(screen.queryByText("License: CC-BY-4.0")).toBeNull();
	});

	it("diagnoses missing source and text payload fields", () => {
		render(AttachmentsPanel, {
			attachments: [
				{
					namespace: "srd.text",
					target_kind: "entity_definition",
					target_ref: "srd/spell/example",
					payload: { license: "CC-BY-4.0" },
				},
			],
			art: null,
		});
		expect(
			screen.getByText("Source: Missing attachment payload: srd.text.payload.source."),
		).toBeTruthy();
		expect(screen.getByText("Missing attachment payload: srd.text.payload.text.")).toBeTruthy();
	});

	it("renders complete authored provenance unchanged", () => {
		render(AttachmentsPanel, {
			attachments: [
				{
					namespace: "srd.text",
					target_kind: "entity_definition",
					target_ref: "srd/spell/example",
					payload: {
						license: "CC-BY-4.0",
						source: "cache/markdown/example",
						text: "Example",
					},
				},
			],
			art: null,
		});
		expect(screen.getByText("License: CC-BY-4.0")).toBeTruthy();
		expect(screen.getByText("Source: cache/markdown/example")).toBeTruthy();
		expect(screen.getByText("Example")).toBeTruthy();
	});
});
