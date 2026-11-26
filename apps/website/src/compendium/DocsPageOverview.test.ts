import { fireEvent, render, screen, within } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import DocsPageOverview from "./DocsPageOverview.svelte";
import type { DocsCatalogueEntrySummary, DocsPage, DocsSection } from "./docs-types";

const page: DocsPage = {
	page_id: "srd",
	title: "SRD",
	intro: "",
	nav_group: "reference",
	href: "/docs/srd",
	sections: [],
};

const FAMILY_HEADINGS: Record<string, string> = {
	tag: "Vocabulary",
	"class-feature": "Class features",
	subclass: "Subclasses",
	resource: "Resources",
};

const FAMILY_NOUNS: Record<string, { singular: string; plural: string }> = {
	tag: { singular: "vocabulary entry", plural: "vocabulary entries" },
	"class-feature": { singular: "class feature", plural: "class features" },
	subclass: { singular: "subclass", plural: "subclasses" },
	resource: { singular: "resource", plural: "resources" },
};

function entry(family: string, ref: string): DocsCatalogueEntrySummary {
	return {
		kind: family === "tag" ? "tag_value_definition" : "entity_definition",
		ref,
		family,
		slug: ref,
		display_name: ref,
		description: "",
		href: `/docs/srd/classes/${ref}`,
		artifact_href: `/compendium/docs/catalogue/srd/classes/${ref}.json`,
		facts: [],
	};
}

/**
 * The section page's own top-level `<h2>` group headings ("Sections",
 * "Articles", "Guides", the fallback "Reference entries") — NOT
 * ReferenceCard's own per-entry `<h2>` title, which sits nested several
 * levels deeper inside a `<ul>`.
 */
function h2Headings(): string[] {
	const container = screen.getByTestId("docs-section-overview");
	return Array.from(container.querySelectorAll(":scope > h2")).map(
		(node) => node.textContent ?? "",
	);
}

/** Every secondary group's `<details>` element, in render order. */
function secondaryDetails(): HTMLDetailsElement[] {
	const container = screen.getByTestId("docs-section-overview");
	return Array.from(container.querySelectorAll(":scope > details"));
}

/** `<summary>` text for each secondary group ("Class features (352)", ...). */
function detailsSummaries(): string[] {
	return secondaryDetails().map((node) => node.querySelector("summary")?.textContent?.trim() ?? "");
}

/** Entry titles rendered by the top-level CatalogueList, i.e. the primary list, with no heading of its own. */
function primaryEntries(): string[] {
	const container = screen.getByTestId("docs-section-overview");
	const list = container.querySelector(":scope > .mb-4 + p + ul");
	return list
		? Array.from(list.querySelectorAll("li")).map((li) => li.textContent?.trim() ?? "")
		: [];
}

/** Entry titles rendered by the CatalogueList(s) between one `<h2>` group heading and the next (the non-grouped fallback path only). */
function entriesUnderHeading(headingText: string): string[] {
	const container = screen.getByTestId("docs-section-overview");
	const heading = within(container).getByRole("heading", { level: 2, name: headingText });
	const titles: string[] = [];
	for (
		let node = heading.nextElementSibling;
		node && node.tagName !== "H2";
		node = node.nextElementSibling
	) {
		titles.push(
			...Array.from(node.querySelectorAll("li")).map((li) => li.textContent?.trim() ?? ""),
		);
	}
	return titles;
}

describe("DocsPageOverview catalogue grouping (sk-jay0.3.5.64)", () => {
	it("splits an SRD section's catalogue into a heading-less primary list plus collapsed secondary family groups", () => {
		const section: DocsSection = {
			id: "classes",
			title: "Classes",
			intro: "",
			href: "/docs/srd/classes",
			primary_families: ["class"],
		};
		const catalogue = [
			entry("class", "barbarian"),
			entry("class-feature", "rage"),
			entry("tag", "srd-class-barbarian"),
		];

		render(DocsPageOverview, {
			page,
			section,
			catalogue,
			familyHeadings: FAMILY_HEADINGS,
			familyNouns: FAMILY_NOUNS,
		});

		// No "Reference entries" (or any other) h2 above the primary list — the h1 already names the section.
		expect(h2Headings()).toEqual([]);
		expect(primaryEntries()).toEqual(["class barbarian"]);

		// Secondary groups are collapsed <details>, summary names the group and its count.
		expect(detailsSummaries()).toEqual(["Class features (1)", "Vocabulary (1)"]);
		for (const details of secondaryDetails()) expect(details.open).toBe(false);

		const [classFeatureDetails, vocabularyDetails] = secondaryDetails();
		expect(within(classFeatureDetails as HTMLElement).getAllByRole("listitem")).toHaveLength(1);
		expect(within(classFeatureDetails as HTMLElement).getByText(/1 class feature$/)).toBeTruthy();
		expect(within(vocabularyDetails as HTMLElement).getByText(/1 vocabulary entry$/)).toBeTruthy();
	});

	it("a section with no declared primary family (character-creation) shows Articles before its secondary-only catalogue, never a blank primary heading or list", () => {
		const section: DocsSection = {
			id: "character-creation",
			title: "Character Creation",
			intro: "",
			href: "/docs/srd/character-creation",
			primary_families: [],
			pages: [
				{
					id: "character-creation-create-your-character",
					title: "Create Your Character",
					href: "/docs/srd/character-creation/character-creation-create-your-character",
					artifact_href:
						"/compendium/docs/articles/srd/character-creation/create-your-character.json",
				},
			],
		};
		const catalogue = [
			entry("tag", "srd-character-creation-alignment"),
			entry("tag", "srd-character-creation-point-cost"),
		];

		render(DocsPageOverview, {
			page,
			section,
			catalogue,
			familyHeadings: FAMILY_HEADINGS,
			familyNouns: FAMILY_NOUNS,
		});

		expect(h2Headings()).toEqual(["Articles"]);
		expect(primaryEntries()).toEqual([]);
		expect(detailsSummaries()).toEqual(["Vocabulary (2)"]);
	});

	it("a CatalogueList inside a closed secondary <details> is already mounted, and its own filter input still works once opened", async () => {
		const section: DocsSection = {
			id: "classes",
			title: "Classes",
			intro: "",
			href: "/docs/srd/classes",
			primary_families: ["class"],
		};
		const catalogue = [
			entry("class", "barbarian"),
			entry("class-feature", "rage"),
			entry("class-feature", "unarmored-defense"),
		];

		render(DocsPageOverview, {
			page,
			section,
			catalogue,
			familyHeadings: FAMILY_HEADINGS,
			familyNouns: FAMILY_NOUNS,
		});

		const [classFeatureDetails] = secondaryDetails();
		if (!classFeatureDetails) throw new Error("expected a Class features <details> group");
		expect(classFeatureDetails.open).toBe(false);

		// Closed <details> still mounts its content — both cards and the filter input already exist in the DOM.
		const scoped = within(classFeatureDetails);
		expect(scoped.getByText("rage")).toBeTruthy();
		expect(scoped.getByText("unarmored-defense")).toBeTruthy();
		const filter = scoped.getByPlaceholderText("Name, family, description, or fact");
		expect(filter).toBeTruthy();

		// Opening the group and filtering behaves exactly like the primary list's own CatalogueList.
		classFeatureDetails.open = true;
		await fireEvent.input(filter, { target: { value: "rage" } });
		expect(scoped.getByText("rage")).toBeTruthy();
		expect(scoped.queryByText("unarmored-defense")).toBeNull();
		expect(scoped.getByText("1 class feature")).toBeTruthy();
	});

	it("leaves a non-SRD bundle section (no sections.toml row at all) exactly as before: one ungrouped, uncollapsed Reference entries list", () => {
		const section: DocsSection = {
			id: "cast",
			title: "Cast",
			intro: "",
			href: "/docs/adventures/elven-mini/cast",
		};
		const catalogue = [
			entry("dm_npc", "eldrin"),
			entry("dm_npc", "vex"),
			entry("tag", "faction-guard"),
		];

		render(DocsPageOverview, { page, section, catalogue });

		expect(h2Headings()).toEqual(["Reference entries"]);
		expect(secondaryDetails()).toEqual([]);
		expect(entriesUnderHeading("Reference entries")).toEqual([
			"dm_npc eldrin",
			"dm_npc vex",
			"tag faction-guard",
		]);
	});
});

describe("DocsPageOverview reference-entry fallback", () => {
	const catalogue = [entry("resource", "ac"), entry("resource", "hp")];

	it("drops the ungrouped list when the section has articles of its own", () => {
		const section: DocsSection = {
			id: "playing-the-game",
			title: "Playing the Game",
			intro: "",
			href: "/docs/srd/playing-the-game",
			pages: [
				{
					id: "rhythm-of-play",
					title: "Rhythm of Play",
					href: "/docs/srd/playing-the-game/rhythm-of-play",
					artifact_href: "/compendium/docs/articles/srd/playing-the-game/rhythm-of-play.json",
				},
			],
		};

		render(DocsPageOverview, { page, section, catalogue });

		// The articles are the way in; the flat catalogue dump below them is gone.
		expect(h2Headings()).toEqual(["Articles"]);
		expect(screen.queryByText("resource ac")).toBeNull();
	});

	it("keeps the ungrouped list when it is the section's only index", () => {
		const section: DocsSection = {
			id: "mechanics",
			title: "Mechanics",
			intro: "",
			href: "/docs/srd/mechanics",
		};

		render(DocsPageOverview, { page, section, catalogue });

		expect(h2Headings()).toEqual(["Reference entries"]);
		expect(entriesUnderHeading("Reference entries")).toEqual(["resource ac", "resource hp"]);
	});
});
