import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import parsedDesignMd from "virtual:spellkave-design-md";
import { describe, expect, it } from "vitest";
import {
	catalogHeadingsFromDocPages,
	DOC_PAGE_DESIGN_HEADING,
	DOC_PAGE_SLUGS,
	joinDesignCatalog,
	type ParsedDesignMd,
} from "./design-catalog";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../../..");
const parserPath = path.join(repoRoot, "vendor/impeccable/design-parser.mjs");
const pagesPath = path.join(here, "../docs/pages.ts");

const EXPECTED_UNRULED = [
	"Themes",
	"Accordion",
	"Collapsible",
	"Badge",
	"Date and time",
	"Dialog",
	"Popover",
	"Progress",
	"Radio Group",
	"Scroll Area",
	"Select",
	"Switch",
	"Tooltip",
];

describe("design catalog join", () => {
	it("fails loudly if parseDesignMd is missing", () => {
		expect(fs.existsSync(parserPath), `DESIGN.md parser missing at ${parserPath}`).toBe(true);
	});

	it("keeps documented pages and DESIGN.md component subsections in a bidirectional join", () => {
		const pagesSource = fs.readFileSync(pagesPath, "utf8");
		for (const slug of DOC_PAGE_SLUGS) {
			expect(pagesSource.includes(`path: "${slug}"`), `pages.ts is missing path "${slug}"`).toBe(
				true,
			);
		}

		const catalog = joinDesignCatalog(parsedDesignMd);
		const headings = catalogHeadingsFromDocPages();
		expect(catalog.samples.map((sample) => sample.heading)).toEqual(headings);

		const unruled = catalog.samples
			.filter((sample) => sample.status === "unruled")
			.map((sample) => sample.heading);
		expect(unruled, `unruled sample(s): ${unruled.join(", ")}`).toEqual(EXPECTED_UNRULED);

		const ruledWithoutExcerpt = catalog.samples.filter(
			(sample) => sample.status === "ruled" && sample.excerpts.length === 0,
		);
		expect(
			ruledWithoutExcerpt.map((sample) => sample.heading),
			`ruled sample(s) with empty excerpts: ${ruledWithoutExcerpt.map((sample) => sample.heading).join(", ")}`,
		).toEqual([]);

		const unsampledNames = catalog.unsampledComponents.map((component) => component.name);
		expect(unsampledNames).toEqual(["Authenticated and Guest Surfaces"]);

		const documentedHeadings = new Set(
			Object.values(DOC_PAGE_DESIGN_HEADING).filter((heading): heading is string =>
				Boolean(heading),
			),
		);
		const model = parsedDesignMd as ParsedDesignMd;
		for (const component of model.components?.components ?? []) {
			const sampled = documentedHeadings.has(component.name);
			const unsampled = unsampledNames.includes(component.name);
			expect(
				sampled || unsampled,
				`DESIGN.md ### ${component.name} is neither a documented page heading nor listed unsampled`,
			).toBe(true);
		}

		expect(catalog.dosDonts.dos.length).toBeGreaterThan(0);
		expect(catalog.dosDonts.donts.length).toBeGreaterThan(0);
	});

	it("throws instead of shipping an empty bound excerpt", () => {
		const emptyColors = {
			...(parsedDesignMd as ParsedDesignMd),
			colors: { description: null, rules: [] },
		};
		expect(() => joinDesignCatalog(emptyColors)).toThrow(/Semantic colors/);
	});
});
