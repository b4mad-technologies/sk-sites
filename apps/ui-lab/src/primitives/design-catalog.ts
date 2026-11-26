export const DOC_PAGE_SLUGS = [
	"/components/reference-card",
	"/maps/hover-card",
	"/",
	"/themes",
	"/foundations/colors",
	"/foundations/typography",
	"/foundations/spacing",
	"/foundations/materials",
	"/foundations/world-art",
	"/components/accordion",
	"/components/collapsible",
	"/components/app-shell",
	"/components/chat",
	"/components/markdown",
	"/components/badge",
	"/components/button",
	"/components/card",
	"/components/checkbox",
	"/components/code",
	"/components/doc-reader",
	"/components/link-menu",
	"/components/dock-bar",
	"/components/dock-hotbar",
	"/components/date-and-time",
	"/components/dialog",
	"/components/field",
	"/components/info-card",
	"/components/input",
	"/components/popover",
	"/components/progress",
	"/components/radio-group",
	"/components/scroll-area",
	"/components/select",
	"/components/switch",
	"/components/tabs",
	"/components/textarea",
	"/components/tooltip",
	"/compositions/product-masthead",
	"/compositions/narrative-hero",
	"/compositions/journey-band",
	"/compositions/seat-board",
	"/compositions/connector-list",
	"/play/scene",
	"/play/occupants",
	"/play/actions",
	"/play/activity-feed",
	"/play/hero",
	"/play/pack",
	"/play/speech",
	"/play/combat",
	"/play/economy",
	"/play/battle-map",
	"/play/selection-row",
	"/play/field-detail",
	"/play/entity-reader-dialog",
	"/play/map",
	"/maps/canvas",
	"/docs/entry-compact",
	"/docs/action",
	"/docs/affordance",
	"/docs/area-shape",
	"/docs/autonomy-job",
	"/docs/boundary",
	"/docs/capability",
	"/docs/combat-grid",
	"/docs/condition",
	"/docs/condition-remove-policy",
	"/docs/consequence",
	"/docs/coordinate-kind",
	"/docs/distance-metric",
	"/docs/macro",
	"/docs/channel",
	"/docs/effect",
	"/docs/slot",
	"/docs/extent-kind",
	"/docs/location",
	"/docs/modifier-target",
	"/docs/modifier",
	"/docs/niche",
	"/docs/object-state",
	"/docs/outcome-graph",
	"/docs/outcome",
	"/docs/roll-table",
	"/docs/spatial-state",
	"/docs/stacking-discipline",
	"/docs/substrate",
	"/docs/trace-kind",
	"/docs/entity",
	"/docs/resource",
	"/docs/kinds",
	"/maps/inspect",
] as const;

export type DocPageSlug = (typeof DOC_PAGE_SLUGS)[number];

export const DOC_PAGE_DESIGN_HEADING: Partial<Record<DocPageSlug, string>> = {
	"/themes": "Themes",
	"/foundations/colors": "Semantic colors",
	"/foundations/typography": "Typography",
	"/foundations/spacing": "Spacing and material",
	"/foundations/materials": "Spacing and material",
	"/foundations/world-art": "Spacing and material",
	"/components/accordion": "Accordion",
	"/components/collapsible": "Collapsible",
	"/components/badge": "Badge",
	"/components/button": "Buttons",
	"/components/card": "Cards / Containers",
	"/components/checkbox": "Checkbox",
	"/components/date-and-time": "Date and time",
	"/components/dialog": "Dialog",
	"/components/field": "Fields",
	"/components/input": "Fields",
	"/components/popover": "Popover",
	"/components/progress": "Progress",
	"/components/radio-group": "Radio Group",
	"/components/scroll-area": "Scroll Area",
	"/components/select": "Select",
	"/components/switch": "Switch",
	"/components/tabs": "Tabs",
	"/components/textarea": "Fields",
	"/components/tooltip": "Tooltip",
	"/compositions/product-masthead": "Navigation",
	"/compositions/narrative-hero": "Shared Compositions",
	"/compositions/journey-band": "Shared Compositions",
	"/compositions/seat-board": "Shared Compositions",
	"/compositions/connector-list": "Shared Compositions",
};

export function catalogHeadingsFromDocPages(): string[] {
	const seen = new Set<string>();
	const headings: string[] = [];
	for (const slug of DOC_PAGE_SLUGS) {
		const heading = DOC_PAGE_DESIGN_HEADING[slug];
		if (!heading || seen.has(heading)) continue;
		seen.add(heading);
		headings.push(heading);
	}
	return headings;
}

export type NamedRule = {
	name: string;
	body: string;
};

export type ParsedComponent = {
	name: string;
	description: string | null;
	properties: Record<string, string>;
	variants: { name: string; description: string }[];
};

export type ParsedDesignMd = {
	colors?: { description: string | null; rules: NamedRule[] } | null;
	typography?: { character: string | null; rules: NamedRule[] } | null;
	layout?: { description: string | null; rules: NamedRule[] } | null;
	elevation?: { description: string | null; rules: NamedRule[] } | null;
	shapes?: { description: string | null; rules: NamedRule[] } | null;
	components?: { components: ParsedComponent[] } | null;
	dosDonts?: { dos: string[]; donts: string[] } | null;
};

export type SourcedExcerpt = {
	source: string;
	title: string | null;
	body: string;
};

export type CatalogSample = {
	heading: string;
	status: "ruled" | "unruled";
	excerpts: SourcedExcerpt[];
};

export type UnsampledComponent = {
	name: string;
	excerpts: SourcedExcerpt[];
};

export type DesignCatalog = {
	samples: CatalogSample[];
	unsampledComponents: UnsampledComponent[];
	dosDonts: { dos: string[]; donts: string[] };
};

const SECTION_BINDS: Record<string, "colors" | "typography" | "material"> = {
	"Semantic colors": "colors",
	Typography: "typography",
	"Spacing and material": "material",
};

function pushExcerpt(excerpts: SourcedExcerpt[], excerpt: SourcedExcerpt): void {
	const body = excerpt.body.trim();
	if (!body) return;
	if (
		excerpts.some(
			(existing) =>
				existing.body === body || existing.body.includes(body) || body.includes(existing.body),
		)
	) {
		return;
	}
	excerpts.push({ ...excerpt, body });
}

function componentExcerpts(component: ParsedComponent): SourcedExcerpt[] {
	const source = `DESIGN.md ### ${component.name}`;
	const excerpts: SourcedExcerpt[] = [];
	if (component.description) {
		pushExcerpt(excerpts, { source, title: null, body: component.description });
	}
	for (const [title, body] of Object.entries(component.properties)) {
		pushExcerpt(excerpts, { source, title, body });
	}
	for (const variant of component.variants) {
		pushExcerpt(excerpts, { source, title: variant.name, body: variant.description });
	}
	return excerpts;
}

function ruleExcerpts(source: string, rules: NamedRule[] | undefined): SourcedExcerpt[] {
	const excerpts: SourcedExcerpt[] = [];
	for (const rule of rules ?? []) {
		pushExcerpt(excerpts, { source, title: rule.name, body: rule.body });
	}
	return excerpts;
}

function sectionExcerpts(
	model: ParsedDesignMd,
	bind: "colors" | "typography" | "material",
): SourcedExcerpt[] {
	if (bind === "colors") {
		const excerpts: SourcedExcerpt[] = [];
		if (model.colors?.description) {
			pushExcerpt(excerpts, {
				source: "DESIGN.md ## Colors",
				title: null,
				body: model.colors.description,
			});
		}
		excerpts.push(...ruleExcerpts("DESIGN.md ## Colors", model.colors?.rules));
		return excerpts;
	}
	if (bind === "typography") {
		const excerpts: SourcedExcerpt[] = [];
		if (model.typography?.character) {
			pushExcerpt(excerpts, {
				source: "DESIGN.md ## Typography",
				title: null,
				body: model.typography.character,
			});
		}
		excerpts.push(...ruleExcerpts("DESIGN.md ## Typography", model.typography?.rules));
		return excerpts;
	}
	const excerpts: SourcedExcerpt[] = [];
	if (model.layout?.description) {
		pushExcerpt(excerpts, {
			source: "DESIGN.md ## Layout",
			title: null,
			body: model.layout.description,
		});
	}
	excerpts.push(...ruleExcerpts("DESIGN.md ## Layout", model.layout?.rules));
	if (model.elevation?.description) {
		pushExcerpt(excerpts, {
			source: "DESIGN.md ## Elevation & Depth",
			title: null,
			body: model.elevation.description,
		});
	}
	excerpts.push(...ruleExcerpts("DESIGN.md ## Elevation & Depth", model.elevation?.rules));
	if (model.shapes?.description) {
		pushExcerpt(excerpts, {
			source: "DESIGN.md ## Shapes",
			title: null,
			body: model.shapes.description,
		});
	}
	excerpts.push(...ruleExcerpts("DESIGN.md ## Shapes", model.shapes?.rules));
	return excerpts;
}

export function joinDesignCatalog(
	model: ParsedDesignMd,
	sampleHeadings: readonly string[] = catalogHeadingsFromDocPages(),
): DesignCatalog {
	const components = model.components?.components ?? [];
	const byName = new Map(components.map((component) => [component.name, component]));
	const sampleNameSet = new Set(sampleHeadings);

	const samples: CatalogSample[] = sampleHeadings.map((heading) => {
		const bind = SECTION_BINDS[heading];
		const excerpts = bind
			? sectionExcerpts(model, bind)
			: byName.has(heading)
				? componentExcerpts(byName.get(heading) as ParsedComponent)
				: [];
		if (bind && excerpts.length === 0) {
			throw new Error(
				`Sample "${heading}" is bound to DESIGN.md ## ${bind} but produced no excerpt`,
			);
		}
		if (!bind && byName.has(heading) && excerpts.length === 0) {
			throw new Error(
				`Sample "${heading}" matches DESIGN.md ### ${heading} but produced no excerpt`,
			);
		}
		return {
			heading,
			status: excerpts.length > 0 ? "ruled" : "unruled",
			excerpts,
		};
	});

	const unsampledComponents: UnsampledComponent[] = components
		.filter((component) => !sampleNameSet.has(component.name))
		.map((component) => ({
			name: component.name,
			excerpts: componentExcerpts(component),
		}));

	return {
		samples,
		unsampledComponents,
		dosDonts: model.dosDonts ?? { dos: [], donts: [] },
	};
}

export function extractH2Texts(source: string): string[] {
	const headings: string[] = [];
	const re = /<h2\b[^>]*>([\s\S]*?)<\/h2>/gi;
	let match: RegExpExecArray | null = re.exec(source);
	while (match) {
		const inner = match[1];
		if (inner) {
			const text = inner
				.replace(/<[^>]+>/g, " ")
				.replace(/\s+/g, " ")
				.trim();
			if (text) headings.push(text);
		}
		match = re.exec(source);
	}
	return headings;
}
