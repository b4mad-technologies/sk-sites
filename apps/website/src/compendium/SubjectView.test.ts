import { render, screen, within } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import type { DocsSubject } from "./docs-types";
import SubjectView from "./SubjectView.svelte";

const definition: DocsSubject = {
	kind: "entity_definition",
	ref: "other/shield",
	bundle_id: "other",
	display_name: "Shield",
	description: "An authored shield.",
	href: "/docs/other/items/subject/entity_definition/other%2Fshield",
	tags: ["other.armor"],
	attachments: [],
	facets: [
		{
			label: "Modifier definitions",
			rows: [
				{
					display_name: "Shield AC",
					description: "Adds two.",
					applies_to: "other/ac",
					modifier_expression_source: "let bonus = 2; bonus",
					predicate_source: "",
				},
			],
		},
		{ label: "Definition record", rows: [{ entity_def_id: "other/shield" }] },
	],
};

describe("SubjectView", () => {
	it("links a compact definition to its full static route", () => {
		render(SubjectView, { subject: definition, view: "compact" });
		expect(screen.getByRole("link", { name: "Shield" }).getAttribute("href")).toBe(definition.href);
	});

	it("renders equipment rules readably and leaves technical rows collapsed", () => {
		render(SubjectView, { subject: definition, view: "full" });
		expect(screen.getByText("entity_definitions.description")).toBeTruthy();
		expect(
			within(screen.getByTestId("description-rendered")).getByText("An authored shield."),
		).toBeTruthy();
		expect(screen.getByRole("heading", { name: "Equipment effect" })).toBeTruthy();
		expect(screen.getByText("Adds two.")).toBeTruthy();
		expect(screen.getByText("let bonus = 2; bonus")).toBeTruthy();
		expect(screen.getByText("Definition record (1)").closest("details")?.open).toBe(false);
	});

	it("keeps the exact description visible when page chrome is suppressed", () => {
		const { container } = render(SubjectView, {
			subject: {
				...definition,
				description: 'A **manifest** description.<br>Second line.<script>alert("unsafe")</script>',
			},
			view: "full",
			chrome: false,
		});
		expect(screen.getByText("entity_definitions.description")).toBeTruthy();
		expect(
			container.querySelector("[data-testid='description-rendered'] strong")?.textContent,
		).toBe("manifest");
		expect(container.querySelector("[data-testid='description-rendered'] br")).toBeTruthy();
		expect(container.querySelector("[data-testid='description-rendered'] script")).toBeNull();
		expect(screen.queryByText("Raw value")).toBeNull();
		expect(
			screen.queryByRole("button", { name: "Copy entity_definitions.description" }),
		).toBeNull();
	});

	it("labels an instance as initial state and preserves both typed fields", () => {
		const instance: DocsSubject = {
			...definition,
			kind: "entity",
			ref: "other/mira",
			display_name: "Mira",
			definition_ref: "other/commoner",
			facets: [
				{ label: "Placement", rows: [{ place_node_id: "other/inn" }] },
				{
					label: "Initial state",
					rows: [{ state_id: "dialog/open", value_bool: false, value_int: 9 }],
				},
			],
		};
		render(SubjectView, { subject: instance, view: "full" });
		expect(screen.getByText("entities.description")).toBeTruthy();
		expect(screen.getByText("false")).toBeTruthy();
		expect(screen.getByText("9")).toBeTruthy();
		expect(screen.getByText(/not current live-world state/)).toBeTruthy();
	});

	it("sanitizes attachment prose and renders only explicitly projected art", () => {
		const withAttachments: DocsSubject = {
			...definition,
			attachments: [
				{
					bundle_id: "other",
					namespace: "other.text",
					payload: { text: '<script>alert(1)</script><b onclick="alert(2)">Safe</b>' },
				},
				{ bundle_id: "other", namespace: "other.note", payload: { path: "notes/source.md" } },
				{
					bundle_id: "other",
					namespace: "other.art.image",
					payload: { path: "other-art/shield.webp", hash: "a".repeat(64), license: "CC0" },
					asset_href: "/assets/other/shield.webp",
				},
			],
		};
		const { container } = render(SubjectView, { subject: withAttachments, view: "full" });
		expect(container.innerHTML).not.toContain("<script");
		expect(container.querySelector("b")?.hasAttribute("onclick")).toBe(false);
		expect(screen.getByText("Safe")).toBeTruthy();
		expect(container.querySelectorAll("img")).toHaveLength(1);
		expect(container.querySelector("img")?.getAttribute("src")).toBe("/assets/other/shield.webp");
		const textAttachment = screen
			.getByRole("heading", { name: "Text attachment" })
			.closest("article");
		if (!textAttachment) throw new Error("text attachment card is missing");
		expect(within(textAttachment).getByText("Attachment · other.text")).toBeTruthy();
		expect(within(textAttachment).getByText("Bundle other")).toBeTruthy();
		expect(screen.getAllByText("Raw payload")).toHaveLength(3);
	});

	it("splits full view into a header block and a details block via sections", () => {
		const headerOnly = render(SubjectView, {
			subject: definition,
			view: "full",
			sections: { details: false },
		});
		expect(headerOnly.getByTestId("description-rendered")).toBeTruthy();
		expect(headerOnly.queryByRole("heading", { name: "Equipment effect" })).toBeNull();
		expect(headerOnly.queryByRole("heading", { name: "Authored facets" })).toBeNull();
		headerOnly.unmount();

		const detailsOnly = render(SubjectView, {
			subject: definition,
			view: "full",
			sections: { header: false },
		});
		expect(detailsOnly.queryByTestId("description-rendered")).toBeNull();
		expect(detailsOnly.getByRole("heading", { name: "Equipment effect" })).toBeTruthy();
		expect(detailsOnly.getByRole("heading", { name: "Authored facets" })).toBeTruthy();
	});

	it("distinguishes SRD reference text from the entity description", () => {
		render(SubjectView, {
			subject: {
				...definition,
				attachments: [
					{
						bundle_id: "srd",
						namespace: "srd.text",
						payload: {
							text: "The complete SRD stat block.",
							source: "cache/markdown/monsters-A-Z.md:1-10",
							license: "CC-BY-4.0",
						},
					},
				],
			},
			view: "full",
		});
		expect(screen.getByText("entity_definitions.description")).toBeTruthy();
		const srdReference = screen.getByRole("heading", { name: "SRD reference" }).closest("article");
		if (!srdReference) throw new Error("SRD reference card is missing");
		expect(within(srdReference).getByText("Attachment · srd.text")).toBeTruthy();
		expect(within(srdReference).getByText("cache/markdown/monsters-A-Z.md:1-10")).toBeTruthy();
		expect(within(srdReference).getByText("CC-BY-4.0")).toBeTruthy();
	});
});
