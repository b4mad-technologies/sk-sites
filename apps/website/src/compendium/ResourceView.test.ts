import { render, screen, within } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import type { DocsResource } from "./docs-types";
import ResourceView from "./ResourceView.svelte";

const resource: DocsResource = {
	ref: "guide/focus/with-a-long-identity-that-must-wrap",
	bundle_id: "guide",
	display_name: "Focus",
	description: "Attention available by default.",
	value_kind: "int",
	initial_value: 2,
	min_value: 0,
	max_value: 4,
	recovery_rule: "persistent",
	href: "/docs/guide/rules/resource/guide%2Ffocus",
	tags: ["guide.attention"],
	attachments: [
		{
			bundle_id: "guide",
			namespace: "guide.text",
			source: "manifest",
			payload: {
				text: "Reference text",
				source: "source/focus.md",
				license: "CC-BY-4.0",
			},
		},
	],
};

describe("ResourceView", () => {
	it("renders a compact definition summary without presenting its default as actor state", () => {
		render(ResourceView, { resource, view: "compact" });
		expect(screen.getByText("Spellkave resource definition")).toBeTruthy();
		expect(screen.getByText("Default:")).toBeTruthy();
		expect(screen.getByText("2")).toBeTruthy();
		expect(screen.queryByText(/Current/)).toBeNull();
	});

	it("renders full definition fields, tags, reference text, provenance, and raw attachments", () => {
		render(ResourceView, { resource, view: "full" });
		expect(screen.getByRole("heading", { level: 1, name: "Focus" })).toBeTruthy();
		expect(screen.getByRole("region", { name: "Description" })).toBeTruthy();
		expect(screen.getByText("resource_definitions.description")).toBeTruthy();
		expect(screen.getByText("Definition default")).toBeTruthy();
		expect(screen.getByText("guide.attention")).toBeTruthy();
		expect(screen.getByText("Reference text")).toBeTruthy();
		expect(screen.getAllByText(/source\/focus\.md/).length).toBeGreaterThan(0);
		expect(screen.getByText("Raw payload")).toBeTruthy();
	});

	it("diagnoses absent provenance instead of inventing it", () => {
		render(ResourceView, { resource: { ...resource, attachments: [] }, view: "full" });
		expect(screen.getByText("No source provenance is authored for this resource.")).toBeTruthy();
	});

	it("makes an empty manifest description explicit", () => {
		render(ResourceView, { resource: { ...resource, description: "" }, view: "full" });
		expect(screen.getByText("No description is authored in this manifest field.")).toBeTruthy();
		expect(screen.getByText("resource_definitions.description")).toBeTruthy();
	});

	it("renders an inline row with the creature's own value and a link to the resource", () => {
		render(ResourceView, { resource, view: "inline", value: 17 });
		const row = screen.getByTestId("resource-inline");
		const link = screen.getByRole("link", { name: "Focus" });
		expect(link.getAttribute("href")).toBe(resource.href);
		expect(within(row).getByText("17")).toBeTruthy();
		expect(within(row).getByText("Attention available by default.")).toBeTruthy();
	});

	it("renders an inline boolean value as yes/no and omits the value when absent", () => {
		const withValue = render(ResourceView, { resource, view: "inline", value: false });
		expect(within(withValue.getByTestId("resource-inline")).getByText("no")).toBeTruthy();
		withValue.unmount();

		const withoutValue = render(ResourceView, { resource, view: "inline" });
		expect(within(withoutValue.getByTestId("resource-inline")).queryByText("no")).toBeNull();
	});

	it("splits full view into a header block and a details block via sections", () => {
		const headerOnly = render(ResourceView, {
			resource,
			view: "full",
			sections: { details: false },
		});
		expect(headerOnly.getByRole("region", { name: "Description" })).toBeTruthy();
		expect(headerOnly.queryByRole("heading", { name: "Tags" })).toBeNull();
		expect(headerOnly.queryByTestId("resource-provenance")).toBeNull();
		headerOnly.unmount();

		const detailsOnly = render(ResourceView, {
			resource,
			view: "full",
			sections: { header: false },
		});
		expect(detailsOnly.queryByRole("region", { name: "Description" })).toBeNull();
		expect(detailsOnly.getByText("guide.attention")).toBeTruthy();
		expect(detailsOnly.getByTestId("resource-provenance")).toBeTruthy();
	});

	it("renders same-named attachments from different bundles without collapsing identity", () => {
		const attachment = resource.attachments[0];
		if (attachment === undefined) throw new Error("fixture attachment is missing");
		render(ResourceView, {
			resource: {
				...resource,
				attachments: [...resource.attachments, { ...attachment, bundle_id: "extension" }],
			},
			view: "full",
		});
		expect(screen.getAllByText("Attachment · guide.text")).toHaveLength(2);
		expect(screen.getByText("Bundle guide")).toBeTruthy();
		expect(screen.getByText("Bundle extension")).toBeTruthy();
	});
});
