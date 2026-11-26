import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ownerCandidates, rowKindCoverage } from "@spellkave/srd-cc/docs/row-kind-coverage";
import { afterEach, describe, expect, it } from "vitest";
import type { DocsArticle, DocsCatalogueEntry } from "./docs-types";
import {
	buildDocsSearchIndex,
	buildMetadataDocsIndex,
	buildTechnicalDocsProjection,
	type DocsProjectionRoot,
	projectMetadataDocsIndex,
} from "./project-metadata-docs";
import { realDocsProjection } from "./real-docs-projection";

let dir = "";
const temporaryDirs: string[] = [];
afterEach(() => {
	for (const path of temporaryDirs.splice(0)) rmSync(path, { recursive: true, force: true });
});

function manifest(
	bundle: string,
	pageId?: string,
	dependencies: string[] = [],
	readerPages = false,
): string {
	return `#:schema https://spellkave.dev/schema/world-manifest-1.0.0.json
schema_version = "1.0.0"
[[bundles]]
bundle_id = "${bundle}"
display_name = "${bundle}"
author = "test"
version = "1.0.0"
depends_on = [${dependencies.map((id) => `"${id}"`).join(", ")}]
description = "test"
${
	pageId === undefined
		? ""
		: `[metadata.docs]
version = 1
page_id = "${pageId}"
title = "${bundle} title"
nav_group = "reference"
intro = "${bundle} intro"
[[metadata.docs.sections]]
id = "zeta"
title = "Zeta authored first"
intro = "Zeta intro"
${
	readerPages
		? `[[metadata.docs.sections.pages]]
id = "second"
title = "Authored second"
body = "Second body"
source = { path = "guide.md", anchor = "Second", license = "CC-BY-4.0" }
[[metadata.docs.sections.pages]]
id = "first"
title = "Authored first"
body = "First body"
source = { path = "guide.md", anchor = "First", license = "CC-BY-4.0" }
`
		: ""
}
[[metadata.docs.sections]]
id = "alpha"
title = "Alpha authored second"
intro = "Alpha intro"
`
}`;
}

function setup(specs: Record<string, string>): Record<string, string> {
	dir = mkdtempSync(join(tmpdir(), "website-docs-projection-"));
	temporaryDirs.push(dir);
	return Object.fromEntries(
		Object.entries(specs).map(([name, contents]) => {
			const path = join(dir, `${name}.toml`);
			writeFileSync(path, contents);
			return [name, path];
		}),
	);
}

function pathOf(paths: Record<string, string>, name: string): string {
	const value = paths[name];
	if (value === undefined) throw new Error(`test fixture '${name}' is missing`);
	return value;
}

function withContentRef(sourcePath = "content.toml"): string {
	return `${manifest("guide", "guide").replace(
		'intro = "Zeta intro"',
		`intro = "Zeta intro"
[[metadata.docs.sections.pages]]
id = "focus"
title = "Focus"
content = { source_path = "${sourcePath}", namespace = "docs", id = "focus" }`,
	)}\n[[include]]\npath = "content.toml"\n`;
}

function contentFragment(
	body = 'A focused rule.\n\n:::resources{view="table" nameLabel="Focus" descriptionLabel="What it measures"}\n::resource{ref="guide/focus"}\n:::',
	initialValue = "2",
): string {
	return `[metadata.docs.focus]
body = ${JSON.stringify(body)}
source = { path = "source/rules.md", anchor = "Focus", license = "CC-BY-4.0" }

[[resource_definitions]]
resource_definition_id = "guide/focus"
display_name = "Focus"
description = "Attention available by default."
value_kind = "int"
initial_value = ${initialValue}
min_value = 0
max_value = 4
recovery_rule = "persistent"
bundle_id = "guide"

[[resource_definition_tag]]
resource_definition_id = "guide/focus"
tag = "guide.attention"
source = "manifest"
bundle_id = "guide"

[[metadata_attachments]]
target_kind = "resource_definition"
target_ref = "guide/focus"
namespace = "guide.text"
payload_json = '{"text":"Reference text","source":"source/focus.md","license":"CC-BY-4.0"}'
bundle_id = "guide"
source = "manifest"
`;
}

describe("metadata docs index projection", () => {
	it("resolves a strict catalogue array from included fragment metadata", () => {
		const root = `${manifest("guide", "guide").replace(
			'intro = "Zeta intro"',
			`intro = "Zeta intro"
catalogue_content = { source_path = "catalogue.toml", namespace = "docs", id = "zeta-catalogue" }`,
		)}
[[include]]
path = "catalogue.toml"
`;
		const paths = setup({ guide: root });
		writeFileSync(
			join(dir, "catalogue.toml"),
			`[metadata.docs.zeta-catalogue]
catalogue = [{ kind = "entity_definition", ref = "guide/widget", family = "item", slug = "widget" }]
[[entity_definitions]]
entity_def_id = "guide/widget"
display_name = "Widget"
description = "A widget."
bundle_id = "guide"
`,
		);
		expect(
			buildMetadataDocsIndex([{ rootManifestPath: pathOf(paths, "guide") }]).pages[0]?.sections[0]
				?.catalogue?.[0],
		).toMatchObject({ ref: "guide/widget", href: "/docs/guide/zeta/widget" });
	});

	it("leaves a non-SRD bundle section ungrouped (no primary_families) while shipping the global family_headings map once (sk-jay0.3.5.64)", () => {
		const root = `${manifest("guide", "guide").replace(
			'intro = "Zeta intro"',
			`intro = "Zeta intro"
catalogue_content = { source_path = "catalogue.toml", namespace = "docs", id = "zeta-catalogue" }`,
		)}
[[include]]
path = "catalogue.toml"
`;
		const paths = setup({ guide: root });
		writeFileSync(
			join(dir, "catalogue.toml"),
			`[metadata.docs.zeta-catalogue]
catalogue = [{ kind = "entity_definition", ref = "guide/widget", family = "item", slug = "widget" }]
[[entity_definitions]]
entity_def_id = "guide/widget"
display_name = "Widget"
description = "A widget."
bundle_id = "guide"
`,
		);
		const output = join(dir, "index.json");
		const index = projectMetadataDocsIndex([{ rootManifestPath: pathOf(paths, "guide") }], output);
		expect(JSON.parse(readFileSync(join(dir, "references.json"), "utf8"))).toEqual({
			version: 1,
			targets: [],
		});
		const zeta = index.pages[0]?.sections.find((section) => section.id === "zeta");
		expect(zeta?.catalogue_count).toBe(1);
		expect(zeta?.primary_families).toBeUndefined();
		expect(index.family_headings).toMatchObject({
			tag: "Vocabulary",
			"class-feature": "Class features",
			subclass: "Subclasses",
			resource: "Resources",
		});
		expect(index.family_nouns).toMatchObject({
			tag: { singular: "vocabulary entry", plural: "vocabulary entries" },
			"class-feature": { singular: "class feature", plural: "class features" },
			subclass: { singular: "subclass", plural: "subclasses" },
			resource: { singular: "resource", plural: "resources" },
		});
	});

	it("derives spell facts and a cleaned description from an entity's own tags (sk-jay0.3.5.54 step 2)", () => {
		const root = `${manifest("guide", "guide").replace(
			'intro = "Zeta intro"',
			`intro = "Zeta intro"
catalogue_content = { source_path = "catalogue.toml", namespace = "docs", id = "zeta-catalogue" }`,
		)}
[[include]]
path = "catalogue.toml"
`;
		const paths = setup({ guide: root });
		writeFileSync(
			join(dir, "catalogue.toml"),
			`[metadata.docs.zeta-catalogue]
catalogue = [{ kind = "entity_definition", ref = "guide/spell/acid-globe", family = "spell", slug = "acid-globe" }]
[[entity_definitions]]
entity_def_id = "guide/spell/acid-globe"
display_name = "Acid Globe"
description = "A globe of acid. **Damage.** 2d4 acid."
bundle_id = "guide"
[[entity_definition_tag]]
entity_def_id = "guide/spell/acid-globe"
tag = "srd.spell.level.2"
source = "manifest"
bundle_id = "guide"
[[entity_definition_tag]]
entity_def_id = "guide/spell/acid-globe"
tag = "srd.spell.school.evocation"
source = "manifest"
bundle_id = "guide"
[[entity_definition_tag]]
entity_def_id = "guide/spell/acid-globe"
tag = "srd.spell.casting_time.bonus_action"
source = "manifest"
bundle_id = "guide"
[[entity_definition_tag]]
entity_def_id = "guide/spell/acid-globe"
tag = "srd.spell.range.90_feet"
source = "manifest"
bundle_id = "guide"
[[entity_definition_tag]]
entity_def_id = "guide/spell/acid-globe"
tag = "srd.spell.duration.instantaneous"
source = "manifest"
bundle_id = "guide"
`,
		);
		const entry = buildMetadataDocsIndex([{ rootManifestPath: pathOf(paths, "guide") }]).pages[0]
			?.sections[0]?.catalogue?.[0];
		// Every fact is derived from the entity's OWN tag, never copied onto the
		// catalogue row: the casting-time kebab rule and the duration override
		// (raw SRD duration text is case-inconsistent — see sections.toml) both
		// reproduce the exact wording srd-cc's old generator used to author.
		expect(entry).toMatchObject({
			ref: "guide/spell/acid-globe",
			facts: [
				{ label: "Level", value: "Level 2", tag: "srd.spell.level.2" },
				{ label: "School", value: "Evocation", tag: "srd.spell.school.evocation" },
				{
					label: "Casting Time",
					value: "bonus-action",
					tag: "srd.spell.casting_time.bonus_action",
				},
				{ label: "Range", value: "90 feet", tag: "srd.spell.range.90_feet" },
				{ label: "Duration", value: "instantaneous", tag: "srd.spell.duration.instantaneous" },
			],
			// Markup-bearing raw description falls back to a fact summary (same
			// priority order srd-cc's old generator used) rather than leaking
			// "**Damage.**" into served copy.
			description:
				"Level: Level 2 · School: Evocation · Casting Time: bonus-action · Range: 90 feet · Duration: instantaneous",
		});
	});

	it("skips a namespace an entity carries as its own bare self-identity tag instead of throwing", () => {
		// Contrived: no real SRD entity carries a declared fact_namespaces
		// namespace's OWN bare tag alongside a child of that same namespace —
		// `factTagForNamespace`'s own doc comment names the real collision this
		// guards against (a subclass' inherited `srd.class.<parentSlug>` versus
		// a class-feature's own `srd.class.<classSlug>` linkage tag; the
		// subclass "Class" fact stays authored rather than derived for exactly
		// this reason, so no `fact_namespaces` row names `srd.class` today).
		// This test proves the defensive skip directly against a namespace that
		// IS declared (`srd.spell.level`): were the guard absent, the bare
		// `srd.spell.level` tag plus its own `srd.spell.level.2` child would
		// count as two matches and throw "ambiguous".
		const root = `${manifest("guide", "guide").replace(
			'intro = "Zeta intro"',
			`intro = "Zeta intro"
catalogue_content = { source_path = "catalogue.toml", namespace = "docs", id = "zeta-catalogue" }`,
		)}
[[include]]
path = "catalogue.toml"
`;
		const paths = setup({ guide: root });
		writeFileSync(
			join(dir, "catalogue.toml"),
			`[metadata.docs.zeta-catalogue]
catalogue = [{ kind = "entity_definition", ref = "guide/spell/self-identity", family = "spell", slug = "self-identity" }]
[[entity_definitions]]
entity_def_id = "guide/spell/self-identity"
display_name = "Self Identity"
description = "A contrived self-identity fixture."
bundle_id = "guide"
[[entity_definition_tag]]
entity_def_id = "guide/spell/self-identity"
tag = "srd.spell.level"
source = "manifest"
bundle_id = "guide"
[[entity_definition_tag]]
entity_def_id = "guide/spell/self-identity"
tag = "srd.spell.level.2"
source = "manifest"
bundle_id = "guide"
`,
		);
		expect(() =>
			buildMetadataDocsIndex([{ rootManifestPath: pathOf(paths, "guide") }]),
		).not.toThrow();
		const entry = buildMetadataDocsIndex([{ rootManifestPath: pathOf(paths, "guide") }]).pages[0]
			?.sections[0]?.catalogue?.[0];
		expect(entry).toMatchObject({ ref: "guide/spell/self-identity", facts: [] });
	});

	it("projects a foreign-bundle catalogue family with no derived facts instead of throwing", () => {
		// A bundle other than srd can catalogue an entity under family "monster"
		// without carrying any `srd.size.*` / `srd.creature_type.*` / `srd.cr.*`
		// tag (sk-jay0.3.5.57): fact derivation is driven by which declared
		// `fact_namespaces` namespace the entity's own tags match, not by the
		// catalogue family string, so an entity with an unrelated vocabulary
		// simply gets no derived facts rather than failing the whole build.
		const root = `${manifest("guide", "guide").replace(
			'intro = "Zeta intro"',
			`intro = "Zeta intro"
catalogue_content = { source_path = "catalogue.toml", namespace = "docs", id = "zeta-catalogue" }`,
		)}
[[include]]
path = "catalogue.toml"
`;
		const paths = setup({ guide: root });
		writeFileSync(
			join(dir, "catalogue.toml"),
			`[metadata.docs.zeta-catalogue]
catalogue = [{ kind = "entity_definition", ref = "guide/creature/mudling", family = "monster", slug = "mudling" }]
[[entity_definitions]]
entity_def_id = "guide/creature/mudling"
display_name = "Mudling"
description = "A small elemental of animate mud."
bundle_id = "guide"
[[entity_definition_tag]]
entity_def_id = "guide/creature/mudling"
tag = "guide.habitat.swamp"
source = "manifest"
bundle_id = "guide"
`,
		);
		const entry = buildMetadataDocsIndex([{ rootManifestPath: pathOf(paths, "guide") }]).pages[0]
			?.sections[0]?.catalogue?.[0];
		expect(entry).toMatchObject({
			ref: "guide/creature/mudling",
			family: "monster",
			description: "A small elemental of animate mud.",
			facts: [],
		});
	});

	it("links compact subjects to an exact catalogue detail route", () => {
		const source =
			manifest("guide", "guide", [], true)
				.replace(
					'intro = "Zeta intro"',
					`intro = "Zeta intro"
catalogue = [{ kind = "entity_definition", ref = "guide/widget", family = "item", slug = "widget" }]`,
				)
				.replace(
					'body = "Second body"',
					'body = \'::subject{kind="entity_definition" ref="guide/widget" view="compact"}\'',
				) +
			`
[[entity_definitions]]
entity_def_id = "guide/widget"
display_name = "Widget"
description = "A widget."
bundle_id = "guide"
`;
		const article = buildMetadataDocsIndex([
			{ rootManifestPath: pathOf(setup({ guide: source }), "guide") },
		]).pages[0]?.sections[0]?.pages?.[0] as DocsArticle | undefined;
		expect(article?.subjects?.[0]?.href).toBe("/docs/guide/zeta/widget");
	});

	it("projects authored attribution Markdown without allowing directives", () => {
		const source = manifest("guide", "guide").replace(
			'intro = "guide intro"',
			`intro = "guide intro"
source_base = "https://example.test/repo/"
attributions = [{ body = "[Guide source](docs/license.md)", source = { path = "NOTICE.md", anchor = "Credit", license = "CC0" } }]`,
		);
		let paths = setup({ guide: source });
		const attribution = buildMetadataDocsIndex([{ rootManifestPath: pathOf(paths, "guide") }])
			.pages[0]?.attributions?.[0];
		expect(attribution?.blocks).toEqual([
			expect.objectContaining({
				kind: "html",
				html: expect.stringContaining("https://example.test/repo/docs/license.md"),
			}),
		]);

		paths = setup({
			guide: source.replace(
				'body = "[Guide source](docs/license.md)"',
				`body = '::resource{ref="guide/focus" view="compact"}'`,
			),
		});
		expect(() => buildMetadataDocsIndex([{ rootManifestPath: pathOf(paths, "guide") }])).toThrow(
			/cannot contain docs directives/,
		);
	});

	it("projects authored catalogue aliases and virtual documents without converter input", () => {
		const source =
			manifest("guide", "guide")
				.replace(
					'intro = "guide intro"',
					'intro = "guide intro"\nlinks = [{ label = "Useful Widget", kind = "entity_definition", ref = "guide/widget" }]',
				)
				.replace(
					'intro = "Zeta intro"',
					`intro = "Zeta intro"
[[metadata.docs.sections.catalogue]]
kind = "entity_definition"
ref = "guide/widget"
family = "artifact"
slug = "useful_widget"
facts = [{ label = "Tier", value = "Starter" }]
source = { path = "guide.toml", anchor = "guide/widget", license = "CC0" }
[[metadata.docs.sections.documents]]
id = "welcome"
ref = "guide/document/welcome"
slug = "Q1"
family = "pattern"
relations = [{ kind = "entity_definition", ref = "guide/widget" }]
title = "Welcome"
body = "Authored guide for the Useful Widget."
source = { path = "docs/guide.md", anchor = "Welcome", license = "CC0" }`,
				) +
			`
[[entity_definitions]]
entity_def_id = "guide/widget"
display_name = "Useful Widget"
description = "An exact authored definition."
bundle_id = "guide"
`;
		const paths = setup({ guide: source });
		const output = join(dir, "public", "index.json");
		const index = projectMetadataDocsIndex([{ rootManifestPath: pathOf(paths, "guide") }], output);
		expect(JSON.parse(readFileSync(join(dir, "public/references.json"), "utf8"))).toEqual({
			version: 1,
			targets: [
				{
					label: "Useful Widget",
					kind: "entity_definition",
					ref: "guide/widget",
					href: "/docs/guide/zeta/useful_widget",
					previewHref: "/compendium/docs/catalogue/guide/zeta/useful_widget.json",
				},
			],
		});
		const section = index.pages[0]?.sections[0];
		expect(section).toMatchObject({
			catalogue_count: 1,
			catalogue_href: "/compendium/docs/catalogues/guide/zeta.json",
		});
		const catalogue = JSON.parse(
			readFileSync(join(dir, "public/catalogues/guide/zeta.json"), "utf8"),
		);
		expect(catalogue[0]).toMatchObject({
			kind: "entity_definition",
			ref: "guide/widget",
			family: "artifact",
			href: "/docs/guide/zeta/useful_widget",
			display_name: "Useful Widget",
			facts: [{ label: "Tier", value: "Starter" }],
		});
		expect(section?.documents?.[0]).toMatchObject({
			id: "welcome",
			href: "/docs/guide/zeta/Q1",
			family: "pattern",
		});
		expect(catalogue[0]).not.toHaveProperty("record");
		expect(
			JSON.parse(readFileSync(join(dir, "public/catalogue/guide/zeta/useful_widget.json"), "utf8")),
		).toMatchObject({
			record: { entity_def_id: "guide/widget" },
		});
		const document = JSON.parse(
			readFileSync(join(dir, "public/documents/guide/zeta/welcome.json"), "utf8"),
		);
		expect(document).toMatchObject({
			body: "Authored guide for the Useful Widget.",
			blocks: [
				expect.objectContaining({
					html: expect.stringContaining('href="/docs/guide/zeta/useful_widget"'),
				}),
			],
			relations: [
				{
					kind: "entity_definition",
					ref: "guide/widget",
					label: "Useful Widget",
					href: "/docs/guide/zeta/useful_widget",
				},
			],
		});
		expect(JSON.parse(readFileSync(join(dir, "public/search.json"), "utf8"))).toEqual([
			expect.objectContaining({
				ref: "guide/document/welcome",
				href: "/docs/guide/zeta/Q1",
				search_text: expect.stringContaining("authored guide"),
			}),
			expect.objectContaining({ ref: "guide/widget", href: "/docs/guide/zeta/useful_widget" }),
		]);
	});

	it("embeds a trimmed resource projection on an entity_definition's resource_definition relation", () => {
		const source =
			manifest("guide", "guide")
				.replace(
					'intro = "guide intro"',
					'intro = "guide intro"\nlinks = [{ label = "Focus", kind = "resource_definition", ref = "guide/focus" }]',
				)
				.replace(
					'intro = "Zeta intro"',
					`intro = "Zeta intro"
[[metadata.docs.sections.catalogue]]
kind = "entity_definition"
ref = "guide/goblin"
family = "monster"
slug = "goblin"
[[metadata.docs.sections.catalogue]]
kind = "resource_definition"
ref = "guide/focus"
family = "resource"
slug = "focus"`,
				) +
			`
[[entity_definitions]]
entity_def_id = "guide/goblin"
display_name = "Goblin"
description = "A sneaky goblin."
bundle_id = "guide"
[[resource_definitions]]
resource_definition_id = "guide/focus"
display_name = "Focus"
description = "Attention available by default."
value_kind = "int"
initial_value = 2
min_value = 0
max_value = 4
recovery_rule = "persistent"
bundle_id = "guide"
[[entity_definition_initial_state]]
entity_def_id = "guide/goblin"
state_id = "guide/focus"
bundle_id = "guide"
[[metadata_attachments]]
target_kind = "resource_definition"
target_ref = "guide/focus"
namespace = "guide.text"
payload_json = '{"text":"Reference text","source":"source/focus.md","license":"CC-BY-4.0"}'
bundle_id = "guide"
source = "manifest"
`;
		const paths = setup({ guide: source });
		const output = join(dir, "public", "index.json");
		projectMetadataDocsIndex([{ rootManifestPath: pathOf(paths, "guide") }], output);
		const goblin = JSON.parse(
			readFileSync(join(dir, "public/catalogue/guide/zeta/goblin.json"), "utf8"),
		) as DocsCatalogueEntry;
		expect(goblin.relations).toEqual([
			{
				kind: "resource_definition",
				ref: "guide/focus",
				label: "Focus",
				bundle_id: "guide",
				href: "/docs/guide/zeta/focus",
				// The manifest schema defaults an unauthored `value_bool` to `true` on
				// entity_definition_initial_state rows; see the dedicated value_int test below.
				value_bool: true,
				resource: {
					ref: "guide/focus",
					bundle_id: "guide",
					display_name: "Focus",
					description: "Attention available by default.",
					value_kind: "int",
					initial_value: 2,
					min_value: 0,
					max_value: 4,
					recovery_rule: "persistent",
					href: "/docs/guide/zeta/focus",
					tags: [],
					tag_links: [],
					attachments: [],
				},
			},
		]);
	});

	it("carries the creature's own seeded value_int onto a resource_definition relation", () => {
		const source =
			manifest("guide", "guide")
				.replace(
					'intro = "guide intro"',
					'intro = "guide intro"\nlinks = [{ label = "Focus", kind = "resource_definition", ref = "guide/focus" }]',
				)
				.replace(
					'intro = "Zeta intro"',
					`intro = "Zeta intro"
[[metadata.docs.sections.catalogue]]
kind = "entity_definition"
ref = "guide/goblin"
family = "monster"
slug = "goblin"
[[metadata.docs.sections.catalogue]]
kind = "resource_definition"
ref = "guide/focus"
family = "resource"
slug = "focus"`,
				) +
			`
[[entity_definitions]]
entity_def_id = "guide/goblin"
display_name = "Goblin"
description = "A sneaky goblin."
bundle_id = "guide"
[[resource_definitions]]
resource_definition_id = "guide/focus"
display_name = "Focus"
description = "Attention available by default."
value_kind = "int"
initial_value = 2
min_value = 0
max_value = 4
recovery_rule = "persistent"
bundle_id = "guide"
[[entity_definition_initial_state]]
entity_def_id = "guide/goblin"
state_id = "guide/focus"
bundle_id = "guide"
value_int = 17
`;
		const paths = setup({ guide: source });
		const output = join(dir, "public", "index.json");
		projectMetadataDocsIndex([{ rootManifestPath: pathOf(paths, "guide") }], output);
		const goblin = JSON.parse(
			readFileSync(join(dir, "public/catalogue/guide/zeta/goblin.json"), "utf8"),
		) as DocsCatalogueEntry;
		// value_bool is not authored here either, but the manifest schema defaults
		// it to `true`; that default is asserted in the test above, not repeated here.
		expect(goblin.relations?.[0]).toMatchObject({
			kind: "resource_definition",
			ref: "guide/focus",
			value_int: 17,
		});
	});

	it("projects an authored featured reference with its description and art", () => {
		const source =
			manifest("guide", "guide", [], true)
				.replace(
					'title = "Authored second"',
					'title = "Authored second"\nfeatured_reference = { kind = "entity_definition", ref = "guide/widget" }',
				)
				.replace(
					'intro = "Zeta intro"',
					`intro = "Zeta intro"
[[metadata.docs.sections.catalogue]]
kind = "entity_definition"
ref = "guide/widget"
family = "artifact"
slug = "widget"`,
				) +
			`
[[entity_definitions]]
entity_def_id = "guide/widget"
display_name = "Widget"
description = "Exact manifest description."
bundle_id = "guide"
[[metadata_namespaces]]
audience = "public"
bundle_id = "guide"
description = "Public art"
namespace = "guide.art.image"
[[metadata_attachments]]
target_kind = "entity_definition"
target_ref = "guide/widget"
namespace = "guide.art.image"
payload_json = '{"path":"guide-art/widget.webp","hash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","license":"LicenseRef-Test"}'
source = "manifest"
bundle_id = "guide"
`;
		const paths = setup({ guide: source });
		const index = buildMetadataDocsIndex([
			{ rootManifestPath: pathOf(paths, "guide"), assetMounts: { "guide-art": "/assets/guide" } },
		]);
		expect(JSON.stringify(index)).not.toContain("/read/");
		const section = index.pages[0]?.sections[0];
		const article = section?.pages?.[0] as DocsArticle | undefined;
		expect(article?.featured_reference).toEqual({
			kind: "entity_definition",
			ref: "guide/widget",
		});
		expect(article?.subjects).toEqual([
			expect.objectContaining({
				ref: "guide/widget",
				description: "Exact manifest description.",
				attachments: [expect.objectContaining({ asset_href: "/assets/guide/widget.webp" })],
			}),
		]);
		// A featured article carries no href of its own — its route belongs to
		// the catalogue entry it is attached to (sk-jay0.7.93).
		expect(article?.href).toBeUndefined();
		expect((section?.catalogue?.[0] as DocsCatalogueEntry | undefined)?.featured_article).toBe(
			article,
		);
	});

	it("prefers authored catalogue presentation without changing typed records", () => {
		const source =
			manifest("guide", "guide").replace(
				'intro = "Zeta intro"',
				`intro = "Zeta intro"
[[metadata.docs.sections.catalogue]]
kind = "entity_definition"
ref = "guide/widget"
family = "item"
slug = "widget"
title = "Authored widget"
description = "Readable widget summary."
[[metadata.docs.sections.catalogue]]
kind = "resource_definition"
ref = "guide/focus"
family = "resource"
slug = "focus"
title = "Authored focus"
description = "Readable focus summary."
[[metadata.docs.sections.catalogue]]
kind = "place_graph"
ref = "guide/region"
family = "place"
slug = "region"
title = "Authored region"
description = "Readable region summary."`,
			) +
			`
[[entity_definitions]]
entity_def_id = "guide/widget"
display_name = "Raw widget"
description = "Raw widget description."
bundle_id = "guide"
[[resource_definitions]]
resource_definition_id = "guide/focus"
display_name = "Raw focus"
description = "Raw focus description."
value_kind = "int"
initial_value = 1
min_value = 0
max_value = 2
recovery_rule = "persistent"
bundle_id = "guide"
[[place_graphs]]
place_graph_id = "guide/region"
display_name = "Raw region"
description = "Raw region description."
bundle_id = "guide"
substrate_id = "indoor"
anchor_node_id = ""
parent_graph_id = ""
blueprint_id = ""
is_ephemeral_instance = false
bearing = 0.0
metres_per_unit = 1.0
origin_cell_res4 = 0
origin_cell_res7 = 0
origin_cell_res10 = 0
`;
		const paths = setup({ guide: source });
		const output = join(dir, "public", "index.json");
		projectMetadataDocsIndex([{ rootManifestPath: pathOf(paths, "guide") }], output);
		const catalogue = JSON.parse(
			readFileSync(join(dir, "public/catalogues/guide/zeta.json"), "utf8"),
		) as Array<{ artifact_href: string; display_name: string; description: string }>;

		expect(
			catalogue.map(({ display_name, description }) => ({ display_name, description })),
		).toEqual([
			{ display_name: "Authored widget", description: "Readable widget summary." },
			{ display_name: "Authored focus", description: "Readable focus summary." },
			{ display_name: "Authored region", description: "Readable region summary." },
		]);
		for (const [entry, rawName] of catalogue.map(
			(item, index) => [item, ["Raw widget", "Raw focus", "Raw region"][index]] as const,
		)) {
			const artifact = JSON.parse(
				readFileSync(
					join(dir, "public", entry.artifact_href.replace("/compendium/docs/", "")),
					"utf8",
				),
			);
			expect(artifact.record.display_name).toBe(rawName);
		}
	});

	it("keeps contextual search destinations distinct when a subject is catalogued twice", () => {
		const source =
			manifest("guide", "guide")
				.replace(
					'intro = "Zeta intro"',
					`intro = "Zeta intro"
[[metadata.docs.sections.catalogue]]
kind = "entity_definition"
ref = "guide/widget"
family = "item"
slug = "widget"`,
				)
				.replace(
					'intro = "Alpha intro"',
					`intro = "Alpha intro"
[[metadata.docs.sections.catalogue]]
kind = "entity_definition"
ref = "guide/widget"
family = "example"
slug = "widget-example"`,
				) +
			`
[[entity_definitions]]
entity_def_id = "guide/widget"
display_name = "Widget"
description = "A widget."
bundle_id = "guide"
`;
		const paths = setup({ guide: source });
		const search = buildDocsSearchIndex(
			buildMetadataDocsIndex([{ rootManifestPath: pathOf(paths, "guide") }]),
		);
		expect(search.map(({ ref, href }) => ({ ref, href }))).toEqual([
			{ ref: "guide/widget", href: "/docs/guide/alpha/widget-example" },
			{ ref: "guide/widget", href: "/docs/guide/zeta/widget" },
		]);
		expect(new Set(search.map((entry) => entry.id)).size).toBe(2);
	});

	it("projects arbitrary definition and seeded-instance subjects with owned facets", () => {
		const source =
			manifest("guide", "guide", [], true).replace(
				'body = "Second body"',
				`body = '''::subject{kind="entity_definition" ref="other/item+kit" view="compact"}

::subject{kind="entity" ref="other/mira" view="full"}'''`,
			) +
			`
[[entity_definitions]]
entity_def_id = "other/item+kit"
display_name = "Field Kit"
description = "An authored kit."
bundle_id = "guide"
[[entity_definition_equip_modifier]]
entity_def_id = "other/item+kit"
modifier_template_id = "other/item+kit/bonus"
bundle_id = "guide"
[[modifier_templates]]
modifier_template_id = "other/item+kit/bonus"
display_name = "Kit bonus"
description = "An authored effect."
applies_to = "other/focus"
modifier_expression_source = "let bonus = 1; bonus"
predicate_source = ""
bundle_id = "guide"
[[entities]]
entity_key = "other/mira"
entity_def_id = "other/commoner"
name = "Mira"
description = "A seeded person."
kind = "npc"
owned_by_entity_key = ""
place_node_id = "other/inn"
quantity = 1
bundle_id = "guide"
[[actor_spatial_locations]]
entity_key = "other/mira"
place_node_id = "other/inn"
selection_path = "manifest:other/mira"
bundle_id = "guide"
[[object_state]]
entity_key = "other/mira"
state_id = "dialog/open"
value_bool = true
value_int = 9
expires_at_tick = 0
source_template_id = "manifest"
bundle_id = "guide"
[[metadata_namespaces]]
audience = "public"
bundle_id = "guide"
description = "Public art"
namespace = "guide.art.image"
[[metadata_attachments]]
bundle_id = "guide"
namespace = "guide.art.image"
payload_json = '{"path":"guide-art/people/mira.webp","hash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","license":"CC0"}'
source = "manifest"
target_kind = "entity"
target_ref = "other/mira"
[[metadata_attachments]]
bundle_id = "guide"
namespace = "guide.note"
payload_json = '{"path":"source/notes.md","note":"not art"}'
source = "manifest"
target_kind = "entity"
target_ref = "other/mira"
`;
		const paths = setup({ guide: source });
		const article = buildMetadataDocsIndex([
			{ rootManifestPath: pathOf(paths, "guide"), assetMounts: { "guide-art": "/assets/guide" } },
		]).pages[0]?.sections[0]?.pages?.[0] as DocsArticle | undefined;
		expect(article?.subjects?.[0]).toMatchObject({
			kind: "entity_definition",
			ref: "other/item+kit",
			href: "/docs/guide/zeta/subject/entity_definition/other%2Fitem%2Bkit",
		});
		expect(article?.subjects?.[0]?.facets.map((facet) => facet.label)).toEqual([
			"Equipment modifier links",
			"Modifier definitions",
			"Definition record",
		]);
		expect(article?.subjects?.[1]).toMatchObject({
			kind: "entity",
			ref: "other/mira",
			definition_ref: "other/commoner",
		});
		expect(article?.subjects?.[1]?.facets.map((facet) => facet.label)).toEqual([
			"Placement",
			"Initial state",
			"Instance record",
		]);
		expect(article?.subjects?.[1]?.facets[1]?.rows[0]).toMatchObject({
			value_bool: true,
			value_int: 9,
		});
		expect(article?.subjects?.[1]?.attachments.map((item) => item.asset_href)).toEqual([
			"/assets/guide/people/mira.webp",
			undefined,
		]);

		const unsafePaths = setup({
			guide: source.replace("guide-art/people/mira.webp", "guide-art/../mira.webp"),
		});
		expect(() =>
			buildMetadataDocsIndex([
				{
					rootManifestPath: pathOf(unsafePaths, "guide"),
					assetMounts: { "guide-art": "/assets/guide" },
				},
			]),
		).toThrow(/unsafe image path/);
	});

	it("renders a facet for every owner-surfaced kind belonging to entities or entity_definitions (sk-jay0.3.5.78)", () => {
		// `projectSubject`'s owned facets are derived from row-kind-coverage.toml
		// through `ownedFacets`, not restated as a hand-written list beside it.
		// This authors ONE row of every kind classified `owner = "entities"` /
		// `owner = "entity_definitions"` — including `actor_identities` and
		// `entity_definition_initial_condition`, which have zero authored rows in
		// any registered manifest today — so a kind that stops rendering on its
		// carrier's page (or a new owner-surfaced kind nobody wired up) fails here
		// instead of silently reaching neither the page nor the overflow basin.
		const expectedDefinitionKinds = rowKindCoverage()
			.filter(
				(row) =>
					row.surface === "owner" &&
					ownerCandidates(row).some((candidate) => candidate.owner === "entity_definitions"),
			)
			.map((row) => row.kind);
		const expectedEntityKinds = rowKindCoverage()
			.filter(
				(row) =>
					row.surface === "owner" &&
					ownerCandidates(row).some((candidate) => candidate.owner === "entities"),
			)
			.map((row) => row.kind);
		expect(expectedDefinitionKinds).toEqual(
			expect.arrayContaining([
				"entity_definition_initial_state",
				"entity_definition_initial_capability",
				"entity_definition_initial_equipment",
				"entity_definition_initial_containment",
				"entity_definition_item_dsl_source",
				"entity_definition_equip_modifier",
				"entity_definition_initial_condition",
				"entity_definition_containment_policy",
			]),
		);
		expect(expectedEntityKinds).toEqual(
			expect.arrayContaining([
				"actors",
				"actor_identities",
				"actor_spatial_locations",
				"actor_capabilities",
				"object_state",
				"entity_containment_policy",
			]),
		);

		const source =
			manifest("guide", "guide", [], true).replace(
				'body = "Second body"',
				`body = '''::subject{kind="entity_definition" ref="other/full" view="full"}

::subject{kind="entity" ref="other/full" view="full"}'''`,
			) +
			`
[[entity_definitions]]
entity_def_id = "other/full"
display_name = "Full Definition"
description = "Authored to carry one row of every owner-surfaced kind."
bundle_id = "guide"
[[containment_policy_definition]]
policy_id = "guide/containment"
exposure_predicate_source = "true == true"
access_predicate_source = "true == true"
bundle_id = "guide"
[[entity_definition_containment_policy]]
entity_def_id = "other/full"
policy_id = "guide/containment"
bundle_id = "guide"
[[entity_definition_initial_state]]
entity_def_id = "other/full"
state_id = "guide/state"
bundle_id = "guide"
[[entity_definition_initial_capability]]
entity_def_id = "other/full"
capability_id = "guide/capability"
bundle_id = "guide"
[[entity_definition_initial_equipment]]
entity_def_id = "other/full"
equipped_entity_def_id = "other/full"
slot_id = "guide/slot"
bundle_id = "guide"
[[entity_definition_initial_containment]]
entity_def_id = "other/full"
contained_entity_def_id = "other/full"
quantity = 1
bundle_id = "guide"
[[entity_definition_item_dsl_source]]
entity_def_id = "other/full"
slot = "guide/slot-dsl"
source = "1"
bundle_id = "guide"
[[entity_definition_equip_modifier]]
entity_def_id = "other/full"
modifier_template_id = "other/full/bonus"
bundle_id = "guide"
[[modifier_templates]]
modifier_template_id = "other/full/bonus"
display_name = "Full bonus"
description = "An authored effect."
applies_to = "other/focus"
modifier_expression_source = "let bonus = 1; bonus"
predicate_source = ""
bundle_id = "guide"
[[entity_definition_initial_condition]]
entity_def_id = "other/full"
condition_definition_id = "guide/condition"
bundle_id = "guide"
[[entities]]
entity_key = "other/full"
entity_def_id = "other/full"
name = "Full Entity"
description = "Authored to carry one row of every owner-surfaced kind."
kind = "npc"
owned_by_entity_key = ""
place_node_id = ""
quantity = 1
bundle_id = "guide"
[[entity_containment_policy]]
entity_key = "other/full"
policy_id = "guide/containment"
bundle_id = "guide"
[[actors]]
entity_key = "other/full"
name = "Full Entity"
bundle_id = "guide"
[[actor_identities]]
entity_key = "other/full"
identity = "guide/identity"
role = "guide/role"
bundle_id = "guide"
[[actor_spatial_locations]]
entity_key = "other/full"
place_node_id = "other/inn"
selection_path = "manifest:other/full"
bundle_id = "guide"
[[actor_capabilities]]
actor_entity_key = "other/full"
capability_id = "guide/capability"
source = "manifest"
bundle_id = "guide"
[[object_state]]
entity_key = "other/full"
state_id = "guide/state"
value_bool = true
value_int = 1
expires_at_tick = 0
source_template_id = "manifest"
bundle_id = "guide"
`;
		const paths = setup({ guide: source });
		const article = buildMetadataDocsIndex([{ rootManifestPath: pathOf(paths, "guide") }]).pages[0]
			?.sections[0]?.pages?.[0] as DocsArticle | undefined;
		const definitionTables = new Set(
			article?.subjects?.[0]?.facets.map((facet) => facet.table) ?? [],
		);
		const entityTables = new Set(article?.subjects?.[1]?.facets.map((facet) => facet.table) ?? []);
		for (const kind of expectedDefinitionKinds)
			expect(definitionTables.has(kind), `entity_definition facet for '${kind}'`).toBe(true);
		for (const kind of expectedEntityKinds)
			expect(entityTables.has(kind), `entity facet for '${kind}'`).toBe(true);
		for (const [index, kind] of [
			"entity_definition_containment_policy",
			"entity_containment_policy",
		].entries()) {
			expect(
				article?.subjects?.[index]?.facets.find((facet) => facet.table === kind)?.rows,
			).toEqual([{ policy_id: "guide/containment" }]);
		}
	});

	it("exposes an equipment relation on both the actor and the equipped item", () => {
		const source =
			manifest("guide", "guide", [], true).replace(
				'body = "Second body"',
				`body = '''::subject{kind="entity" ref="guide/actor" view="full"}

::subject{kind="entity" ref="guide/sword" view="full"}'''`,
			) +
			`
[[entities]]
entity_key = "guide/actor"
name = "Actor"
description = "Wears the authored sword."
kind = "npc"
place_node_id = ""
owned_by_entity_key = ""
quantity = 1
bundle_id = "guide"
[[entities]]
entity_key = "guide/sword"
name = "Sword"
description = "Equipped by the actor."
kind = "item"
place_node_id = ""
owned_by_entity_key = ""
quantity = 1
bundle_id = "guide"
[[actor_equipment_slots]]
actor_entity_key = "guide/actor"
slot_id = "guide/main-hand"
item_key = "guide/sword"
`;
		const paths = setup({ guide: source });
		const article = buildMetadataDocsIndex([{ rootManifestPath: pathOf(paths, "guide") }]).pages[0]
			?.sections[0]?.pages?.[0] as DocsArticle | undefined;
		for (const [index, label] of [
			[0, "Equipment"],
			[1, "Equipped by"],
		] as const) {
			expect(article?.subjects?.[index]?.facets.find((facet) => facet.label === label)).toEqual({
				label,
				table: "actor_equipment_slots",
				rows: [
					{ actor_entity_key: "guide/actor", slot_id: "guide/main-hand", item_key: "guide/sword" },
				],
			});
		}
	});

	it("resolves an arbitrary bundle's fragment content and resources without a converter", () => {
		const paths = setup({
			guide: withContentRef(),
		});
		writeFileSync(join(dir, "content.toml"), contentFragment());
		const index = buildMetadataDocsIndex([{ rootManifestPath: pathOf(paths, "guide") }]);
		const article = index.pages[0]?.sections[0]?.pages?.[0] as DocsArticle | undefined;
		expect(article).toMatchObject({
			id: "focus",
			body: expect.stringContaining("::resource"),
			source: { path: "source/rules.md", anchor: "Focus", license: "CC-BY-4.0" },
			resources: [
				{
					ref: "guide/focus",
					href: "/docs/guide/zeta/resource/guide%2Ffocus",
					display_name: "Focus",
					initial_value: 2,
					tags: ["guide.attention"],
					attachments: [
						{
							bundle_id: "guide",
							namespace: "guide.text",
							payload: expect.objectContaining({ text: "Reference text" }),
						},
					],
				},
			],
		});
		expect(JSON.stringify(index)).not.toContain(dir);
		expect(article?.blocks).toContainEqual({
			kind: "resource-table",
			refs: ["guide/focus"],
			nameLabel: "Focus",
			descriptionLabel: "What it measures",
		});
	});

	it("reuses one resource route across multiple articles and rejects unsafe numeric projection", () => {
		const root = withContentRef()
			.replace(
				'[[metadata.docs.sections]]\nid = "alpha"',
				`[[metadata.docs.sections.pages]]
id = "focus-again"
title = "Focus Again"
content = { source_path = "content.toml", namespace = "docs", id = "focus-again" }
[[metadata.docs.sections]]
id = "alpha"`,
			)
			.replace(
				'intro = "Alpha intro"',
				`intro = "Alpha intro"
[[metadata.docs.sections.pages]]
id = "focus-there-too"
title = "Focus There Too"
content = { source_path = "content.toml", namespace = "docs", id = "focus-again" }`,
			);
		let paths = setup({ guide: root });
		writeFileSync(
			join(dir, "content.toml"),
			contentFragment().replace(
				"[[resource_definitions]]",
				`[metadata.docs.focus-again]
body = '::resource{ref="guide/focus" view="compact"}'
source = { path = "source/rules.md", anchor = "Focus Again", license = "CC-BY-4.0" }

[[resource_definitions]]`,
			),
		);
		const index = buildMetadataDocsIndex([{ rootManifestPath: pathOf(paths, "guide") }]);
		expect(
			index.pages[0]?.sections[0]?.pages?.map((page) => (page as DocsArticle).resources?.[0]?.href),
		).toEqual([
			"/docs/guide/zeta/resource/guide%2Ffocus",
			"/docs/guide/zeta/resource/guide%2Ffocus",
		]);
		expect(
			(index.pages[0]?.sections[1]?.pages?.[0] as DocsArticle | undefined)?.resources?.[0]?.href,
		).toBe("/docs/guide/alpha/resource/guide%2Ffocus");

		paths = setup({ guide: withContentRef() });
		writeFileSync(join(dir, "content.toml"), contentFragment(undefined, "9007199254740992"));
		expect(() => buildMetadataDocsIndex([{ rootManifestPath: pathOf(paths, "guide") }])).toThrow(
			/not a safe integer/,
		);
	});

	it("rejects unresolved content sources, directives, and resource definitions before writing", () => {
		let paths = setup({ guide: withContentRef("missing.toml") });
		writeFileSync(
			join(dir, "content.toml"),
			"[metadata.docs.focus]\nbody = 'Text'\nsource = { path = 'x', anchor = 'x', license = 'CC0' }\n",
		);
		expect(() => buildMetadataDocsIndex([{ rootManifestPath: pathOf(paths, "guide") }])).toThrow(
			/matches 0 included fragments/,
		);

		paths = setup({ guide: withContentRef() });
		writeFileSync(
			join(dir, "content.toml"),
			"[metadata.docs.focus]\nbody = '::unknown{name=\"x\"}'\nsource = { path = 'x', anchor = 'x', license = 'CC0' }\n",
		);
		expect(() => buildMetadataDocsIndex([{ rootManifestPath: pathOf(paths, "guide") }])).toThrow(
			/unsupported documentation directive/,
		);

		paths = setup({ guide: withContentRef() });
		writeFileSync(
			join(dir, "content.toml"),
			"[metadata.docs.focus]\nbody = ''':::resources{view=\"table\" nameLabel=\"Resource\" descriptionLabel=\"Meaning\"}\n::resource{ref=\"guide/missing\"}\n:::'''\nsource = { path = 'x', anchor = 'x', license = 'CC0' }\n",
		);
		expect(() => buildMetadataDocsIndex([{ rootManifestPath: pathOf(paths, "guide") }])).toThrow(
			/resolves to 0 resource definitions/,
		);
	});

	it("projects generic pages without a converter index and supports the SRD mount", () => {
		const paths = setup({
			guide: manifest("guide", "guide", [], true),
			srd: manifest("srd", "srd"),
		});
		const index = buildMetadataDocsIndex([
			{ rootManifestPath: pathOf(paths, "guide") },
			{ rootManifestPath: pathOf(paths, "srd"), mount: "/docs/srd" },
		]);
		expect(index).toMatchObject({ version: 1 });
		expect(index.pages.find((page) => page.page_id === "guide")?.sections).toEqual([
			{
				id: "zeta",
				title: "Zeta authored first",
				intro: "Zeta intro",
				href: "/docs/guide/zeta",
				pages: [
					{
						id: "second",
						title: "Authored second",
						artifact_href: "/compendium/docs/articles/guide/zeta/second.json",
						body: "Second body",
						blocks: [{ kind: "html", html: "<p>Second body</p>" }],
						href: "/docs/guide/zeta/second",
						source: { path: "guide.md", anchor: "Second", license: "CC-BY-4.0" },
						resources: [],
					},
					{
						id: "first",
						title: "Authored first",
						artifact_href: "/compendium/docs/articles/guide/zeta/first.json",
						body: "First body",
						blocks: [{ kind: "html", html: "<p>First body</p>" }],
						href: "/docs/guide/zeta/first",
						source: { path: "guide.md", anchor: "First", license: "CC-BY-4.0" },
						resources: [],
					},
				],
			},
			{
				id: "alpha",
				title: "Alpha authored second",
				intro: "Alpha intro",
				href: "/docs/guide/alpha",
				pages: [],
			},
		]);
		expect(index.pages.find((page) => page.page_id === "srd")?.sections[0]?.href).toBe(
			"/docs/srd/zeta",
		);
		expect(
			index.pages.find((page) => page.page_id === "srd")?.sections[0]?.pages?.[0],
		).toBeUndefined();
	});

	it("rejects unsafe or duplicate article ids before producing routes", () => {
		let paths = setup({
			guide: manifest("guide", "guide", [], true).replace('id = "second"', 'id = "../second"'),
		});
		expect(() => buildMetadataDocsIndex([{ rootManifestPath: pathOf(paths, "guide") }])).toThrow(
			/safe route id|pattern/,
		);
		paths = setup({
			guide: manifest("guide", "guide", [], true).replace('id = "first"', 'id = "second"'),
		});
		expect(() => buildMetadataDocsIndex([{ rootManifestPath: pathOf(paths, "guide") }])).toThrow(
			/duplicate page id/,
		);
		paths = setup({
			guide:
				manifest("guide", "guide", [], true).replace(
					'intro = "Zeta intro"',
					`intro = "Zeta intro"
[[metadata.docs.sections.catalogue]]
kind = "entity_definition"
ref = "guide/widget"
family = "item"
slug = "second"`,
				) +
				`
[[entity_definitions]]
entity_def_id = "guide/widget"
display_name = "Widget"
description = "Widget"
bundle_id = "guide"
`,
		});
		expect(() => buildMetadataDocsIndex([{ rootManifestPath: pathOf(paths, "guide") }])).toThrow(
			/route slug 'second' collides/,
		);
	});

	it("deduplicates a dependency page reached through multiple roots", () => {
		const paths = setup({
			shared: manifest("shared", "shared"),
			one: manifest("one", "one", ["shared"]),
			two: manifest("two", "two", ["shared"]),
		});
		const roots = ["one", "two"].map((name) => ({
			rootManifestPath: pathOf(paths, name),
			dependencyPaths: { shared: pathOf(paths, "shared") },
		}));
		const registered = [
			...roots,
			{ rootManifestPath: pathOf(paths, "shared"), mount: "/docs/srd" },
		];
		const index = buildMetadataDocsIndex(registered);
		expect(index.pages.map((page) => page.page_id)).toEqual(["one", "shared", "two"]);
		expect(index.pages.find((page) => page.page_id === "shared")?.href).toBe("/docs/srd");
		expect(buildMetadataDocsIndex([...registered].reverse())).toEqual(index);
	});

	it("rejects contradictory ids, traversal-shaped ids, and mount collisions", () => {
		let paths = setup({ a: manifest("a", "same"), b: manifest("b", "same") });
		expect(() =>
			buildMetadataDocsIndex([
				{ rootManifestPath: pathOf(paths, "a") },
				{ rootManifestPath: pathOf(paths, "b") },
			]),
		).toThrow(/multiple manifest sources/);
		paths = setup({ unsafe: manifest("unsafe", "../unsafe") });
		expect(() => buildMetadataDocsIndex([{ rootManifestPath: pathOf(paths, "unsafe") }])).toThrow(
			/safe route id/,
		);
		paths = setup({ a: manifest("a", "a"), b: manifest("b", "b") });
		expect(() =>
			buildMetadataDocsIndex([
				{ rootManifestPath: pathOf(paths, "a"), mount: "/docs/srd" },
				{ rootManifestPath: pathOf(paths, "b"), mount: "/docs/srd" },
			]),
		).toThrow(/collides/);
		expect(() =>
			buildMetadataDocsIndex([{ rootManifestPath: pathOf(paths, "a"), mount: "/docs" }]),
		).toThrow(/normalized child of '\/docs'/);
	});

	it("requires root docs and validates before atomically replacing output", () => {
		const paths = setup({ missing: manifest("missing") });
		const output = join(dir, "index.json");
		writeFileSync(output, "sentinel");
		expect(() =>
			projectMetadataDocsIndex([{ rootManifestPath: pathOf(paths, "missing") }], output),
		).toThrow(/does not declare required metadata.docs/);
		expect(readFileSync(output, "utf8")).toBe("sentinel");
	});

	it("writes deterministic compact navigation and lazy article artifacts", () => {
		const paths = setup({ guide: manifest("guide", "guide", [], true) });
		const output = join(dir, "nested", "index.json");
		projectMetadataDocsIndex([{ rootManifestPath: pathOf(paths, "guide") }], output);
		const first = readFileSync(output, "utf8");
		const published = JSON.parse(first);
		const summary = published.pages[0].sections[0].pages[0];
		expect(summary).not.toHaveProperty("body");
		expect(summary).not.toHaveProperty("blocks");
		expect(summary.artifact_href).toBe("/compendium/docs/articles/guide/zeta/second.json");
		const article = JSON.parse(
			readFileSync(join(dir, "nested", "articles/guide/zeta/second.json"), "utf8"),
		);
		expect(article).toMatchObject({ id: "second", body: "Second body" });
		projectMetadataDocsIndex([{ rootManifestPath: pathOf(paths, "guide") }], output);
		expect(readFileSync(output, "utf8")).toBe(first);
	});
});

describe("tag reverse index — members (sk-jay0.3.5.67)", () => {
	// The monster lives in "zeta"; both tag pages live in "alpha" — a
	// different section — which is the whole point: a tag's members
	// routinely come from OTHER sections, never just its own.
	function fixtureRoot(): string {
		return `${manifest("guide", "guide")
			.replace(
				'intro = "Zeta intro"',
				`intro = "Zeta intro"
[[metadata.docs.sections.catalogue]]
kind = "entity_definition"
ref = "guide/creature/ooze"
family = "monster"
slug = "ooze"`,
			)
			.replace(
				'intro = "Alpha intro"',
				`intro = "Alpha intro"
[[metadata.docs.sections.catalogue]]
kind = "tag_value_definition"
ref = "guide.creature-type.ooze"
family = "tag"
slug = "ooze"
title = "Ooze"
[[metadata.docs.sections.catalogue]]
kind = "tag_value_definition"
ref = "guide.creature-type.plant"
family = "tag"
slug = "plant"
title = "Plant"`,
			)}
[[entity_definitions]]
entity_def_id = "guide/creature/ooze"
display_name = "Ooze"
description = "A shapeless blob."
bundle_id = "guide"
[[entity_definition_tag]]
entity_def_id = "guide/creature/ooze"
tag = "guide.creature-type.ooze"
source = "manifest"
bundle_id = "guide"
[[tag_value_definitions]]
tag = "guide.creature-type.ooze"
prefix = "guide.creature-type"
description = "Amorphous creatures."
bundle_id = "guide"
[[tag_value_definitions]]
tag = "guide.creature-type.plant"
prefix = "guide.creature-type"
description = "Plant creatures."
bundle_id = "guide"
`;
	}

	const expectedMember = {
		// Names the junction the membership came from, so a member with no page of
		// its own is still attributable to the row that authored the edge.
		kind: "entity_definition",
		ref: "guide/creature/ooze",
		family: "monster",
		display_name: "Ooze",
		description: "A shapeless blob.",
		href: "/docs/guide/zeta/ooze",
	};

	it("attaches a minimal member row to a tag carried by an entry in a different section, and nothing to an uncarried tag", () => {
		const paths = setup({ guide: fixtureRoot() });
		const index = buildMetadataDocsIndex([{ rootManifestPath: pathOf(paths, "guide") }]);
		const alpha = index.pages[0]?.sections[1];
		expect(alpha?.id).toBe("alpha");
		const catalogue = (alpha?.catalogue ?? []) as DocsCatalogueEntry[];
		const ooze = catalogue.find((entry) => entry.ref === "guide.creature-type.ooze");
		const plant = catalogue.find((entry) => entry.ref === "guide.creature-type.plant");
		// Exact equality, not `toMatchObject` — proves the row carries ONLY
		// ref/family/display_name/description/href, none of the heavier
		// fields (facts/art/tags/record/...) a full catalogue entry has.
		expect(ooze?.members).toEqual([expectedMember]);
		expect(plant?.members).toBeUndefined();
	});

	it("writes members onto the tag's own full per-entry artifact but strips it from the compact section catalogue", () => {
		const paths = setup({ guide: fixtureRoot() });
		const output = join(dir, "public", "index.json");
		projectMetadataDocsIndex([{ rootManifestPath: pathOf(paths, "guide") }], output);
		const catalogue = JSON.parse(
			readFileSync(join(dir, "public/catalogues/guide/alpha.json"), "utf8"),
		) as Record<string, unknown>[];
		expect(catalogue.length).toBe(2);
		for (const entry of catalogue) expect(entry).not.toHaveProperty("members");
		const oozeArtifact = JSON.parse(
			readFileSync(join(dir, "public/catalogue/guide/alpha/ooze.json"), "utf8"),
		);
		expect(oozeArtifact.members).toEqual([expectedMember]);
		const plantArtifact = JSON.parse(
			readFileSync(join(dir, "public/catalogue/guide/alpha/plant.json"), "utf8"),
		);
		expect(plantArtifact).not.toHaveProperty("members");
	});
});

describe("tag reverse index — whole-corpus correctness (sk-jay0.3.5.67)", () => {
	// Exhaustive, not sampled: the real registry projects in well under the
	// suite's other real-corpus tests (docs-census, docs-coverage-validator),
	// so checking every tag page instead of a sample costs nothing extra.
	it("computes every tag's members as exactly the subjects carrying it, pages and hosted alike, across the whole real corpus", async () => {
		const { index, outputRoot } = realDocsProjection();
		const registry = (await import(
			pathToFileURL(resolve(import.meta.dirname, "../../scripts/metadata-docs-registry.mts")).href
		)) as { DOCS_PROJECTION_ROOTS: readonly DocsProjectionRoot[] };
		// Expected reverse index, built independently from the SAME source the
		// production code reads (every entry's own compact `tags`) but by a
		// completely separate pass, over every section's catalogue listing —
		// never just the tags section.
		const expectedByTag = new Map<string, Set<string>>();
		let catalogueEntryCount = 0;
		for (const page of index.pages) {
			for (const section of page.sections) {
				if (!section.catalogue_href) continue;
				const catalogue = JSON.parse(
					readFileSync(
						join(
							outputRoot,
							"catalogues",
							encodeURIComponent(page.page_id),
							`${encodeURIComponent(section.id)}.json`,
						),
						"utf8",
					),
				) as { ref: string; tags?: string[] }[];
				catalogueEntryCount += catalogue.length;
				for (const entry of catalogue) {
					for (const tagId of entry.tags ?? []) {
						const set = expectedByTag.get(tagId) ?? new Set<string>();
						set.add(entry.ref);
						expectedByTag.set(tagId, set);
					}
				}
			}
		}
		expect(catalogueEntryCount).toBeGreaterThan(0);
		// A tag's members are no longer only the entries with pages. A definition
		// the owner placed on someone else's page (a monster's bite) carries tags
		// too, and the owner's call is that it appears on every one of them —
		// otherwise the allosaurus bite reads as a weapon on the creature's page
		// while `srd.weapon`'s own page has never heard of it (sk-jay0.3.5.72).
		// Collected the same independent way: from the emitted artifacts, never
		// from the projection's own bookkeeping.
		const hostedTags = new Map<string, Set<string>>();
		for (const page of index.pages)
			for (const section of page.sections)
				for (const slug of section.catalogue_slugs ?? []) {
					const artifact = JSON.parse(
						readFileSync(
							join(
								outputRoot,
								"catalogue",
								encodeURIComponent(page.page_id),
								encodeURIComponent(section.id),
								`${encodeURIComponent(slug)}.json`,
							),
							"utf8",
						),
					) as DocsCatalogueEntry;
					for (const facet of artifact.facets ?? []) {
						if (facet.table !== "entity_definitions") continue;
						for (const row of facet.rows)
							if (typeof row.entity_def_id === "string")
								hostedTags.set(row.entity_def_id, new Set());
					}
				}
		// Across EVERY registered root, not just the SRD: an adventure bundle
		// hosts its own definitions on its own pages.
		for (const tables of buildTechnicalDocsProjection(
			registry.DOCS_PROJECTION_ROOTS,
		).tables.values())
			for (const row of tables.get("entity_definition_tag") ?? []) {
				const id = row.entity_def_id;
				const tagId = row.tag;
				if (typeof id !== "string" || typeof tagId !== "string" || !hostedTags.has(id)) continue;
				const set = expectedByTag.get(tagId) ?? new Set<string>();
				set.add(id);
				expectedByTag.set(tagId, set);
			}
		let tagPagesChecked = 0;
		for (const page of index.pages) {
			for (const section of page.sections) {
				for (const slug of section.catalogue_slugs ?? []) {
					const artifact = JSON.parse(
						readFileSync(
							join(
								outputRoot,
								"catalogue",
								encodeURIComponent(page.page_id),
								encodeURIComponent(section.id),
								`${encodeURIComponent(slug)}.json`,
							),
							"utf8",
						),
					) as DocsCatalogueEntry;
					if (artifact.kind !== "tag_value_definition") continue;
					tagPagesChecked += 1;
					const expected = expectedByTag.get(artifact.ref) ?? new Set<string>();
					const actual = new Set((artifact.members ?? []).map((member) => member.ref));
					expect([...actual].sort()).toEqual([...expected].sort());
				}
			}
		}
		// sk-jay0.3.5.66: 575 of 581 SRD tags have a catalogue page today.
		expect(tagPagesChecked).toBeGreaterThan(500);
	}, 180_000);
});

describe("technical projection retains complete manifest metadata envelopes", () => {
	it("publishes arbitrary root and included-fragment metadata instead of only row arrays", () => {
		const root = mkdtempSync(join(tmpdir(), "spellkave-metadata-envelope-"));
		try {
			mkdirSync(join(root, "base"));
			writeFileSync(
				join(root, "manifest.toml"),
				`#:schema https://spellkave.dev/schema/world-manifest-1.0.0.json
schema_version = "1.0.0"
[metadata]
profile = "root-profile"
[metadata.docs]
version = 1
page_id = "envelope-proof"
title = "Envelope proof"
nav_group = "reference"
intro = "Technical metadata completeness fixture."
[[metadata.docs.sections]]
id = "proof"
title = "Proof"
intro = "Metadata envelopes."
[[include]]
path = "base/fragment.toml"
[[bundles]]
bundle_id = "envelope-proof"
display_name = "Envelope proof"
author = "test"
version = "1.0.0"
depends_on = []
description = "Metadata completeness fixture."
`,
			);
			writeFileSync(
				join(root, "base/fragment.toml"),
				`[metadata]
profile = "included-profile"
editor = { mode = "proof" }
`,
			);
			const projection = buildTechnicalDocsProjection([
				{ rootManifestPath: join(root, "manifest.toml") },
			]);
			const source = projection.sources[0]!;
			const envelopes = projection.tables.get(source.source_id)?.get("manifest_metadata");
			expect(envelopes, "technical projection drops root/include metadata envelopes").toEqual([
				expect.objectContaining({
					scope: "root",
					metadata: expect.objectContaining({ profile: "root-profile" }),
				}),
				{
					scope: "include",
					path: "base/fragment.toml",
					metadata: { profile: "included-profile", editor: { mode: "proof" } },
				},
			]);
			const runtimeRows = [...(projection.tables.get(source.source_id)?.entries() ?? [])]
				.filter(([table]) => table !== "manifest_metadata")
				.reduce((sum, [, rows]) => sum + rows.length, 0);
			expect(source.row_count, "metadata envelopes are not runtime rows").toBe(runtimeRows);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
});

describe("article prose cross-links — whole corpus (sk-jay0.3.5.89)", () => {
	/**
	 * A chapter's prose links the rules terms it names to the page that defines
	 * them. Two things must hold across the whole corpus, and neither is visible
	 * from a single article: that the vocabulary is the rules vocabulary, and
	 * that nothing else crept in.
	 *
	 * The failure this guards against is not a crash — it is a plausible-looking
	 * wrong link. Pointing the manifest's 1880 entity display names at rules
	 * prose sends "a symbol engraved on a wall" to the spell Symbol and "talking
	 * to a noble" to the Noble stat block, and the page still renders.
	 */
	it("links only to the sections that opted in, and to the six abilities", async () => {
		const { index, outputRoot } = realDocsProjection();

		const abilityHrefs = new Set(
			["str", "dex", "con", "int", "wis", "cha"].map(
				(slug) => `/docs/srd/playing-the-game/${slug}`,
			),
		);
		const allowedPrefixes = ["/docs/srd/rules-glossary/", "/docs/srd/playing-the-game/"];
		const offenders: string[] = [];
		const byText = new Map<string, Set<string>>();
		let linkCount = 0;

		for (const page of index.pages)
			for (const section of page.sections)
				for (const summary of section.pages ?? []) {
					const article = JSON.parse(
						readFileSync(
							join(outputRoot, summary.artifact_href.replace("/compendium/docs/", "")),
							"utf8",
						),
					) as DocsArticle;
					const html = (article.blocks ?? [])
						.map((block) => (block.kind === "html" ? block.html : ""))
						.join("");
					for (const match of html.matchAll(/<a[^>]*href="(\/docs\/[^"]+)"[^>]*>(.*?)<\/a>/g)) {
						const [, href = "", label = ""] = match;
						linkCount += 1;
						const text = label.replace(/<[^>]+>/g, "");
						const seen = byText.get(text) ?? new Set<string>();
						seen.add(href);
						byText.set(text, seen);
						if (abilityHrefs.has(href)) continue;
						if (allowedPrefixes.some((prefix) => href.startsWith(prefix))) continue;
						offenders.push(`${article.id}: '${text}' -> ${href}`);
					}
				}

		expect(offenders).toEqual([]);
		expect(linkCount).toBeGreaterThan(1000);
		// One term never resolves two ways: the target list rejects labels
		// that differ only in case, so every spelling of a term lands on the
		// same page.
		for (const [text, hrefs] of byText)
			expect(hrefs.size, `'${text}' links to ${[...hrefs].join(", ")}`).toBe(1);
	}, 180_000);

	it("sends the three pillars of play to the three chapters that cover them", async () => {
		const { outputRoot } = realDocsProjection();
		const article = JSON.parse(
			readFileSync(join(outputRoot, "articles/srd/playing-the-game/rhythm-of-play.json"), "utf8"),
		) as DocsArticle;
		const html = (article.blocks ?? [])
			.map((block) => (block.kind === "html" ? block.html : ""))
			.join("");
		// Lower case in the source, capitalised in the chapter titles: the
		// sentence keeps its own spelling and still links.
		for (const [text, href] of [
			["social interaction", "/docs/srd/playing-the-game/social-interaction"],
			["exploration", "/docs/srd/playing-the-game/exploration"],
			["combat", "/docs/srd/playing-the-game/combat"],
		])
			expect(html).toContain(`<a href="${href}">${text}</a>`);
		// The licensed text itself is untouched.
		expect(article.body).toContain(
			"The three main pillars of D&D play are social interaction, exploration, and combat.",
		);
	}, 180_000);
});
