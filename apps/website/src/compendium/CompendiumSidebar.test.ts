import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import CompendiumSidebar from "./CompendiumSidebar.svelte";
import type { DocsIndexV1 } from "./docs-types";

const docs: DocsIndexV1 = {
	version: 1,
	pages: [
		{
			page_id: "srd",
			title: "System Reference",
			intro: "",
			nav_group: "reference",
			href: "/docs/srd",
			sections: [{ id: "spells", title: "Spells", intro: "", href: "/docs/srd/spells" }],
		},
		{
			page_id: "other-rules",
			title: "Other Rules",
			intro: "",
			nav_group: "adventure",
			href: "/docs/other-rules",
			sections: [
				{
					id: "safety",
					title: "Safety",
					intro: "",
					href: "/docs/other-rules/safety",
					pages: [
						{
							id: "consent",
							title: "Consent",
							href: "/docs/other-rules/safety/consent",
							artifact_href: "/compendium/docs/articles/other-rules/safety/consent.json",
						},
					],
				},
			],
		},
		{
			page_id: "zzz-quest",
			title: "Aardvark Quest",
			intro: "",
			nav_group: "adventure",
			href: "/docs/zzz-quest",
			sections: [],
		},
	],
	technical_sources: [
		{
			source_id: "creatures",
			bundle_ids: ["srd"],
			row_count: 10,
			href: "/docs/technical/creatures",
			tables: [],
		},
	],
};

describe("CompendiumSidebar", () => {
	it("renders groups in the order: All documentation, Adventures, System reference, Technical data", () => {
		render(CompendiumSidebar, { docsIndex: docs, route: { corpus: "docs", page: "index" } });
		const nav = screen.getByRole("navigation", { name: "Documentation" });
		const text = nav.textContent ?? "";
		const positions = ["All documentation", "Adventures", "System reference", "Technical data"].map(
			(label) => text.indexOf(label),
		);
		expect(positions.every((position) => position >= 0)).toBe(true);
		expect(positions).toEqual([...positions].sort((left, right) => left - right));
	});

	it("nests an adventure page under the Adventures group instead of its own top-level group", () => {
		render(CompendiumSidebar, {
			docsIndex: docs,
			route: { corpus: "docs", page: "path", pathname: "/docs/other-rules" },
		});
		expect(screen.getByRole("button", { name: /Adventures/ })).toBeTruthy();
		expect(screen.queryByRole("button", { name: "Other Rules" })).toBeNull();
		expect(screen.getByRole("heading", { name: "Other Rules" })).toBeTruthy();
	});

	it("orders adventure pages within the group by title, not id", () => {
		render(CompendiumSidebar, {
			docsIndex: docs,
			route: { corpus: "docs", page: "path", pathname: "/docs/other-rules" },
		});
		const headings = screen
			.getAllByRole("heading")
			.map((heading) => heading.textContent)
			.filter((title): title is string => title === "Aardvark Quest" || title === "Other Rules");
		expect(headings).toEqual(["Aardvark Quest", "Other Rules"]);
	});

	it("opens the group containing the active route and leaves siblings closed", () => {
		render(CompendiumSidebar, {
			docsIndex: docs,
			route: { corpus: "docs", page: "path", pathname: "/docs/srd/spells" },
		});
		const adventures = screen.getByRole("button", { name: /Adventures/ });
		const reference = screen.getByRole("button", { name: /System reference/ });
		expect(reference.getAttribute("aria-expanded")).toBe("true");
		expect(adventures.getAttribute("aria-expanded")).toBe("false");
		expect(screen.queryByRole("heading", { name: "Other Rules" })).toBeNull();
	});

	it("omits the page heading when a group holds a single page", () => {
		render(CompendiumSidebar, {
			docsIndex: docs,
			route: { corpus: "docs", page: "path", pathname: "/docs/srd/spells" },
		});
		// "System reference" holds one page also called "System Reference";
		// repeating it under the group label reads as a stutter.
		expect(
			screen.getByRole("button", { name: /System reference/ }).getAttribute("aria-expanded"),
		).toBe("true");
		expect(screen.queryByRole("heading", { name: "System Reference" })).toBeNull();
	});

	it("keeps a page heading per page when a group holds several", () => {
		render(CompendiumSidebar, {
			docsIndex: docs,
			route: { corpus: "docs", page: "path", pathname: "/docs/other-rules" },
		});
		expect(screen.getByRole("heading", { name: "Aardvark Quest" })).toBeTruthy();
		expect(screen.getByRole("heading", { name: "Other Rules" })).toBeTruthy();
	});

	it("uses the static docs catalog for arbitrary pages and sections", () => {
		render(CompendiumSidebar, {
			docsIndex: docs,
			route: { corpus: "docs", page: "path", pathname: "/docs/other-rules/safety" },
		});
		expect(screen.getByRole("heading", { name: "Other Rules" })).toBeTruthy();
		expect(screen.getByRole<HTMLAnchorElement>("link", { name: "Safety" }).pathname).toBe(
			"/docs/other-rules/safety",
		);
		expect(screen.getByRole("link", { name: "Safety" }).getAttribute("aria-current")).toBe("page");
	});

	it("shows nested articles and marks the article link current", () => {
		render(CompendiumSidebar, {
			docsIndex: docs,
			route: {
				corpus: "docs",
				page: "path",
				pathname: "/docs/other-rules/safety/consent",
			},
		});
		const article = screen.getByRole("link", { name: "— Consent" });
		expect(article.getAttribute("aria-current")).toBe("page");
		expect(screen.getByRole("link", { name: "Safety" }).getAttribute("aria-current")).toBeNull();
	});

	it("keys catalog blocks by page id when authored titles repeat", () => {
		const otherRules = docs.pages.find((page) => page.page_id === "other-rules");
		if (!otherRules) throw new Error("docs fixture requires the other-rules page");
		render(CompendiumSidebar, {
			docsIndex: {
				...docs,
				pages: [otherRules, { ...otherRules, page_id: "other-rules-2" }],
			},
			route: { corpus: "docs", page: "path", pathname: otherRules.href },
		});
		expect(screen.getAllByRole("heading", { name: "Other Rules" })).toHaveLength(2);
	});
});
