import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DocsArticlePage from "./DocsArticlePage.svelte";
import { renderDocsMarkdown } from "./docs-markdown";
import type { DocsArticle, DocsPage, DocsSection } from "./docs-types";

const articles: DocsArticle[] = [
	{
		id: "rhythm-of-play",
		title: "Rhythm of Play",
		body: "First page.",
		href: "/docs/rules/play/rhythm-of-play",
		artifact_href: "/compendium/docs/articles/rules/play/rhythm-of-play.json",
		source: { path: "rules.md", anchor: "Rhythm of Play", license: "CC-BY-4.0" },
	},
	{
		id: "six-abilities",
		title: "The Six Abilities",
		body: '<table onclick="evil()"><thead><tr><th>Score</th><th>Modifier</th></tr></thead><tbody><tr><td>10</td><td>+0<img src=x onerror=alert(1)></td></tr></tbody></table>\n\n<script>alert(1)</script>',
		href: "/docs/rules/play/six-abilities",
		artifact_href: "/compendium/docs/articles/rules/play/six-abilities.json",
		source: { path: "rules.md", anchor: "The Six Abilities", license: "CC-BY-4.0" },
	},
	{
		id: "d20-tests",
		title: "D20 Tests",
		body: "### Tests\n\n#### Difficulty Class\n\nRules.",
		href: "/docs/rules/play/d20-tests",
		artifact_href: "/compendium/docs/articles/rules/play/d20-tests.json",
		source: { path: "rules.md", anchor: "D20 Tests", license: "CC-BY-4.0" },
	},
];
const rhythm = articles[0] as DocsArticle;
const abilities = articles[1] as DocsArticle;
const d20Tests = articles[2] as DocsArticle;
abilities.blocks = renderDocsMarkdown(abilities.body);
const section: DocsSection = {
	id: "play",
	title: "Playing the Game",
	intro: "",
	href: "/docs/rules/play",
	pages: articles,
};
const page: DocsPage = {
	page_id: "rules",
	title: "Rules",
	intro: "",
	nav_group: "reference",
	href: "/docs/rules",
	sections: [section],
};

describe("DocsArticlePage", () => {
	beforeEach(() => vi.stubGlobal("scrollTo", vi.fn()));

	it("renders sanitized authored Markdown, tables, provenance, and ordered navigation", () => {
		render(DocsArticlePage, { page, section, article: abilities });
		expect(screen.getByRole("heading", { name: "The Six Abilities" })).toBeTruthy();
		expect(screen.getByRole("table")).toBeTruthy();
		expect(document.querySelector("script")).toBeNull();
		expect(document.querySelector("img")).toBeNull();
		expect(screen.getByTestId("docs-article-source").textContent).toContain(
			"rules.md · The Six Abilities · CC-BY-4.0",
		);
		expect(screen.getByRole("link", { name: /Rhythm of Play/ }).getAttribute("href")).toBe(
			rhythm.href,
		);
		expect(screen.getByRole("link", { name: /D20 Tests/ }).getAttribute("href")).toBe(
			d20Tests.href,
		);
	});

	it("moves ordinary in-app navigation to the top but leaves modified clicks to the browser", async () => {
		render(DocsArticlePage, { page, section, article: abilities });
		const previous = screen.getByRole("link", { name: /Rhythm of Play/ });
		await fireEvent.click(previous);
		expect(window.scrollTo).toHaveBeenCalledWith({ top: 0 });
		vi.mocked(window.scrollTo).mockClear();
		await fireEvent.click(previous, { ctrlKey: true });
		expect(window.scrollTo).not.toHaveBeenCalled();
	});

	it("diagnoses an empty authored body without inventing content", () => {
		render(DocsArticlePage, { page, section, article: { ...rhythm, body: "" } });
		expect(screen.getByText("Missing required metadata: documentation page body.")).toBeTruthy();
	});

	it("preserves ordinary third-page heading hierarchy", () => {
		d20Tests.blocks = renderDocsMarkdown(d20Tests.body);
		render(DocsArticlePage, { page, section, article: d20Tests });
		expect(screen.getByRole("heading", { level: 3, name: "Tests" })).toBeTruthy();
		expect(screen.getByRole("heading", { level: 4, name: "Difficulty Class" })).toBeTruthy();
	});

	it("renders an authored featured subject with its description and art before reader prose", () => {
		const article: DocsArticle = {
			...d20Tests,
			// A featured article carries no href of its own (sk-jay0.7.93).
			href: undefined,
			featured_reference: { kind: "entity_definition", ref: "rules/barbed-devil" },
			subjects: [
				{
					kind: "entity_definition",
					ref: "rules/barbed-devil",
					bundle_id: "rules",
					display_name: "Barbed Devil",
					description: "Manifest-authored creature description.",
					href: "/docs/rules/monsters/barbed-devil",
					tags: [],
					attachments: [
						{
							bundle_id: "rules",
							namespace: "rules.art.image",
							payload: { path: "art/barbed-devil.webp", license: "LicenseRef-Test" },
							asset_href: "/art/barbed-devil.webp",
						},
					],
					facets: [],
				},
			],
		};
		article.blocks = renderDocsMarkdown(article.body);
		render(DocsArticlePage, { page, section, article });
		expect(screen.getByTestId("subject-compact").textContent).toContain(
			"Manifest-authored creature description.",
		);
		expect(screen.getByRole("img", { name: "Barbed Devil" }).getAttribute("src")).toBe(
			"/art/barbed-devil.webp",
		);
		expect(screen.getByText("Rules.")).toBeTruthy();
	});

	it("renders a resource table once in authored order without compact-card duplication", () => {
		const body = `:::resources{view="table" nameLabel="Ability" descriptionLabel="Score measures"}
::resource{ref="rules/strength"}
::resource{ref="rules/dexterity"}
:::
`;
		const tableArticle: DocsArticle = {
			...abilities,
			body,
			blocks: renderDocsMarkdown(body),
			resources: [
				{
					ref: "rules/strength",
					bundle_id: "rules",
					display_name: "Strength",
					description: "**Physical** might.<br>Manifest-authored.",
					value_kind: "int",
					href: "/docs/rules/play/resource/rules%2Fstrength",
					tags: [],
					attachments: [],
				},
				{
					ref: "rules/dexterity",
					bundle_id: "rules",
					display_name: "Dexterity",
					description: "Physical agility.",
					value_kind: "int",
					href: "/docs/rules/play/resource/rules%2Fdexterity",
					tags: [],
					attachments: [],
				},
			],
		};
		render(DocsArticlePage, { page, section, article: tableArticle });
		const table = screen.getByRole("table");
		expect(table.textContent).toContain("Ability");
		expect(table.textContent).toContain("Score measures");
		expect(screen.getAllByRole("row")).toHaveLength(3);
		expect(table.querySelector("strong")?.textContent).toBe("Physical");
		expect(table.querySelector("br")).toBeTruthy();
		expect(screen.queryByTestId("resource-compact")).toBeNull();
	});
});

describe("DocsArticlePage closing catalogue list (sk-jay0.3.5.91)", () => {
	beforeEach(() => vi.stubGlobal("scrollTo", vi.fn()));

	const listed: DocsArticle = {
		id: "actions",
		title: "Actions",
		body: "Take an action.",
		blocks: renderDocsMarkdown("Take an action."),
		href: "/docs/rules/play/actions",
		artifact_href: "/compendium/docs/articles/rules/play/actions.json",
		source: { path: "rules.md", anchor: "Actions", license: "CC-BY-4.0" },
		catalogue_lists: [
			{
				title: "In this ruleset",
				entries: [
					{
						ref: "srd/action/dodge",
						title: "Action: Dodge",
						href: "/docs/srd/mechanics/capabilities/action/dodge",
						summary: "Attack rolls against you have Disadvantage.",
					},
					{
						ref: "srd/action/help",
						title: "Action: Help",
						href: "/docs/srd/mechanics/capabilities/action/help",
					},
				],
			},
		],
	};

	it("closes the article with the list, below the body and above the source", () => {
		render(DocsArticlePage, { page, section, article: listed });
		const list = screen.getByTestId("docs-article-catalogue-list");
		expect(screen.getByRole("heading", { level: 2, name: "In this ruleset" })).toBeTruthy();
		const link = screen.getByRole<HTMLAnchorElement>("link", { name: "Action: Dodge" });
		expect(link.getAttribute("href")).toBe("/docs/srd/mechanics/capabilities/action/dodge");
		// Order on the page: the chapter's own prose, then the list, then provenance.
		const source = screen.getByTestId("docs-article-source");
		expect(list.compareDocumentPosition(source)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
	});

	it("renders nothing extra for an article without a list", () => {
		render(DocsArticlePage, { page, section, article: d20Tests });
		expect(screen.queryByTestId("docs-article-catalogue-list")).toBeNull();
	});
});
