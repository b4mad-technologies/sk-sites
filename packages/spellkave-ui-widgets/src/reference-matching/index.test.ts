import { describe, expect, it } from "vitest";

import {
	compileReferenceMatcher,
	type HtmlNode,
	linkifyHtmlAst,
	linkifyMarkdownAst,
	type MarkdownNode,
} from "./index";

const dexterity = { label: "Dexterity", kind: "resource", ref: "srd/dex", href: "/docs/dex" };

describe("compileReferenceMatcher", () => {
	it("preserves original offsets and uses Unicode word boundaries", () => {
		const matcher = compileReferenceMatcher([dexterity]);
		expect(matcher.match("éDexterity Dexterity! DexterityX")).toEqual([
			{ start: 11, end: 20, target: dexterity },
		]);
	});

	it("resolves overlaps by priority, then longest label, then vocabulary order", () => {
		const matcher = compileReferenceMatcher([
			{ ...dexterity, label: "Magic", ref: "magic" },
			{ ...dexterity, label: "Magic Missile", ref: "missile" },
			{ ...dexterity, label: "Magic", ref: "priority", priority: 1 },
		]);
		expect(matcher.match("Magic Missile").map((match) => match.target.ref)).toEqual(["priority"]);
	});

	it("never matches a lookup-only target in prose", () => {
		const elf = {
			label: "Elf",
			kind: "entity_definition",
			ref: "srd/species/elf",
			href: "/docs/elf",
		};
		const matcher = compileReferenceMatcher([{ ...elf, autolink: false }, dexterity]);
		expect(matcher.match("An Elf with Dexterity").map((match) => match.target.ref)).toEqual([
			"srd/dex",
		]);
	});

	it("keeps a case-insensitive match's source spelling", () => {
		const matcher = compileReferenceMatcher([{ ...dexterity, label: "Combat", ignoreCase: true }]);
		const [match] = matcher.match("combat");
		expect(match && "combat".slice(match.start, match.end)).toBe("combat");
	});

	it("handles a case fold that expands without corrupting original offsets", () => {
		const target = { ...dexterity, label: "İx", ignoreCase: true };
		expect(compileReferenceMatcher([target]).match("İx")).toEqual([{ start: 0, end: 2, target }]);
	});

	it("uses the same Unicode fold for Greek final sigma", () => {
		const target = { ...dexterity, label: "ΟΣ", ignoreCase: true };
		expect(compileReferenceMatcher([target]).match("οσ")).toEqual([{ start: 0, end: 2, target }]);
	});

	it("allows a shorter target when an overlapping longer self target is excluded", () => {
		const self = { ...dexterity, label: "Magic Missile", ref: "self" };
		const magic = { ...dexterity, label: "Magic", ref: "magic" };
		const tree: MarkdownNode = {
			type: "root",
			children: [{ type: "paragraph", children: [{ type: "text", value: "Magic Missile" }] }],
		};
		linkifyMarkdownAst(tree, compileReferenceMatcher([magic, self]), { self });
		expect(tree.children?.[0]?.children).toMatchObject([
			{ type: "link", url: "/docs/dex", children: [{ value: "Magic" }] },
			{ type: "text", value: " Missile" },
		]);
	});

	it("does not emit unsafe hrefs from the Markdown adapter", () => {
		const tree: MarkdownNode = {
			type: "root",
			children: [{ type: "paragraph", children: [{ type: "text", value: "Dexterity" }] }],
		};
		linkifyMarkdownAst(
			tree,
			compileReferenceMatcher([{ ...dexterity, href: "javascript:alert(1)" }]),
		);
		expect(tree.children?.[0]?.children).toEqual([{ type: "text", value: "Dexterity" }]);
	});
});

describe("linkifyHtmlAst", () => {
	it("linkifies text structurally while protecting links, code, forms, and unsafe hrefs", () => {
		const tree: HtmlNode = {
			type: "root",
			children: [
				{ type: "element", tagName: "p", children: [{ type: "text", value: "Dexterity" }] },
				{ type: "element", tagName: "a", children: [{ type: "text", value: "Dexterity" }] },
				{ type: "element", tagName: "code", children: [{ type: "text", value: "Dexterity" }] },
				{ type: "element", tagName: "input", children: [{ type: "text", value: "Dexterity" }] },
				{
					type: "element",
					tagName: "span",
					properties: { role: "button" },
					children: [{ type: "text", value: "Dexterity" }],
				},
				{
					type: "element",
					tagName: "span",
					properties: { contentEditable: true },
					children: [{ type: "text", value: "Dexterity" }],
				},
			],
		};
		linkifyHtmlAst(tree, compileReferenceMatcher([dexterity]));
		expect(tree.children?.[0]?.children?.[0]).toMatchObject({
			type: "element",
			tagName: "a",
			properties: { href: "/docs/dex" },
		});
		expect(tree.children?.slice(1).map((node) => node.children?.[0]?.type)).toEqual([
			"text",
			"text",
			"text",
			"text",
			"text",
		]);
		const unsafe = { ...dexterity, href: "javascript:alert(1)" };
		const unsafeTree: HtmlNode = { type: "root", children: [{ type: "text", value: "Dexterity" }] };
		linkifyHtmlAst(unsafeTree, compileReferenceMatcher([unsafe]));
		expect(unsafeTree.children?.[0]).toEqual({ type: "text", value: "Dexterity" });
	});
});
