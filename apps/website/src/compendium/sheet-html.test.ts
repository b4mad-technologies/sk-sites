import { describe, expect, it } from "vitest";
import {
	isRedundantShortDescription,
	prettyCatalogLabel,
	renderSheetHtml,
	stripLeadingTitle,
} from "./sheet-html";

describe("renderSheetHtml", () => {
	it("escapes script tags in plain text", () => {
		const html = renderSheetHtml("<script>alert(1)</script>", "plain");
		expect(html).toContain("&lt;script&gt;");
		expect(html).not.toContain("<script>");
	});

	it("turns markdown headings, emphasis, and tables into HTML", () => {
		const source = `### Adult Black Dragon

_Huge Dragon (Chromatic)_

**AC** 19 <br>

<table>
  <thead>
    <tr><th>MOD</th></tr>
  </thead>
  <tbody>
    <tr><td>23</td></tr>
  </tbody>
</table>
`;
		const html = renderSheetHtml(source, "markdown");
		expect(html).toContain("<h3>Adult Black Dragon</h3>");
		expect(html).toContain("<em>Huge Dragon (Chromatic)</em>");
		expect(html).toContain("<strong>AC</strong>");
		expect(html).toContain("<table>");
		expect(html).toContain("<th>MOD</th>");
		expect(html).not.toContain("&lt;table");
		expect(html).not.toContain("onclick");
	});

	it("keeps fenced code and in-app markdown links", () => {
		const html = renderSheetHtml(
			"See [Quest composition](/docs/authoring/patterns/quest-composition).\n\n```ts\nconst x = 1;\n```",
			"markdown",
		);
		expect(html).toContain(
			'<a href="/docs/authoring/patterns/quest-composition">Quest composition</a>',
		);
		expect(html).toContain("<pre><code>const x = 1;\n</code></pre>");
		expect(html).not.toMatch(/<p><pre>/);
	});

	it("strips disallowed tags and attributes from tables", () => {
		const html = renderSheetHtml(
			`<table onclick="evil()"><tr><td><img src=x onerror=alert(1)><strong>ok</strong></td></tr></table>`,
			"markdown",
		);
		expect(html).toContain("<strong>ok</strong>");
		expect(html).not.toContain("onclick");
		expect(html).not.toContain("<img");
	});

	it("turns catalog markdown links into in-app anchors", () => {
		const html = renderSheetHtml(
			"makes a [Dexterity](/docs/srd/playing-the-game/dex) saving throw",
			"markdown",
		);
		expect(html).toContain('<a href="/docs/srd/playing-the-game/dex">Dexterity</a>');
	});

	it("keeps generic documentation links in authored markdown", () => {
		expect(renderSheetHtml("Read [safety](/docs/other-rules/safety).", "markdown")).toContain(
			'<a href="/docs/other-rules/safety">safety</a>',
		);
	});

	it("renders multiline Markdown blockquotes without admitting embedded HTML", () => {
		const html = renderSheetHtml(
			"> **Exceptions supersede general rules.**\n>\n> Keep the specific rule. <img src=x onerror=evil()>",
			"markdown",
		);
		expect(html).toContain("<blockquote>");
		expect(html).toContain("<strong>Exceptions supersede general rules.</strong>");
		expect(html).not.toContain("<img");
	});
});

describe("prettyCatalogLabel", () => {
	it("title-cases the last path segment", () => {
		expect(prettyCatalogLabel("srd/creature/adult-black-dragon")).toBe("Adult Black Dragon");
		expect(prettyCatalogLabel("srd/creature/commoner")).toBe("Commoner");
	});
});

describe("stripLeadingTitle", () => {
	it("drops a markdown heading that matches the entry name", () => {
		expect(stripLeadingTitle("### Adult Black Dragon\n\n_Huge Dragon_", "Adult Black Dragon")).toBe(
			"_Huge Dragon_",
		);
	});

	it("leaves prose that does not start with the name", () => {
		expect(stripLeadingTitle("A bright streak flashes from you.", "Fireball")).toBe(
			"A bright streak flashes from you.",
		);
	});
});

describe("isRedundantShortDescription", () => {
	it("treats a markdown stat-block stem as redundant once markup is stripped", () => {
		const short =
			"Huge Dragon (Chromatic), Chaotic Evil **AC** 19 **Initiative** +12 (22) <br> **HP** 195 (17d12 + 85) <br> **Speed** 40 ft., Fly 80 ft., Swim 40 ft.";
		const verbatim = `### Adult Black Dragon

_Huge Dragon (Chromatic), Chaotic Evil_

**AC** 19 **Initiative** +12 (22) <br>
**HP** 195 (17d12 + 85) <br>
**Speed** 40 ft., Fly 80 ft., Swim 40 ft. <br>
`;
		expect(isRedundantShortDescription(short, verbatim, "Adult Black Dragon")).toBe(true);
	});

	it("keeps a distinct Spellkave blurb", () => {
		expect(
			isRedundantShortDescription(
				"The innkeeper of the hamlet.",
				"A bright streak flashes from you.",
			),
		).toBe(false);
	});
});
