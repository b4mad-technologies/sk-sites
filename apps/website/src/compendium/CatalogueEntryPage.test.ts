import { render, screen, within } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import CatalogueEntryPage from "./CatalogueEntryPage.svelte";
import type {
	DocsCatalogueEntry,
	DocsCatalogueEntrySummary,
	DocsPage,
	DocsSection,
	DocsTagMemberSummary,
} from "./docs-types";

const section: DocsSection = {
	id: "spells",
	title: "Spells",
	intro: "",
	href: "/docs/rules/spells",
};
const page: DocsPage = {
	page_id: "rules",
	title: "Rules",
	intro: "",
	nav_group: "reference",
	href: "/docs/rules",
	sections: [section],
};
const entry: DocsCatalogueEntry = {
	kind: "entity_definition",
	ref: "other/spell/focus",
	family: "spell",
	slug: "focus",
	display_name: "Focus",
	description: "A concise docs summary.",
	href: "/docs/rules/spells/focus",
	artifact_href: "/compendium/docs/catalogue/rules/spells/focus.json",
	facts: [{ label: "Level", value: "1" }],
	record: { entity_def_id: "other/spell/focus" },
	featured_article: {
		id: "focus-reference",
		title: "Focus",
		// No `href`: a featured article owns no route of its own, it is
		// displayed at this entry's own href instead (sk-jay0.7.93).
		artifact_href: "/compendium/docs/articles/rules/spells/focus-reference.json",
		body: "## Spell text\n\nThe complete licensed text.",
		source: { path: "spells.md", anchor: "Focus", license: "CC-BY-4.0" },
		featured_reference: { kind: "entity_definition", ref: "other/spell/focus" },
		blocks: [{ kind: "html", html: "<h2>Spell text</h2><p>The complete licensed text.</p>" }],
	},
	subject: {
		kind: "entity_definition",
		ref: "other/spell/focus",
		bundle_id: "other",
		display_name: "Focus",
		description: "An authored spell definition.",
		href: "/docs/rules/spells/focus",
		tags: [],
		attachments: [
			{
				bundle_id: "other",
				namespace: "srd.text",
				payload: {
					text: "## Spell text\n\nThe complete licensed text.",
					source: "spells.md",
					license: "CC-BY-4.0",
				},
			},
		],
		facets: [{ label: "Definition record", rows: [{ entity_def_id: "other/spell/focus" }] }],
	},
};

describe("CatalogueEntryPage", () => {
	it("renders one shared page heading and family-authored facts above technical details", () => {
		render(CatalogueEntryPage, { entry, page, section });
		expect(screen.getAllByRole("heading", { level: 1, name: "Focus" })).toHaveLength(1);
		expect(screen.getByRole("heading", { name: "Spell profile" })).toBeTruthy();
		expect(screen.getByText("Level")).toBeTruthy();
		expect(screen.getByText("1")).toBeTruthy();
		expect(screen.getByText("Authored facets")).toBeTruthy();
		const docsSummary = screen.getByRole("region", { name: "Docs summary" });
		expect(
			within(within(docsSummary).getByTestId("description-rendered")).getByText(
				"A concise docs summary.",
			),
		).toBeTruthy();
		expect(screen.getByText("entity_definitions.description")).toBeTruthy();
		const description = screen.getByRole("region", { name: "Description" });
		expect(
			within(within(description).getByTestId("description-rendered")).getByText(
				"An authored spell definition.",
			),
		).toBeTruthy();
		// The `srd.text` attachment is the page's one and only place for the
		// entity's SRD chapter prose (sk-jay0.3.5.65): `featured_article` no
		// longer renders a second, separate article body above it.
		expect(screen.queryByTestId("docs-article-body")).toBeNull();
		expect(screen.queryByText("Text is rendered in the article above.")).toBeNull();
		expect(screen.getAllByText("The complete licensed text.")).toHaveLength(1);
	});

	it("renders a related resource_definition as a compact resource card", () => {
		render(CatalogueEntryPage, {
			entry: {
				...entry,
				relations: [
					{
						kind: "resource_definition",
						ref: "srd/ac",
						label: "Armor Class",
						bundle_id: "srd",
						href: "/docs/srd/playing-the-game/ac",
						resource: {
							ref: "srd/ac",
							bundle_id: "srd",
							display_name: "Armor Class",
							description: "A creature's Armor Class represents how hard it is to hit.",
							value_kind: "int",
							initial_value: 10,
							href: "/docs/srd/playing-the-game/ac",
							tags: [],
							attachments: [],
						},
					},
				],
			},
			page,
			section,
		});
		expect(screen.getByRole("heading", { name: "Related definitions" })).toBeTruthy();
		const relatedResourceLink = screen.getByRole("link", { name: "Armor Class" });
		expect(relatedResourceLink.getAttribute("href")).toBe("/docs/srd/playing-the-game/ac");
		expect(
			screen.getByText("A creature's Armor Class represents how hard it is to hit."),
		).toBeTruthy();
	});

	it("renders a related resource_definition inline with the creature's own value", () => {
		render(CatalogueEntryPage, {
			entry: {
				...entry,
				relations: [
					{
						kind: "resource_definition",
						ref: "srd/ac",
						label: "Armor Class",
						bundle_id: "srd",
						href: "/docs/srd/playing-the-game/ac",
						value_int: 17,
						resource: {
							ref: "srd/ac",
							bundle_id: "srd",
							display_name: "Armor Class",
							description: "A creature's Armor Class represents how hard it is to hit.",
							value_kind: "int",
							initial_value: 10,
							href: "/docs/srd/playing-the-game/ac",
							tags: [],
							attachments: [],
						},
					},
				],
			},
			page,
			section,
		});
		const row = screen.getByTestId("resource-inline");
		expect(within(row).getByRole("link", { name: "Armor Class" }).getAttribute("href")).toBe(
			"/docs/srd/playing-the-game/ac",
		);
		expect(within(row).getByText("17")).toBeTruthy();
	});

	it("renders the description before the profile and relations sections", () => {
		render(CatalogueEntryPage, { entry, page, section });
		const description = screen.getByRole("region", { name: "Description" });
		const profile = screen.getByRole("heading", { name: "Spell profile" });
		expect(
			description.compareDocumentPosition(profile) & Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	it("renders the facets heading exactly once", () => {
		render(CatalogueEntryPage, { entry, page, section });
		expect(screen.getAllByText("Authored facets")).toHaveLength(1);
	});

	it("does not repeat an identical component description as a docs summary", () => {
		const sharedDescription = "One exact authored description.";
		render(CatalogueEntryPage, {
			entry: {
				...entry,
				description: sharedDescription,
				subject: entry.subject ? { ...entry.subject, description: sharedDescription } : undefined,
			},
			page,
			section,
		});
		expect(screen.queryByRole("region", { name: "Docs summary" })).toBeNull();
		expect(screen.getByText("entity_definitions.description")).toBeTruthy();
		expect(
			within(screen.getByTestId("description-rendered")).getByText(sharedDescription),
		).toBeTruthy();
	});

	it("suppresses the docs summary when it is the leading text of the component description", () => {
		render(CatalogueEntryPage, {
			entry: {
				...entry,
				description: "An authored spell",
				subject: entry.subject
					? { ...entry.subject, description: "An authored spell definition." }
					: undefined,
			},
			page,
			section,
		});
		expect(screen.queryByRole("region", { name: "Docs summary" })).toBeNull();
		expect(screen.getByText("entity_definitions.description")).toBeTruthy();
		expect(
			within(screen.getByTestId("description-rendered")).getByText("An authored spell definition."),
		).toBeTruthy();
	});

	it("still renders a genuinely different, facts-style docs summary", () => {
		render(CatalogueEntryPage, {
			entry: {
				...entry,
				description: "Category: wand · Rarity: uncommon · Attunement: Requires Attunement",
				subject: entry.subject
					? { ...entry.subject, description: "An authored spell definition." }
					: undefined,
			},
			page,
			section,
		});
		const docsSummary = screen.getByRole("region", { name: "Docs summary" });
		expect(
			within(docsSummary).getByText(
				"Category: wand · Rarity: uncommon · Attunement: Requires Attunement",
			),
		).toBeTruthy();
	});

	// A row-kind page carries no resource/subject/tag, but its row view prints the
	// manifest description itself, so the same suppression has to reach it.
	it("does not repeat a row view's identical description as a docs summary", () => {
		const sharedDescription = "Melee attack with a Graze mastery weapon.";
		render(CatalogueEntryPage, {
			entry: {
				kind: "action_definition",
				ref: "srd/attack/melee-graze",
				family: "action",
				slug: "attack/melee-graze",
				display_name: "Melee Attack (Graze)",
				description: sharedDescription,
				href: "/docs/srd/mechanics/actions/attack/melee-graze",
				artifact_href: "/compendium/docs/catalogue/srd/mechanics/melee-graze.json",
				facts: [],
				record: {
					action_id: "srd/attack/melee-graze",
					display_name: "Melee Attack (Graze)",
					description: sharedDescription,
				},
			},
			page,
			section,
		});
		expect(screen.queryByRole("region", { name: "Docs summary" })).toBeNull();
		expect(screen.getByText("action_definitions.description")).toBeTruthy();
		expect(screen.getAllByTestId("description-rendered")).toHaveLength(1);
	});
});

describe("CatalogueEntryPage — belongs-to block (sk-jay0.3.5.65)", () => {
	const barbarian: DocsCatalogueEntrySummary = {
		kind: "entity_definition",
		ref: "srd/class/barbarian",
		family: "class",
		slug: "barbarian",
		display_name: "Barbarian",
		description: "A fierce warrior.",
		href: "/docs/srd/classes/barbarian",
		artifact_href: "/compendium/docs/catalogue/srd/classes/barbarian.json",
		facts: [],
		tags: ["srd.class", "srd.class.barbarian"],
	};
	const berserker: DocsCatalogueEntrySummary = {
		kind: "entity_definition",
		ref: "srd/subclass/path-of-the-berserker",
		family: "subclass",
		slug: "path-of-the-berserker",
		display_name: "Path of the Berserker",
		description: "A relentless fighting style.",
		href: "/docs/srd/classes/path-of-the-berserker",
		artifact_href: "/compendium/docs/catalogue/srd/classes/path-of-the-berserker.json",
		facts: [],
		tags: ["srd.subclass", "srd.subclass.path-of-the-berserker", "srd.class.barbarian"],
	};
	const rage: DocsCatalogueEntrySummary = {
		kind: "entity_definition",
		ref: "srd/class-feature/rage",
		family: "class-feature",
		slug: "rage",
		display_name: "Rage",
		description: "A battle fury.",
		href: "/docs/srd/classes/rage",
		artifact_href: "/compendium/docs/catalogue/srd/classes/rage.json",
		facts: [],
		tags: ["srd.class_feature", "srd.class_feature.rage", "srd.class.barbarian"],
	};
	const classCatalogue = [barbarian, berserker, rage];
	const classEntry: DocsCatalogueEntry = { ...barbarian, record: { entity_def_id: barbarian.ref } };
	const familyHeadings = { "class-feature": "Class features", subclass: "Subclasses" };
	const familyNouns = {
		"class-feature": { singular: "class feature", plural: "class features" },
		subclass: { singular: "subclass", plural: "subclasses" },
	};
	// Only families where the relationship really is ownership declare a
	// namespace — deliberately no `class-feature` row (sk-jay0.3.5.61: the
	// same feature id legitimately repeats across classes, so a feature
	// page never owns a block of its own) and no `spell` row (the
	// Divination false positive below).
	const identityNamespaces = { class: "srd.class", subclass: "srd.subclass" };

	it("lists the subclass and class features carrying the class's own identity tag, never the class itself", () => {
		render(CatalogueEntryPage, {
			entry: classEntry,
			page,
			section,
			catalogue: classCatalogue,
			familyHeadings,
			familyNouns,
			identityNamespaces,
		});
		expect(screen.getByRole("heading", { name: "Belongs to Barbarian" })).toBeTruthy();
		expect(screen.getByRole("heading", { name: "Subclasses (1)" })).toBeTruthy();
		expect(screen.getByRole("heading", { name: "Class features (1)" })).toBeTruthy();
		expect(screen.getByRole("link", { name: "Path of the Berserker" })).toBeTruthy();
		expect(screen.getByRole("link", { name: "Rage" })).toBeTruthy();
		expect(screen.queryByRole("link", { name: "Barbarian" })).toBeNull();
	});

	it("renders no belongs-to block for an entity whose own tags never name it as an identity", () => {
		const wyrmling: DocsCatalogueEntry = {
			kind: "entity_definition",
			ref: "srd/creature/black-dragon-wyrmling",
			family: "monster",
			slug: "black-dragon-wyrmling",
			display_name: "Black Dragon Wyrmling",
			description: "A young dragon.",
			href: "/docs/srd/monsters/black-dragon-wyrmling",
			artifact_href: "/compendium/docs/catalogue/srd/monsters/black-dragon-wyrmling.json",
			facts: [],
			tags: ["srd.creature", "srd.monster", "srd.creature_type.dragon"],
			record: { entity_def_id: "srd/creature/black-dragon-wyrmling" },
		};
		render(CatalogueEntryPage, {
			entry: wyrmling,
			page,
			section,
			catalogue: [wyrmling],
			familyHeadings,
			familyNouns,
			identityNamespaces,
		});
		expect(screen.queryByRole("heading", { name: /^Belongs to/ })).toBeNull();
	});

	it("never claims other entries as its own from a same-named tag outside its family's declared identity namespace", () => {
		// The spell "Divination" carries `srd.spell.school.divination` as
		// ordinary school-membership vocabulary. That tag's last segment
		// happens to equal the spell's own slug too, but "spell" has no row
		// in `identityNamespaces` — the relationship is "same school", not
		// ownership. Regression for the false positive an unauthored,
		// slug-only rule produced (sk-jay0.3.5.65 round 2).
		const divination: DocsCatalogueEntry = {
			kind: "entity_definition",
			ref: "srd/spell/divination",
			family: "spell",
			slug: "divination",
			display_name: "Divination",
			description: "A 4th-level divination spell.",
			href: "/docs/srd/spells/divination",
			artifact_href: "/compendium/docs/catalogue/srd/spells/divination.json",
			facts: [],
			tags: ["srd.spell", "srd.spell.school.divination"],
			record: { entity_def_id: "srd/spell/divination" },
		};
		const augury: DocsCatalogueEntrySummary = {
			kind: "entity_definition",
			ref: "srd/spell/augury",
			family: "spell",
			slug: "augury",
			display_name: "Augury",
			description: "A 2nd-level divination spell.",
			href: "/docs/srd/spells/augury",
			artifact_href: "/compendium/docs/catalogue/srd/spells/augury.json",
			facts: [],
			tags: ["srd.spell", "srd.spell.school.divination"],
		};
		render(CatalogueEntryPage, {
			entry: divination,
			page,
			section,
			catalogue: [divination, augury],
			familyHeadings,
			familyNouns,
			identityNamespaces,
		});
		expect(screen.queryByRole("heading", { name: /^Belongs to/ })).toBeNull();
		expect(screen.queryByRole("link", { name: "Augury" })).toBeNull();
	});

	it("never claims a class feature as its own even when its slug happens to match its own class-linkage tag", () => {
		// `class-feature` has no row in `identityNamespaces` (sk-jay0.3.5.61:
		// the same feature id legitimately repeats across classes), so a
		// class feature's own page never owns a "belongs to" block — even
		// though it still appears as a CHILD inside its owning class's block
		// (covered by the first test above).
		render(CatalogueEntryPage, {
			entry: { ...rage, record: { entity_def_id: rage.ref } },
			page,
			section,
			catalogue: classCatalogue,
			familyHeadings,
			familyNouns,
			identityNamespaces,
		});
		expect(screen.queryByRole("heading", { name: /^Belongs to/ })).toBeNull();
	});
});

describe("CatalogueEntryPage — tagged-with block (sk-jay0.3.5.67)", () => {
	const familyHeadings = { monster: "Monsters", spell: "Spells" };
	const familyNouns = {
		monster: { singular: "monster", plural: "monsters" },
		spell: { singular: "spell", plural: "spells" },
	};
	const monsterMember: DocsTagMemberSummary = {
		ref: "srd/creature/ooze",
		family: "monster",
		display_name: "Ooze",
		description: "A shapeless blob.",
		href: "/docs/srd/monsters/ooze",
	};
	const spellMember: DocsTagMemberSummary = {
		ref: "srd/spell/acid-globe",
		family: "spell",
		display_name: "Acid Globe",
		description: "A globe of acid.",
		href: "/docs/srd/spells/acid-globe",
	};
	const oozeTag: DocsCatalogueEntry = {
		kind: "tag_value_definition",
		ref: "srd.creature-type.ooze",
		family: "tag",
		slug: "creature-type/ooze",
		display_name: "Ooze",
		description: "Amorphous creatures.",
		href: "/docs/srd/tags/creature-type/ooze",
		artifact_href: "/compendium/docs/catalogue/srd/tags/creature-type%2Fooze.json",
		facts: [],
		record: { tag: "srd.creature-type.ooze" },
		members: [monsterMember, spellMember],
	};

	it("lists every member grouped by family below its own description, and never leaks facts/art onto a member row", () => {
		render(CatalogueEntryPage, { entry: oozeTag, page, section, familyHeadings, familyNouns });
		expect(screen.getByRole("heading", { name: "Tagged with Ooze" })).toBeTruthy();
		expect(screen.getByRole("heading", { name: "Monsters (1)" })).toBeTruthy();
		expect(screen.getByRole("heading", { name: "Spells (1)" })).toBeTruthy();
		expect(screen.getByRole("link", { name: "Ooze" })).toBeTruthy();
		expect(screen.getByRole("link", { name: "Acid Globe" })).toBeTruthy();
		// A member row carries no facts/art (DocsTagMemberSummary has neither field) —
		// the rendered card must not show a facts list or an image for it.
		const memberSection = screen
			.getByRole("heading", { name: "Tagged with Ooze" })
			.closest("section");
		expect(memberSection).toBeTruthy();
		expect(within(memberSection as HTMLElement).queryByRole("img")).toBeNull();
		expect((memberSection as HTMLElement).querySelector("dl")).toBeNull();
	});

	it("leads a tag entry with its own description and defers the identity rows below the members", () => {
		// `TagView` renders both the description and the Tag ID / bundle rows.
		// Without splitting it the way `ResourceView`/`SubjectView` are split,
		// the whole block lands after the members and the page opens with a
		// list of 331 monsters instead of saying what the tag means.
		const describedTag: DocsCatalogueEntry = {
			...oozeTag,
			tag: {
				ref: "srd.creature-type.ooze",
				display_name: "Ooze",
				description: "Amorphous creatures.",
				bundle_id: "srd",
				href: "/docs/srd/tags/creature-type/ooze",
			},
		} as DocsCatalogueEntry;
		render(CatalogueEntryPage, {
			entry: describedTag,
			page,
			section,
			familyHeadings,
			familyNouns,
		});
		// `getAllByText` throws when nothing matches, so index 0 always exists.
		const description = screen.getAllByText("Amorphous creatures.")[0] as HTMLElement;
		const members = screen.getByRole("heading", { name: "Tagged with Ooze" });
		const tagId = screen.getByText("Tag ID");
		expect(
			description.compareDocumentPosition(members) & Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		expect(members.compareDocumentPosition(tagId) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});

	it("renders no tagged-with block for a tag entry with no members", () => {
		const emptyTag: DocsCatalogueEntry = { ...oozeTag, members: undefined };
		render(CatalogueEntryPage, { entry: emptyTag, page, section, familyHeadings, familyNouns });
		expect(screen.queryByRole("heading", { name: /^Tagged with/ })).toBeNull();
	});

	it("shows both the child-tag vocabulary block and the tagged-with members block on a tag that is also a namespace, without confusing the two", () => {
		const alignmentChild: DocsCatalogueEntrySummary = {
			kind: "tag_value_definition",
			ref: "srd.alignment.chaotic-evil",
			family: "tag",
			slug: "alignment/chaotic-evil",
			display_name: "Chaotic Evil",
			description: "A chaotic evil alignment.",
			href: "/docs/srd/tags/alignment/chaotic-evil",
			artifact_href: "/compendium/docs/catalogue/srd/tags/alignment%2Fchaotic-evil.json",
			facts: [],
		};
		const alignmentTag: DocsCatalogueEntry = {
			kind: "tag_value_definition",
			ref: "srd.alignment",
			family: "tag",
			slug: "alignment",
			display_name: "Alignment",
			description: "A creature's moral and ethical outlook.",
			href: "/docs/srd/tags/alignment",
			artifact_href: "/compendium/docs/catalogue/srd/tags/alignment.json",
			facts: [],
			record: { tag: "srd.alignment" },
			members: [{ ...monsterMember, ref: "srd/creature/imp", display_name: "Imp" }],
		};
		render(CatalogueEntryPage, {
			entry: alignmentTag,
			page,
			section,
			catalogue: [alignmentChild],
			familyHeadings,
			familyNouns,
		});
		expect(screen.getByRole("heading", { name: "Tag vocabulary under Alignment" })).toBeTruthy();
		expect(screen.getByRole("heading", { name: "Tagged with Alignment" })).toBeTruthy();
		expect(screen.getByRole("link", { name: "Chaotic Evil" })).toBeTruthy();
		expect(screen.getByRole("link", { name: "Imp" })).toBeTruthy();
	});
});

describe("CatalogueEntryPage — page-level composition (sk-jay0.3.5.86)", () => {
	const tagged: DocsCatalogueEntry = {
		...entry,
		subject: entry.subject ? { ...entry.subject, tags: ["srd.size.huge"] } : undefined,
	};

	it("shows the tag chips above the profile and the attachments below the facets", () => {
		render(CatalogueEntryPage, { entry: tagged, page, section });
		const tags = screen.getByTestId("tag-list");
		const profile = screen.getByRole("heading", { name: "Spell profile" });
		const facets = screen.getByRole("heading", { name: "Authored facets" });
		const attachments = screen.getByRole("heading", { name: "Attachments" });
		expect(tags.compareDocumentPosition(profile) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		expect(
			facets.compareDocumentPosition(attachments) & Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	// The carrier used to print both blocks itself. Handing them to the page is
	// only correct if the carrier then stops.
	it("renders one tag section and one attachments section, not two", () => {
		render(CatalogueEntryPage, { entry: tagged, page, section });
		expect(screen.getAllByTestId("tag-list")).toHaveLength(1);
		expect(screen.getAllByRole("heading", { name: "Attachments" })).toHaveLength(1);
	});
});

describe("CatalogueEntryPage — creature statistics (sk-jay0.3.5.86)", () => {
	const resource = (ref: string, name: string) => ({
		ref,
		bundle_id: "srd",
		display_name: name,
		description: `${name} description.`,
		value_kind: "int" as const,
		initial_value: 10,
		href: `/docs/srd/playing-the-game/${ref.split("/")[1]}`,
		tags: [],
		attachments: [],
	});
	const creature: DocsCatalogueEntry = {
		...entry,
		family: "monster",
		// Projected from sections.toml by project-metadata-docs.ts; the page never
		// reads that file itself.
		resource_block: {
			heading: "Statistics",
			rest_title: "Other authored values",
			groups: [
				{ title: "Defense", resources: ["srd/ac", "srd/hp"] },
				{ title: "Ability Scores", resources: ["srd/str", "srd/cha"] },
			],
		},
		relations: [
			{
				kind: "resource_definition",
				ref: "srd/cha",
				label: "Charisma",
				bundle_id: "srd",
				value_int: 19,
				resource: resource("srd/cha", "Charisma"),
			},
			{
				kind: "resource_definition",
				ref: "srd/hp",
				label: "Hit Points",
				bundle_id: "srd",
				value_int: 195,
				resource: resource("srd/hp", "Hit Points"),
			},
			{
				kind: "resource_definition",
				ref: "srd/ac",
				label: "Armor Class",
				bundle_id: "srd",
				value_int: 19,
				resource: resource("srd/ac", "Armor Class"),
			},
		],
	};

	it("groups the creature's own values under the authored stat-block headings", () => {
		render(CatalogueEntryPage, { entry: creature, page, section });
		const block = screen.getByTestId("stat-block");
		expect(within(block).getByRole("heading", { name: "Statistics" })).toBeTruthy();
		const groups = within(block)
			.getAllByRole("heading", { level: 3 })
			.map((heading) => heading.textContent);
		expect(groups).toEqual(["Defense", "Ability Scores"]);
		const values = within(block)
			.getAllByTestId("resource-inline")
			.map((row) => row.textContent ?? "");
		expect(values[0]).toContain("Armor Class");
		expect(values[1]).toContain("Hit Points");
		expect(values[2]).toContain("Charisma");
	});

	// The same rows used to be the whole of "Related definitions"; showing them in
	// both places would be the duplication this block exists to end.
	it("does not repeat those values under related definitions", () => {
		render(CatalogueEntryPage, { entry: creature, page, section });
		expect(screen.queryByRole("heading", { name: "Related definitions" })).toBeNull();
		expect(screen.getAllByTestId("resource-inline")).toHaveLength(3);
	});

	it("leaves an entry the projection gave no block on the plain list", () => {
		render(CatalogueEntryPage, {
			entry: { ...creature, family: "spell", resource_block: undefined },
			page,
			section,
		});
		expect(screen.queryByTestId("stat-block")).toBeNull();
		expect(screen.getByRole("heading", { name: "Related definitions" })).toBeTruthy();
	});
});
