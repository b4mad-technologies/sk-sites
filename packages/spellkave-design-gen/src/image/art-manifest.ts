import { readFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import {
	isRecord,
	type JsonRecord,
	type ProviderId,
	parseProviderId,
	resolveInsideRepo,
} from "./image-provider.ts";

// Licence written into the provenance of first-party art skgen generates
// (owner decision 2026-11-26: first-party art is CC BY 4.0, see ART.md).
export const FIRST_PARTY_ART_LICENSE = "CC-BY-4.0";
export const ART_MANIFEST_SCHEMA = "spellkave-art-manifest/v1";
export const ART_PROMPT_TEMPLATES_SCHEMA = "spellkave-art-prompt-templates/v1";
export const PLACEHOLDER_TEMPLATES_REL = "scripts/design-assets/prompt-templates.placeholder.json";

export interface ArtManifestEntry {
	id: string;
	kind: string;
	name: string;
	prompt_inputs: Record<string, string>;
	size: { width: number; height: number } | string;
	output_path: string;
	target_attachment_ref: string;
	provider?: ProviderId;
	/** Base sprite entry id this variant composites onto. */
	overlay_of?: string;
	/** Named magic template id (Flame Tongue, Vorpal, …). */
	overlay_template?: string;
	/** Effect-family badge id (fire, cold, rune, …) composed bottom-right. */
	overlay_badge?: string;
}

export interface ArtManifest {
	schema: typeof ART_MANIFEST_SCHEMA;
	id: string;
	style_pack?: string;
	templates?: string;
	provider?: ProviderId;
	balance_floor?: { type: string; generations?: number; usd?: number; tokens?: number };
	post_pass?: { route: string; palette_path?: string };
	output_root: string;
	provenance: { license: string; source: string };
	/** Named magic template id → effect-family badge id. */
	overlay_badges?: Record<string, string>;
	entries: ArtManifestEntry[];
}

export interface KindTemplate {
	provider: ProviderId;
	blueprint_schema: string;
	description?: string;
	prompt?: string;
	defaults?: JsonRecord;
}

export interface PromptTemplates {
	schema: typeof ART_PROMPT_TEMPLATES_SCHEMA;
	id: string;
	boilerplate?: string;
	kinds: Record<string, KindTemplate>;
}

export interface ExpandedEntry {
	entry: ArtManifestEntry;
	provider: ProviderId;
	blueprint: JsonRecord;
	blueprint_relpath: string;
}

function requiredString(value: unknown, field: string): string {
	if (typeof value !== "string" || value.trim() === "") {
		throw new Error(`${field} must be a non-empty string`);
	}
	return value;
}

function parseSize(value: unknown, field: string): ArtManifestEntry["size"] {
	if (typeof value === "string") {
		if (!/^\d+x\d+$/.test(value)) throw new Error(`${field} string must look like 64x64`);
		return value;
	}
	if (!isRecord(value)) throw new Error(`${field} must be {width,height} or WxH`);
	const width = value.width;
	const height = value.height;
	if (typeof width !== "number" || typeof height !== "number") {
		throw new Error(`${field} width and height must be numbers`);
	}
	if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
		throw new Error(`${field} width and height must be positive integers`);
	}
	return { width, height };
}

function parsePromptInputs(value: unknown, field: string): Record<string, string> {
	if (value === undefined) return {};
	if (!isRecord(value)) throw new Error(`${field} must be an object`);
	const inputs: Record<string, string> = {};
	for (const [key, item] of Object.entries(value)) {
		if (typeof item !== "string") throw new Error(`${field}.${key} must be a string`);
		inputs[key] = item;
	}
	return inputs;
}

function parseOverlayBadges(value: unknown): Record<string, string> | undefined {
	if (value === undefined) return undefined;
	if (!isRecord(value)) throw new Error("overlay_badges must be an object");
	const out: Record<string, string> = {};
	for (const [template, badge] of Object.entries(value)) {
		out[requiredString(template, "overlay_badges key")] = requiredString(
			badge,
			`overlay_badges.${template}`,
		);
	}
	return out;
}

function parsePostPass(value: unknown): ArtManifest["post_pass"] {
	if (value === undefined) return undefined;
	if (!isRecord(value)) throw new Error("post_pass must be an object");
	return {
		route: requiredString(value.route, "post_pass.route"),
		palette_path:
			value.palette_path === undefined
				? undefined
				: requiredString(value.palette_path, "post_pass.palette_path"),
	};
}

export function parseArtManifest(value: unknown): ArtManifest {
	if (!isRecord(value) || value.schema !== ART_MANIFEST_SCHEMA) {
		throw new Error(`manifest schema must be ${ART_MANIFEST_SCHEMA}`);
	}
	const id = requiredString(value.id, "id");
	if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
		throw new Error("id must contain only lowercase letters, digits, and hyphens");
	}
	if (!isRecord(value.provenance)) throw new Error("provenance must be an object");
	if (!Array.isArray(value.entries) || value.entries.length === 0) {
		throw new Error("entries must be a non-empty array");
	}
	const seen = new Set<string>();
	const entries = value.entries.map((raw, index) => {
		if (!isRecord(raw)) throw new Error(`entries[${index}] must be an object`);
		const entryId = requiredString(raw.id, `entries[${index}].id`);
		if (!/^[a-z0-9][a-z0-9-]*$/.test(entryId)) {
			throw new Error(`entries[${index}].id must be lowercase kebab-case`);
		}
		if (seen.has(entryId)) throw new Error(`duplicate entry id: ${entryId}`);
		seen.add(entryId);
		const overlayOf =
			raw.overlay_of === undefined || raw.overlay_of === ""
				? undefined
				: requiredString(raw.overlay_of, `entries[${index}].overlay_of`);
		const overlayTemplate =
			raw.overlay_template === undefined || raw.overlay_template === ""
				? undefined
				: requiredString(raw.overlay_template, `entries[${index}].overlay_template`);
		const overlayBadge =
			raw.overlay_badge === undefined || raw.overlay_badge === ""
				? undefined
				: requiredString(raw.overlay_badge, `entries[${index}].overlay_badge`);
		if (Boolean(overlayOf) !== Boolean(overlayTemplate)) {
			throw new Error(
				`entries[${index}] overlay_of and overlay_template must both be set or both omitted`,
			);
		}
		return {
			id: entryId,
			kind: requiredString(raw.kind, `entries[${index}].kind`),
			name: requiredString(raw.name, `entries[${index}].name`),
			prompt_inputs: parsePromptInputs(raw.prompt_inputs, `entries[${index}].prompt_inputs`),
			size: parseSize(raw.size, `entries[${index}].size`),
			output_path: requiredString(raw.output_path, `entries[${index}].output_path`).replaceAll(
				"\\",
				"/",
			),
			target_attachment_ref: requiredString(
				raw.target_attachment_ref,
				`entries[${index}].target_attachment_ref`,
			),
			provider:
				raw.provider === undefined
					? undefined
					: parseProviderId(raw.provider, `entries[${index}].provider`),
			overlay_of: overlayOf,
			overlay_template: overlayTemplate,
			overlay_badge: overlayBadge,
		};
	});
	let balanceFloor: ArtManifest["balance_floor"];
	if (value.balance_floor !== undefined) {
		if (!isRecord(value.balance_floor)) throw new Error("balance_floor must be an object");
		balanceFloor = {
			type: requiredString(value.balance_floor.type, "balance_floor.type"),
			generations:
				typeof value.balance_floor.generations === "number"
					? value.balance_floor.generations
					: undefined,
			usd: typeof value.balance_floor.usd === "number" ? value.balance_floor.usd : undefined,
			tokens:
				typeof value.balance_floor.tokens === "number" ? value.balance_floor.tokens : undefined,
		};
	}
	return {
		schema: ART_MANIFEST_SCHEMA,
		id,
		style_pack:
			value.style_pack === undefined ? undefined : requiredString(value.style_pack, "style_pack"),
		templates:
			value.templates === undefined ? undefined : requiredString(value.templates, "templates"),
		provider: value.provider === undefined ? undefined : parseProviderId(value.provider),
		balance_floor: balanceFloor,
		post_pass: parsePostPass(value.post_pass),
		output_root: requiredString(value.output_root, "output_root").replaceAll("\\", "/"),
		provenance: {
			license: requiredString(value.provenance.license, "provenance.license"),
			source: requiredString(value.provenance.source, "provenance.source"),
		},
		overlay_badges: parseOverlayBadges(value.overlay_badges),
		entries,
	};
}

export function parsePromptTemplates(value: unknown): PromptTemplates {
	if (!isRecord(value) || value.schema !== ART_PROMPT_TEMPLATES_SCHEMA) {
		throw new Error(`templates schema must be ${ART_PROMPT_TEMPLATES_SCHEMA}`);
	}
	if (!isRecord(value.kinds)) throw new Error("templates.kinds must be an object");
	const kinds: Record<string, KindTemplate> = {};
	for (const [kind, raw] of Object.entries(value.kinds)) {
		if (!isRecord(raw)) throw new Error(`kinds.${kind} must be an object`);
		kinds[kind] = {
			provider: parseProviderId(raw.provider, `kinds.${kind}.provider`),
			blueprint_schema: requiredString(raw.blueprint_schema, `kinds.${kind}.blueprint_schema`),
			description:
				raw.description === undefined
					? undefined
					: requiredString(raw.description, `kinds.${kind}.description`),
			prompt:
				raw.prompt === undefined ? undefined : requiredString(raw.prompt, `kinds.${kind}.prompt`),
			defaults: isRecord(raw.defaults) ? raw.defaults : undefined,
		};
	}
	return {
		schema: ART_PROMPT_TEMPLATES_SCHEMA,
		id: requiredString(value.id, "id"),
		boilerplate: typeof value.boilerplate === "string" ? value.boilerplate : undefined,
		kinds,
	};
}

export function interpolateTemplate(template: string, vars: Record<string, string>): string {
	return template.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_, key: string) => vars[key] ?? "");
}

function sizeFields(size: ArtManifestEntry["size"], provider: ProviderId): JsonRecord {
	if (provider === "openai-image") {
		if (typeof size === "string") return { size };
		return { size: `${size.width}x${size.height}` };
	}
	if (typeof size === "string") {
		const [widthText, heightText] = size.split("x");
		return { image_size: { width: Number(widthText), height: Number(heightText) } };
	}
	return { image_size: size };
}

export function expandEntry(
	manifest: ArtManifest,
	entry: ArtManifestEntry,
	templates: PromptTemplates,
): { provider: ProviderId; blueprint: JsonRecord } {
	const kind = templates.kinds[entry.kind];
	if (!kind) throw new Error(`no prompt template for kind ${entry.kind}`);
	const provider = entry.provider ?? kind.provider;
	if (entry.provider !== undefined && entry.provider !== kind.provider) {
		throw new Error(
			`entry ${entry.id} provider ${entry.provider} does not match kind ${entry.kind} template provider ${kind.provider}`,
		);
	}
	const vars: Record<string, string> = {
		name: entry.name,
		descriptors: "",
		subject: "",
		boilerplate: templates.boilerplate ?? "",
		...entry.prompt_inputs,
	};
	if (!vars.descriptors && vars.subject) vars.descriptors = vars.subject;
	const description = kind.description ? interpolateTemplate(kind.description, vars) : undefined;
	const prompt = kind.prompt ? interpolateTemplate(kind.prompt, vars) : undefined;
	const blueprint: JsonRecord = {
		...(kind.defaults ?? {}),
		schema: kind.blueprint_schema,
		provider,
		id: entry.id,
		output_directory: `${manifest.output_root}/${entry.id}`,
		output_filename: `${entry.id}.png`,
		style_pack: manifest.style_pack ?? null,
		provenance: manifest.provenance,
		...sizeFields(entry.size, provider),
	};
	if (description !== undefined) blueprint.description = description;
	if (prompt !== undefined) blueprint.prompt = prompt;
	return { provider, blueprint };
}

export async function loadPromptTemplates(
	manifest: ArtManifest,
	repoRoot: string,
): Promise<{ templates: PromptTemplates; source: string }> {
	const candidates: string[] = [];
	if (manifest.templates) candidates.push(manifest.templates);
	if (manifest.style_pack) {
		candidates.push(join(dirname(manifest.style_pack), "prompt-templates.json"));
	}
	candidates.push(PLACEHOLDER_TEMPLATES_REL);
	for (const rel of candidates) {
		const abs = resolveInsideRepo(repoRoot, rel, "templates");
		try {
			const templates = parsePromptTemplates(JSON.parse(await readFile(abs, "utf8")));
			return { templates, source: relative(resolve(repoRoot), abs) };
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
			if (rel === PLACEHOLDER_TEMPLATES_REL) throw error;
			if (manifest.templates && rel === manifest.templates) throw error;
		}
	}
	throw new Error("no prompt templates found");
}

export async function expandArtManifest(
	manifest: ArtManifest,
	repoRoot: string,
	templates: PromptTemplates,
): Promise<ExpandedEntry[]> {
	return manifest.entries.map((entry) => {
		const expanded = expandEntry(manifest, entry, templates);
		return {
			entry,
			provider: expanded.provider,
			blueprint: expanded.blueprint,
			blueprint_relpath: `${manifest.output_root}/${entry.id}.blueprint.json`,
		};
	});
}

export async function readArtManifest(path: string, repoRoot: string): Promise<ArtManifest> {
	const abs = resolveInsideRepo(
		repoRoot,
		relative(repoRoot, resolve(path)) === "" ? path : path,
		"manifest",
	);
	return parseArtManifest(JSON.parse(await readFile(abs, "utf8")));
}
