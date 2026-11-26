import { remark } from "remark";
import { describe, expect, it } from "vitest";

import { type DocsMarkdownNode, linkifyDocsMarkdown } from "./docs-linkify";

const dexterity = {
	label: "Dexterity",
	kind: "resource_definition",
	ref: "srd/dex",
	href: "/docs/srd/playing-the-game/dex",
};

function parse(markdown: string): DocsMarkdownNode {
	return remark().parse(markdown) as unknown as DocsMarkdownNode;
}

function links(tree: DocsMarkdownNode): Array<{ label: string; href: string }> {
	const result: Array<{ label: string; href: string }> = [];
	const walk = (node: DocsMarkdownNode) => {
		if (node.type === "link" && typeof node.url === "string") {
			const label = node.children?.map((child) => child.value ?? "").join("") ?? "";
			result.push({ label, href: node.url });
		}
		for (const child of node.children ?? []) walk(child);
	};
	walk(tree);
	return result;
}

function visibleText(tree: DocsMarkdownNode): string {
	let value = "";
	const walk = (node: DocsMarkdownNode) => {
		if (typeof node.value === "string") value += node.value;
		for (const child of node.children ?? []) walk(child);
	};
	walk(tree);
	return value;
}

describe("linkifyDocsMarkdown", () => {
	it("recreates Fireball's authored Dexterity target without changing visible prose", () => {
		const tree = parse("Each creature makes a Dexterity saving throw.");
		linkifyDocsMarkdown(tree, [dexterity]);
		expect(links(tree)).toEqual([{ label: "Dexterity", href: "/docs/srd/playing-the-game/dex" }]);
		expect(visibleText(tree)).toBe("Each creature makes a Dexterity saving throw.");
	});

	it("uses ordered historical winners for duplicate display labels", () => {
		const tree = parse("A feature grants Spellcasting, then Spellcasting again.");
		linkifyDocsMarkdown(tree, [
			{
				label: "Spellcasting",
				kind: "entity_definition",
				ref: "srd/class-feature/bard/spellcasting",
				href: "/docs/srd/classes/spellcasting",
			},
		]);
		expect(links(tree)).toEqual([
			{ label: "Spellcasting", href: "/docs/srd/classes/spellcasting" },
		]);
	});

	it("keeps case and ASCII word boundaries while resetting the first match per paragraph", () => {
		const tree = parse("Dexterity Dexterity.\n\nDexterityX dexterity Dexterity.");
		linkifyDocsMarkdown(tree, [dexterity]);
		expect(links(tree)).toEqual([
			{ label: "Dexterity", href: "/docs/srd/playing-the-game/dex" },
			{ label: "Dexterity", href: "/docs/srd/playing-the-game/dex" },
		]);
	});

	it("leaves headings, existing links, code, and raw HTML blocks unchanged", () => {
		const tree = parse(
			'# Dexterity\n\n[Dexterity](https://example.test) `Dexterity`\n\n<a href="/existing">Dexterity</a> Dexterity',
		);
		linkifyDocsMarkdown(tree, [dexterity]);
		expect(links(tree)).toEqual([{ label: "Dexterity", href: "https://example.test" }]);
	});

	it("does not create a self link", () => {
		const tree = parse("Dexterity");
		linkifyDocsMarkdown(tree, [dexterity], { kind: "resource_definition", ref: "srd/dex" });
		expect(links(tree)).toEqual([]);
	});

	it("matches the retired one-link-per-target behavior across a GFM table", () => {
		const tree = parse("| Ability | Note |\n| --- | --- |\n| Dexterity | Dexterity |");
		linkifyDocsMarkdown(tree, [dexterity]);
		expect(links(tree)).toEqual([{ label: "Dexterity", href: "/docs/srd/playing-the-game/dex" }]);
	});

	it("rejects duplicate labels rather than selecting a hidden target", () => {
		expect(() =>
			linkifyDocsMarkdown(parse("Dexterity"), [dexterity, { ...dexterity, href: "/other" }]),
		).toThrow("duplicate label 'Dexterity'");
	});
});

describe("linkifyDocsMarkdown case-insensitive targets", () => {
	const combat = {
		label: "Combat",
		kind: "docs_page",
		ref: "playing-the-game/combat",
		href: "/docs/srd/playing-the-game/combat",
		ignoreCase: true,
	};

	it("links a rules term the prose spells in lower case, keeping the spelling", () => {
		const tree = parse("Outside combat, the GM decides how to resolve an activity.");
		linkifyDocsMarkdown(tree, [combat]);
		expect(links(tree)).toEqual([{ label: "combat", href: combat.href }]);
		// The licensed text is quoted verbatim; linking must not recase a word.
		expect(visibleText(tree)).toBe("Outside combat, the GM decides how to resolve an activity.");
	});

	it("leaves a proper-noun target case-sensitive", () => {
		const tree = parse("The bane of the realm walked in.");
		linkifyDocsMarkdown(tree, [
			{
				label: "Bane",
				kind: "entity_definition",
				ref: "srd/spell/bane",
				href: "/docs/srd/spells/bane",
			},
		]);
		expect(links(tree)).toEqual([]);
	});

	it("still respects word boundaries", () => {
		const tree = parse("Noncombatants stay back.");
		linkifyDocsMarkdown(tree, [combat]);
		expect(links(tree)).toEqual([]);
	});

	it("rejects a target that differs from another only in case", () => {
		expect(() =>
			linkifyDocsMarkdown(parse("combat"), [
				combat,
				{ label: "combat", kind: "docs_page", ref: "other", href: "/docs/other" },
			]),
		).toThrow(/duplicate label/);
	});

	it("rejects an ignore-case target after a case-sensitive variant", () => {
		expect(() =>
			linkifyDocsMarkdown(parse("combat"), [
				{ ...combat, label: "combat", ignoreCase: false },
				combat,
			]),
		).toThrow(/duplicate label/);
	});
});
