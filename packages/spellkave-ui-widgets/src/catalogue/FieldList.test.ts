import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import FieldList from "./FieldList.svelte";
import type { DocsRowField } from "./types";

const fields: DocsRowField[] = [
	{ label: "Definition ID", value: "guide/focus", code: true },
	{ label: "Owning bundle", value: "guide" },
	{ label: "Namespace tag", value: "guide.attention", href: "/docs/guide/tags/guide.attention" },
];

describe("FieldList", () => {
	it("renders label/value rows, a code value, and a linked value", () => {
		render(FieldList, { fields });
		expect(screen.getByText("Definition ID")).toBeTruthy();
		expect(screen.getByText("guide/focus").tagName.toLowerCase()).toBe("code");
		expect(screen.getByText("guide")).toBeTruthy();
		const link = screen.getByRole("link", { name: "guide.attention" });
		expect(link.getAttribute("href")).toBe("/docs/guide/tags/guide.attention");
	});

	it("renders a value with no href as plain text, not a link", () => {
		const { container } = render(FieldList, {
			fields: [{ label: "Owning bundle", value: "guide" }],
		});
		expect(container.querySelector("a")).toBeNull();
		expect(screen.getByText("guide").tagName.toLowerCase()).toBe("dd");
	});

	it("renders nothing for an empty field list", () => {
		render(FieldList, { fields: [] });
		expect(screen.queryByTestId("field-list")).toBeNull();
	});

	it("renders a DSL field as highlighted linked code", () => {
		render(FieldList, {
			fields: [
				{
					label: "Resolution predicate",
					value: "actor.stat('srd/ac')",
					dsl: {
						tokens: [
							{ kind: "Ident", start: 0, end: 5 },
							{ kind: "Dot", start: 5, end: 6 },
							{ kind: "Ident", start: 6, end: 10 },
							{ kind: "LParen", start: 10, end: 11 },
							{ kind: "StringLit", start: 11, end: 19, href: "/docs/srd/resources/srd-ac" },
							{ kind: "RParen", start: 19, end: 20 },
						],
					},
				},
			],
		});
		expect(screen.getByTestId("dsl-expression")).toBeTruthy();
		const link = screen.getByRole("link", { name: "'srd/ac'" });
		expect(link.getAttribute("href")).toBe("/docs/srd/resources/srd-ac");
	});

	it("routes a field link through a caller's navigate instead of the docs catalogue", async () => {
		const seen: string[] = [];
		render(FieldList, {
			fields: [{ label: "Holder", value: "Torvald", href: "/w/kavemouth/person/1" }],
			navigate: (href: string) => seen.push(href),
		});
		await fireEvent.click(screen.getByRole("link", { name: "Torvald" }));
		expect(seen).toEqual(["/w/kavemouth/person/1"]);
	});

	it("leaves a modifier-click to the browser", async () => {
		const seen: string[] = [];
		render(FieldList, {
			fields: [{ label: "Holder", value: "Torvald", href: "/w/kavemouth/person/1" }],
			navigate: (href: string) => seen.push(href),
		});
		await fireEvent.click(screen.getByRole("link", { name: "Torvald" }), { metaKey: true });
		expect(seen).toEqual([]);
	});
});
