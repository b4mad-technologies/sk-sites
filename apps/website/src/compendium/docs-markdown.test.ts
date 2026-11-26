import { describe, expect, it } from "vitest";
import { renderAttachmentMarkdown, renderDocsMarkdown } from "./docs-markdown";

describe("documentation Markdown", () => {
	it("uses remark directives and sanitizes GFM tables and raw HTML", () => {
		const blocks = renderDocsMarkdown(`## Scores

| Score | Modifier |
| --- | --- |
| 10 | +0 |

<script>alert(1)</script><img src=x onerror=alert(1)>

::resource{ref="guide/focus" view="compact"}
`);
		expect(blocks).toHaveLength(2);
		expect(blocks[0]).toMatchObject({ kind: "html" });
		const html = blocks[0]?.kind === "html" ? blocks[0].html : "";
		expect(html).toContain("<table>");
		expect(html).not.toContain("<script");
		expect(html).not.toContain("onerror");
		expect(blocks[1]).toEqual({ kind: "resource", ref: "guide/focus", view: "compact" });
	});

	it.each([
		['::other{ref="guide/focus" view="compact"}', "unsupported"],
		['::resource{ref="guide/focus" view="wide"}', "view"],
		['::resource{ref="guide/focus" view="compact" extra="x"}', "unknown attribute"],
		['::resource[ignored]{ref="guide/focus" view="compact"}', "label content"],
		['Text :resource[inside]{ref="guide/focus" view="compact"}', "top-level"],
	])("rejects invalid directive %s", (body, message) => {
		expect(() => renderDocsMarkdown(body)).toThrow(message);
	});

	it("resolves reference-style links across a resource embed", () => {
		const blocks = renderDocsMarkdown(`Read [the guide][guide].

::resource{ref="guide/focus" view="compact"}

Continue with [the guide][guide].

[guide]: /docs/guide`);
		expect(blocks).toHaveLength(3);
		expect(blocks[0]?.kind === "html" ? blocks[0].html : "").toContain('href="/docs/guide"');
		expect(blocks[2]?.kind === "html" ? blocks[2].html : "").toContain('href="/docs/guide"');
	});

	it("adds safe heading anchors and resolves authored relative source links", () => {
		const blocks = renderDocsMarkdown(
			"## Advancement Choice\n\nRead [the tool reference](../tool-reference.md#usage).",
			{
				sourcePath: "docs/patterns/advancement-choice.md",
				sourceBase: "https://example.test/repository/",
				publishedSources: new Map([["docs/tool-reference.md", "/docs/guide/tools/tool-reference"]]),
			},
		);
		const html = blocks[0]?.kind === "html" ? blocks[0].html : "";
		expect(html).toContain('id="user-content-advancement-choice"');
		expect(html).toContain('href="/docs/guide/tools/tool-reference#user-content-usage"');
	});

	it("keeps heading ids unique across embedded resource blocks", () => {
		const blocks = renderDocsMarkdown(`## Repeated

::resource{ref="guide/focus" view="compact"}

## Repeated`);
		expect(blocks[0]?.kind === "html" ? blocks[0].html : "").toContain(
			'id="user-content-repeated"',
		);
		expect(blocks[2]?.kind === "html" ? blocks[2].html : "").toContain(
			'id="user-content-repeated-1"',
		);
	});

	it("resolves reference definitions and local fragments to sanitized heading ids", () => {
		const [block] = renderDocsMarkdown(
			"## Details\n\nRead [local][here] and [external][other].\n\n[here]: #details\n[other]: ./other.md#details",
			{
				sourcePath: "docs/guide.md",
				publishedSources: new Map([["docs/other.md", "/docs/guide/other"]]),
			},
		);
		const html = block?.kind === "html" ? block.html : "";
		expect(html).toContain('href="#user-content-details"');
		expect(html).toContain('href="/docs/guide/other#user-content-details"');
	});

	it("rejects unresolved relative links without an authored source base", () => {
		expect(() =>
			renderDocsMarkdown("[missing](./missing.md)", {
				sourcePath: "docs/guide.md",
				publishedSources: new Map(),
			}),
		).toThrow(/no published target or source_base/);
	});

	it("retains ordered, unordered, and nested list semantics", () => {
		const [block] = renderDocsMarkdown("1. First\n2. Second\n   - Nested\n3. Third");
		const html = block?.kind === "html" ? block.html : "";
		expect(html).toContain("<ol>");
		expect(html).toContain("<ul>");
		expect(html.match(/<li>/g)).toHaveLength(4);
	});

	it("preserves source hard breaks normalized for TOML serialization", () => {
		expect(renderDocsMarkdown("**HP** 17 (5d6) <br>\\\nnext")).toEqual(
			renderDocsMarkdown("**HP** 17 (5d6) <br>  \nnext"),
		);
	});

	it("keeps local heading links aligned with sanitized ids without source context", () => {
		const [block] = renderDocsMarkdown("## Details\n\n[Jump](#details)");
		const html = block?.kind === "html" ? block.html : "";
		expect(html).toContain('id="user-content-details"');
		expect(html).toContain('href="#user-content-details"');
	});

	it("leaves directive examples in code fences inert", () => {
		const [block] = renderDocsMarkdown('```md\n::resource{ref="guide/focus" view="compact"}\n```');
		expect(block).toMatchObject({ kind: "html" });
		expect(block?.kind === "html" ? block.html : "").toContain("::resource");
	});

	it("projects an ordered generic resources table and extracts every nested ref", () => {
		const body = `:::resources{view="table" nameLabel="Focus" descriptionLabel="What it measures"}
::resource{ref="guide/focus"}
::resource{ref="guide/resolve"}
:::
`;
		expect(renderDocsMarkdown(body)).toEqual([
			{
				kind: "resource-table",
				refs: ["guide/focus", "guide/resolve"],
				nameLabel: "Focus",
				descriptionLabel: "What it measures",
			},
		]);
	});

	it("does not narrow valid resource identities that routes safely encode", () => {
		expect(renderDocsMarkdown('::resource{ref="guide/focus+mode" view="compact"}')).toEqual([
			{ kind: "resource", ref: "guide/focus+mode", view: "compact" },
		]);
	});

	it("parses safe generic subject embeds and leaves code examples inert", () => {
		expect(
			renderDocsMarkdown('::subject{kind="entity_definition" ref="other/item+kit" view="compact"}'),
		).toEqual([
			{ kind: "subject", subjectKind: "entity_definition", ref: "other/item+kit", view: "compact" },
		]);
		const [code] = renderDocsMarkdown(
			'```md\n::subject{kind="entity" ref="other/one" view="full"}\n```',
		);
		expect(code?.kind === "html" ? code.html : "").toContain("::subject");
	});

	it.each([
		['::subject{kind="monster" ref="other/one" view="compact"}', "kind"],
		['::subject{kind="entity" ref="" view="compact"}', "non-empty ref"],
		['::subject{kind="entity" ref="other/one" view="wide"}', "view"],
		['::subject{kind="entity" ref="other/one" view="compact" extra="x"}', "unknown attribute"],
	])("rejects invalid subject directive %s", (body, message) => {
		expect(() => renderDocsMarkdown(body)).toThrow(message);
	});

	it.each([
		[
			':::resources{view="cards" nameLabel="Name" descriptionLabel="Meaning"}\n::resource{ref="guide/focus"}\n:::',
			"view",
		],
		[
			':::resources{view="table" descriptionLabel="Meaning"}\n::resource{ref="guide/focus"}\n:::',
			"nameLabel",
		],
		[
			':::resources{view="table" nameLabel="Name" descriptionLabel="Meaning" extra="x"}\n::resource{ref="guide/focus"}\n:::',
			"unknown attribute",
		],
		[
			':::resources{view="table" nameLabel="Name" descriptionLabel="Meaning"}\nText\n:::',
			"only resource leaf",
		],
		[
			':::resources{view="table" nameLabel="Name" descriptionLabel="Meaning"}\n::resource{ref="guide/focus" view="compact"}\n:::',
			"unknown attribute",
		],
		[
			':::resources{view="table" nameLabel="Name" descriptionLabel="Meaning"}\n::resource[Label]{ref="guide/focus"}\n:::',
			"label content",
		],
		[
			':::resources{view="table" nameLabel="Name" descriptionLabel="Meaning"}\n::resource{ref="guide/focus"}\n::resource{ref="guide/focus"}\n:::',
			"duplicate",
		],
		[':::resources{view="table" nameLabel="Name" descriptionLabel="Meaning"}\n:::', "at least one"],
		[
			':::resources{view="table" nameLabel="Name" descriptionLabel="Meaning"}\n::resource\n:::',
			"non-empty ref",
		],
	])("rejects invalid resources table: %s", (body, message) => {
		expect(() => renderDocsMarkdown(body)).toThrow(message);
	});
});

describe("renderAttachmentMarkdown", () => {
	it("renders colon-prefixed source references as literal text instead of directives", () => {
		const html = renderAttachmentMarkdown(
			"See monsters.md:203-209 (§ Challenge Rating) and playing-the-game.md:923's own example.",
		);
		expect(html).toContain("monsters.md:203-209");
		expect(html).toContain("playing-the-game.md:923");
	});

	it("never parses directive syntax in attachment prose", () => {
		const html = renderAttachmentMarkdown(":::resource{ref=srd/cha}\n:::\n");
		expect(html).toContain(":::resource");
	});
});
