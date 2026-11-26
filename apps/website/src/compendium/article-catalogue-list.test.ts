import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import type { DocsArticle, DocsIndexV1 } from "./docs-types";
import { realDocsProjection } from "./real-docs-projection";
import { articleCatalogueListsFor } from "./srd-sections";

/**
 * A chapter's closing lists, checked against the real corpus.
 *
 * Two different failures live here. A NAMED list (`refs`) is a copy of the
 * table it stands under, and a copy needs a keeper: the Actions test reads that
 * table back out of the chapter and fails if the two disagree. A DERIVED list
 * (`ref_prefix`) cannot drift from a table, but it can quietly collect the
 * wrong things — `srd/armor/` names thirteen armors AND thirteen modifiers —
 * so what matters there is that the set is exactly what the catalogue holds
 * under that prefix.
 */

let outputRoot = "";
let index: DocsIndexV1;

beforeAll(async () => {
	const shared = realDocsProjection();
	outputRoot = shared.outputRoot;
	index = shared.index;
}, 180_000);

function article(section: string, id: string): DocsArticle {
	return JSON.parse(
		readFileSync(join(outputRoot, `articles/srd/${section}/${id}.json`), "utf8"),
	) as DocsArticle;
}

/** Every catalogue entry on the SRD page, across all of its sections. */
function srdCatalogue(): { ref: string; family: string; href: string }[] {
	const page = index.pages.find((candidate) => candidate.page_id === "srd");
	if (page === undefined) throw new Error("the SRD page is missing");
	// A section without a catalogue (rules-glossary, gameplay-toolbox) has no file.
	return page.sections
		.filter((section) => section.catalogue_href !== undefined)
		.flatMap((section) =>
			JSON.parse(
				readFileSync(
					join(outputRoot, "catalogues", "srd", `${encodeURIComponent(section.id)}.json`),
					"utf8",
				),
			),
		);
}

/** The action names in the first column of the Actions chapter's own SRD table. */
function tableActionNames(body: string): string[] {
	const table = /<table>([\s\S]*?)<\/table>/.exec(body);
	if (table?.[1] === undefined) throw new Error("the Actions chapter no longer prints a table");
	return [...table[1].matchAll(/<tr>([\s\S]*?)<\/tr>/g)]
		.map((row) => /<td>([\s\S]*?)<\/td>/.exec(row[1] ?? "")?.[1]?.trim())
		.filter((name): name is string => name !== undefined);
}

describe("article catalogue lists (sk-jay0.3.5.91)", () => {
	it("offers exactly the twelve actions the Actions chapter's own table names", () => {
		const actions = article("playing-the-game", "actions");
		const [authored] = articleCatalogueListsFor("playing-the-game", "actions");
		if (authored?.refs === undefined) throw new Error("the Actions chapter has no named list");
		const expected = tableActionNames(actions.body).map(
			(name) => `srd/action/${name.toLowerCase()}`,
		);
		expect(expected).toHaveLength(12);
		expect([...authored.refs]).toEqual(expected);

		const [list] = actions.catalogue_lists ?? [];
		expect(list?.title).toBe("In this ruleset");
		expect(list?.entries.map((entry) => entry.href)).toEqual(
			expected.map((ref) => `/docs/srd/mechanics/capabilities/${ref.slice("srd/".length)}`),
		);
		// The licensed table itself is untouched.
		expect(actions.body).toContain("<td>Utilize</td>");
	});

	it("derives a list as exactly the catalogue's own entries under that prefix", () => {
		const catalogue = srdCatalogue();
		const derived = [
			{ section: "equipment", id: "equipment-weapons" },
			{ section: "equipment", id: "equipment-armor" },
			{ section: "feats", id: "feats-feat-descriptions" },
			{ section: "character-origins", id: "character-origins-character-species" },
			{ section: "playing-the-game", id: "proficiency" },
		];
		for (const { section, id } of derived) {
			const rules = articleCatalogueListsFor(section, id);
			const lists = article(section, id).catalogue_lists ?? [];
			expect(rules).toHaveLength(lists.length);
			for (const [position, rule] of rules.entries()) {
				if (rule.ref_prefix === undefined) continue;
				const expected = catalogue
					.filter(
						(entry) =>
							entry.ref.startsWith(rule.ref_prefix ?? "") &&
							(rule.family === undefined || entry.family === rule.family),
					)
					.map((entry) => entry.ref)
					.sort();
				const got = (lists[position]?.entries ?? []).map((entry) => entry.ref).sort();
				expect(got, `${section}/${id} — ${rule.title}`).toEqual(expected);
				expect(got.length).toBeGreaterThan(0);
			}
		}
	});

	// `srd/armor/` and `srd/feat/` each span two families; without the filter the
	// armor list would carry each armor twice, once as its AC modifier.
	it("keeps a family filter from collecting the modifier rows beside the armor", () => {
		const lists = article("equipment", "equipment-armor").catalogue_lists ?? [];
		expect(lists[0]?.entries).toHaveLength(13);
		expect(lists[0]?.entries.every((entry) => entry.href?.startsWith("/docs/srd/equipment/"))).toBe(
			true,
		);
		const feats = article("feats", "feats-feat-descriptions").catalogue_lists ?? [];
		expect(feats[0]?.entries).toHaveLength(17);
	});

	// The tag form, for a set the data names but no ref prefix gathers: the four
	// origin feats sit among thirteen others under `srd/feat/`. The same tag also
	// rides on a capability, which is what `family` is doing here.
	it("derives a list from a tag, narrowed to one family", () => {
		const lists =
			article("gameplay-toolbox", "gameplay-toolbox-creating-a-background").catalogue_lists ?? [];
		expect(lists[0]?.entries.map((entry) => entry.ref)).toEqual([
			"srd/feat/alert",
			"srd/feat/magic-initiate",
			"srd/feat/savage-attacker",
			"srd/feat/skilled",
		]);
	});

	// The heading form: nothing in the data groups a monster chapter's members
	// (`family` is "monster" for all 331, `srd.creature_type.fey` covers Goblins
	// AND Hobgoblins, and the refs put the age before the colour so no prefix
	// holds). The chapter's own `###` headings do.
	it("reads a monster chapter's members out of the chapter's own headings", () => {
		const page = index.pages.find((candidate) => candidate.page_id === "srd");
		const monsters = page?.sections.find((section) => section.id === "monsters");
		let chapters = 0;
		let members = 0;
		for (const summary of monsters?.pages ?? []) {
			if (summary.featured_reference !== undefined) continue;
			const chapter = article("monsters", summary.id);
			const lists = chapter.catalogue_lists ?? [];
			if (lists.length === 0) continue;
			chapters += 1;
			const headings = [...chapter.body.matchAll(/^### (.+)$/gm)].map((match) => match[1]);
			const entries = lists[0]?.entries ?? [];
			members += entries.length;
			// One entry per heading, in the chapter's own order.
			expect(
				entries.map((entry) => entry.title),
				summary.id,
			).toEqual(headings);
			for (const entry of entries) {
				expect(entry.ref.startsWith("srd/creature/")).toBe(true);
				expect(entry.href?.startsWith("/docs/srd/monsters/")).toBe(true);
			}
		}
		expect([chapters, members]).toEqual([30, 85]);
	});

	it("gives no list to a chapter whose stat blocks became embedded subjects", () => {
		const blackDragons = article("monsters", "monsters-a-z-black-dragons");
		expect(blackDragons.body).not.toMatch(/^### /m);
		expect(blackDragons.catalogue_lists ?? []).toEqual([]);
	});

	// A featured article is a catalogue entry under another name; the prefix rule
	// above spans them, and a list naming the entry you are already on is noise.
	it("gives no list to a featured article", () => {
		const page = index.pages.find((candidate) => candidate.page_id === "srd");
		const monsters = page?.sections.find((section) => section.id === "monsters");
		const featured = (monsters?.pages ?? []).filter(
			(summary) => summary.featured_reference !== undefined,
		);
		expect(featured.length).toBeGreaterThan(100);
		for (const summary of featured)
			expect(article("monsters", summary.id).catalogue_lists ?? []).toEqual([]);
	});

	it("carries every list a chapter prints, not just the first", () => {
		const lists = article(
			"character-creation",
			"character-creation-create-your-character",
		).catalogue_lists;
		expect(lists?.map((list) => [list.title, list.entries.length])).toEqual([
			["Classes in this ruleset", 12],
			["Languages in this ruleset", 19],
			["Alignments in this ruleset", 9],
		]);
	});

	it("gives every listed entry a route", () => {
		const routes = new Set(srdCatalogue().map((entry) => entry.href));
		const offenders: string[] = [];
		for (const page of index.pages)
			for (const section of page.sections)
				for (const summary of section.pages ?? [])
					for (const list of (summary as DocsArticle).catalogue_lists ?? [])
						for (const entry of list.entries)
							if (entry.href === undefined || !routes.has(entry.href))
								offenders.push(`${section.id}/${summary.id}: ${entry.ref} -> ${entry.href}`);
		expect(offenders).toEqual([]);
	});
});
