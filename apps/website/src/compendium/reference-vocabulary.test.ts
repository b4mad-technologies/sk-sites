import { describe, expect, it } from "vitest";
import type { DocsIndexV1, DocsPage } from "./docs-types";
import { buildReferenceVocabulary } from "./reference-vocabulary";

const link = (label: string, ref = label) => ({
	label,
	kind: "entity_definition",
	ref,
	href: `/docs/test/${ref}`,
});
const page = (links: NonNullable<DocsPage["links"]>): DocsPage => ({
	page_id: "test",
	title: "Test",
	intro: "",
	nav_group: "reference",
	href: "/docs/test",
	sections: [],
	links,
});
const index = (...pages: DocsPage[]): DocsIndexV1 => ({ version: 1, pages });

describe("public reference vocabulary", () => {
	it("resolves lazy preview artifacts from the existing catalogue by href", () => {
		const entry = {
			kind: "entity_definition",
			ref: "Fighter",
			family: "class",
			slug: "fighter",
			display_name: "Fighter",
			description: "A warrior.",
			href: "/docs/test/Fighter",
			artifact_href: "/compendium/docs/catalogue/test/fighter.json",
			facts: [],
		};
		const source = page([link("Fighter")]);
		source.sections = [
			{ id: "classes", title: "Classes", intro: "", href: "/docs/test", catalogue: [entry] },
		];
		expect(buildReferenceVocabulary(index(source)).targets[0]).toEqual({
			...link("Fighter"),
			previewHref: entry.artifact_href,
		});
	});
	it("derives stable unique links from authored page profiles without exporting page content", () => {
		const a = page([link("Wizard"), link("Fighter")]);
		const b = page([link("Fighter")]);
		expect(buildReferenceVocabulary(index(a, b))).toEqual({
			version: 1,
			targets: [link("Fighter"), link("Wizard")],
		});
		expect(buildReferenceVocabulary(index(b, a))).toEqual(buildReferenceVocabulary(index(a, b)));
	});
	it("keeps lookup-only targets and their autolink flag (sk-jay0.1.76.19.20)", () => {
		const elf = { ...link("Elf", "srd/species/elf"), autolink: false };
		expect(buildReferenceVocabulary(index(page([elf]))).targets).toEqual([elf]);
	});
	it("omits ambiguous labels across profiles, including case variants", () => {
		expect(
			buildReferenceVocabulary(index(page([link("Fighter", "class"), link("fighter", "pregen")])))
				.targets,
		).toEqual([]);
	});
	it("rejects non-docs, external, and backslash URL targets", () => {
		for (const href of [
			"javascript:alert(1)",
			"//elsewhere.test/docs/test",
			"/account",
			"/docs/\\evil",
		]) {
			expect(() => buildReferenceVocabulary(index(page([{ ...link("Fighter"), href }])))).toThrow(
				"local docs URL",
			);
		}
	});
	it("supports documents with no reference profile", () => {
		expect(buildReferenceVocabulary(index(page([])))).toEqual({ version: 1, targets: [] });
	});
});
