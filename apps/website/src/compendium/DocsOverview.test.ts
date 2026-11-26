import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import DocsOverview from "./DocsOverview.svelte";
import DocsPageOverview from "./DocsPageOverview.svelte";
import type { DocsIndexV1, DocsPage } from "./docs-types";

const otherRules: DocsPage = {
	page_id: "other-rules",
	title: "Other Rules",
	intro: "A second bundle with no compendium converter.",
	nav_group: "adventure",
	href: "/docs/other-rules",
	sections: [
		{
			id: "safety",
			title: "Safety",
			intro: "Keep choices visible.",
			href: "/docs/other-rules/safety",
			pages: [
				{
					id: "clear-consent",
					title: "Clear Consent",
					href: "/docs/other-rules/safety/clear-consent",
					artifact_href: "/compendium/docs/articles/other-rules/safety/clear-consent.json",
				},
			],
		},
	],
};

const index: DocsIndexV1 = { version: 1, pages: [otherRules] };

describe("documentation overview components", () => {
	it("renders an arbitrary manifest-backed page without catalogue counts", () => {
		render(DocsOverview, { index });
		expect(screen.getByRole<HTMLAnchorElement>("link", { name: /Other Rules/ }).pathname).toBe(
			"/docs/other-rules",
		);
		expect(screen.getByText("A second bundle with no compendium converter.")).toBeTruthy();
		expect(screen.queryByText(/entries\./)).toBeNull();
	});

	it("renders generic page and section metadata without a legacy index", () => {
		const { rerender } = render(DocsPageOverview, { page: otherRules });
		expect(screen.getByRole("heading", { name: "Other Rules" })).toBeTruthy();
		expect(document.querySelector('[data-slot="docs-page-header"]')).toBeTruthy();
		expect(screen.getByRole<HTMLAnchorElement>("link", { name: /Safety/ }).pathname).toBe(
			"/docs/other-rules/safety",
		);
		rerender({ page: otherRules, section: otherRules.sections[0] });
		expect(screen.getByRole("heading", { name: "Safety" })).toBeTruthy();
		expect(screen.getByText("Keep choices visible.")).toBeTruthy();
		expect(screen.getByRole<HTMLAnchorElement>("link", { name: "Clear Consent" }).pathname).toBe(
			"/docs/other-rules/safety/clear-consent",
		);
	});

	it("allows an intentionally empty metadata introduction without a placeholder", () => {
		render(DocsPageOverview, { page: { ...otherRules, intro: "" } });
		expect(screen.getByRole("heading", { name: "Other Rules" })).toBeTruthy();
		expect(screen.queryByText(/Missing required metadata: metadata\.docs\.intro/)).toBeNull();
	});

	it("sanitizes authored markdown and diagnoses missing required metadata", () => {
		const malformed: DocsPage = {
			...otherRules,
			title: "" as unknown as string,
			intro: "Read **carefully** <img src=x onerror=alert(1)>",
			sections: [
				{
					id: "safety",
					href: "/docs/other-rules/safety",
					title: "" as unknown as string,
					intro: undefined as unknown as string,
				},
			],
		};
		render(DocsPageOverview, { page: malformed });
		expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
			"Invalid metadata: metadata.docs.title must not be empty.",
		);
		expect(screen.getByText("carefully").tagName).toBe("STRONG");
		expect(document.querySelector("img")).toBeNull();
		expect(
			screen.getByText("Missing required metadata: metadata.docs.sections[id=safety].intro."),
		).toBeTruthy();
	});

	it("keeps authored markdown links outside the overview navigation link", () => {
		const linked: DocsPage = {
			...otherRules,
			intro: "Read [the safety note](/docs/other-rules/safety).",
			sections: [
				{
					id: "safety",
					title: "Safety",
					intro: "See [details](/docs/other-rules/safety).",
					href: "/docs/other-rules/safety",
				},
			],
		};
		render(DocsPageOverview, { page: linked });
		expect(screen.getByRole<HTMLAnchorElement>("link", { name: "the safety note" }).pathname).toBe(
			"/docs/other-rules/safety",
		);
		expect(screen.getByRole<HTMLAnchorElement>("link", { name: "details" }).pathname).toBe(
			"/docs/other-rules/safety",
		);
		expect(document.querySelector("a a")).toBeNull();
	});
});
