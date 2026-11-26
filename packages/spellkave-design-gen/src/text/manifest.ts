export const PROSE_MANIFEST_SCHEMA = "spellkave-prose-manifest/v1";

export const PROMPT_IDS = [
	"flatten",
	"phb-voice",
	"mcp-digest",
	"flavor",
	"flavor-creature",
	"flavor-spell",
	"glyph-spell",
	"flavor-item",
	"flavor-background",
	"flavor-species",
	"flavor-feat",
	"glyph-feat",
	"flavor-gear",
	"flavor-resource",
	"flavor-subclass",
	"flavor-rule",
] as const;
export type PromptId = (typeof PROMPT_IDS)[number];

export interface ProseEntry {
	id: string;
	display_name: string;
	prompt_id: PromptId;
	model: string;
	core_traits: Record<string, string>;
	must_include: string[];
	must_not: string[];
}

export interface ProseManifest {
	schema: typeof PROSE_MANIFEST_SCHEMA;
	output_dir: string;
	entries: ProseEntry[];
}

function asRecord(value: unknown, path: string): Record<string, unknown> {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		throw new Error(`${path} must be an object`);
	}
	return value as Record<string, unknown>;
}

function asString(value: unknown, path: string): string {
	if (typeof value !== "string" || value.trim() === "")
		throw new Error(`${path} must be a non-empty string`);
	return value;
}

function asStringArray(value: unknown, path: string): string[] {
	if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
		throw new Error(`${path} must be a string array`);
	}
	return value as string[];
}

function asPromptId(value: unknown, path: string): PromptId {
	const id = asString(value, path);
	if (!(PROMPT_IDS as readonly string[]).includes(id)) {
		throw new Error(`${path} must be one of ${PROMPT_IDS.join(", ")}`);
	}
	return id as PromptId;
}

function parseEntry(value: unknown, index: number): ProseEntry {
	const raw = asRecord(value, `entries[${index}]`);
	const traitsRaw = asRecord(raw.core_traits, `entries[${index}].core_traits`);
	const core_traits: Record<string, string> = {};
	for (const [key, trait] of Object.entries(traitsRaw)) {
		core_traits[key] = asString(trait, `entries[${index}].core_traits.${key}`);
	}
	return {
		id: asString(raw.id, `entries[${index}].id`),
		display_name: asString(raw.display_name, `entries[${index}].display_name`),
		prompt_id: asPromptId(raw.prompt_id, `entries[${index}].prompt_id`),
		model: asString(raw.model, `entries[${index}].model`),
		core_traits,
		must_include: asStringArray(raw.must_include ?? [], `entries[${index}].must_include`),
		must_not: asStringArray(raw.must_not ?? [], `entries[${index}].must_not`),
	};
}

export function parseProseManifest(value: unknown): ProseManifest {
	const raw = asRecord(value, "manifest");
	if (raw.schema !== PROSE_MANIFEST_SCHEMA) {
		throw new Error(`manifest.schema must be ${PROSE_MANIFEST_SCHEMA}`);
	}
	if (!Array.isArray(raw.entries) || raw.entries.length === 0) {
		throw new Error("manifest.entries must be a non-empty array");
	}
	return {
		schema: PROSE_MANIFEST_SCHEMA,
		output_dir: asString(raw.output_dir, "manifest.output_dir"),
		entries: raw.entries.map(parseEntry),
	};
}
