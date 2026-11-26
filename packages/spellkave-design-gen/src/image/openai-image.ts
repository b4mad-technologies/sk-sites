import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, isAbsolute, relative, resolve } from "node:path";
import { type ProviderId, resolveBlueprintProvider } from "./image-provider.ts";
import { checkTileability, type TileabilityReport } from "./tileability.ts";

export const OPENAI_IMAGE_BLUEPRINT_SCHEMA = "spellkave-openai-image-blueprint/v1";
export const OPENAI_IMAGE_RUN_SCHEMA = "spellkave-openai-image-run/v1";
export const OPENAI_IMAGE_MODEL = "gpt-image-2";
export const OPENAI_IMAGES_URL = "https://api.openai.com/v1/images/generations";
export const OPENAI_IMAGE_EDITS_URL = "https://api.openai.com/v1/images/edits";

type JsonRecord = Record<string, unknown>;

export type OpenAiImageJob = "seamless_material" | "hero_scene";

export interface OpenAiImageBlueprint {
	schema: typeof OPENAI_IMAGE_BLUEPRINT_SCHEMA;
	provider: ProviderId;
	id: string;
	job: OpenAiImageJob;
	prompt: string;
	size: string;
	quality: "low" | "medium" | "high";
	output_directory: string;
	output_filename: string;
	style_images?: string[];
	style_pack?: string;
	require_tileability?: boolean;
	provenance: { license: string; source: string };
}

export interface OpenAiImagePlan {
	kind: "openai_image_generation_plan";
	paid_call: false;
	provider: "OpenAI";
	model: typeof OPENAI_IMAGE_MODEL;
	endpoint: string;
	blueprint: string;
	id: string;
	job: OpenAiImageJob;
	size: string;
	quality: string;
	style_images: string[];
	output_directory: string;
	require_tileability: boolean;
	confirmation_required: "--confirm-paid";
}

export interface OpenAiImageUsage {
	input_tokens?: number;
	output_tokens?: number;
	total_tokens?: number;
}

export interface OpenAiImageClient {
	generate(input: {
		model?: string;
		prompt: string;
		size: string;
		quality: string;
		background?: "opaque" | "transparent";
		styleImages: Array<{ name: string; bytes: Buffer; type: string }>;
		mask?: { name: string; bytes: Buffer; type: "image/png" };
	}): Promise<{ png: Buffer; usage: OpenAiImageUsage }>;
}

export interface OpenAiImageRun {
	schema: typeof OPENAI_IMAGE_RUN_SCHEMA;
	provider: "OpenAI";
	model: typeof OPENAI_IMAGE_MODEL;
	endpoint: string;
	id: string;
	job: OpenAiImageJob;
	prompt: string;
	style_images: string[];
	size: string;
	quality: string;
	output: { path: string; sha256: string; width: number; height: number };
	usage: OpenAiImageUsage;
	license: string;
	tileability: TileabilityReport | null;
}

function isRecord(value: unknown): value is JsonRecord {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, field: string): string {
	if (typeof value !== "string" || value.trim() === "") {
		throw new Error(`${field} must be a non-empty string`);
	}
	return value;
}

function insideRepo(root: string, candidate: string): string {
	const resolved = resolve(root, candidate);
	const rel = relative(root, resolved);
	if (rel.startsWith("..") || isAbsolute(rel)) {
		throw new Error(`path must stay inside the repository: ${candidate}`);
	}
	return resolved;
}

export function parseOpenAiImageBlueprint(value: unknown): OpenAiImageBlueprint {
	if (!isRecord(value)) throw new Error("blueprint must be an object");
	if (value.schema !== OPENAI_IMAGE_BLUEPRINT_SCHEMA) {
		throw new Error(`blueprint schema must be ${OPENAI_IMAGE_BLUEPRINT_SCHEMA}`);
	}
	const id = requiredString(value.id, "id");
	if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
		throw new Error("id must be lowercase kebab-case");
	}
	const job = value.job;
	if (job !== "seamless_material" && job !== "hero_scene") {
		throw new Error("job must be seamless_material or hero_scene");
	}
	const quality = value.quality ?? "high";
	if (quality !== "low" && quality !== "medium" && quality !== "high") {
		throw new Error("quality must be low, medium, or high");
	}
	const styleImages = Array.isArray(value.style_images)
		? value.style_images.map((item, index) => requiredString(item, `style_images[${index}]`))
		: [];
	if (!isRecord(value.provenance)) throw new Error("provenance must be an object");
	return {
		schema: OPENAI_IMAGE_BLUEPRINT_SCHEMA,
		provider: resolveBlueprintProvider(OPENAI_IMAGE_BLUEPRINT_SCHEMA, value.provider),
		id,
		job,
		prompt: requiredString(value.prompt, "prompt"),
		size: requiredString(value.size, "size"),
		quality,
		output_directory: requiredString(value.output_directory, "output_directory"),
		output_filename: requiredString(value.output_filename, "output_filename"),
		style_images: styleImages,
		style_pack: typeof value.style_pack === "string" ? value.style_pack : undefined,
		require_tileability: value.require_tileability === true || job === "seamless_material",
		provenance: {
			license: requiredString(value.provenance.license, "provenance.license"),
			source: requiredString(value.provenance.source, "provenance.source"),
		},
	};
}

export async function loadOpenAiImageBlueprint(
	path: string,
	repoRoot: string,
): Promise<OpenAiImageBlueprint> {
	return parseOpenAiImageBlueprint(JSON.parse(await readFile(path, "utf8")));
}

export async function planOpenAiImage(
	blueprintPath: string,
	repoRoot: string,
): Promise<OpenAiImagePlan> {
	const blueprint = await loadOpenAiImageBlueprint(blueprintPath, repoRoot);
	const endpoint =
		(blueprint.style_images?.length ?? 0) > 0 ? OPENAI_IMAGE_EDITS_URL : OPENAI_IMAGES_URL;
	return {
		kind: "openai_image_generation_plan",
		paid_call: false,
		provider: "OpenAI",
		model: OPENAI_IMAGE_MODEL,
		endpoint,
		blueprint: relative(repoRoot, resolve(blueprintPath)),
		id: blueprint.id,
		job: blueprint.job,
		size: blueprint.size,
		quality: blueprint.quality,
		style_images: blueprint.style_images ?? [],
		output_directory: blueprint.output_directory,
		require_tileability: Boolean(blueprint.require_tileability),
		confirmation_required: "--confirm-paid",
	};
}

function mimeFor(path: string): string {
	if (path.endsWith(".png")) return "image/png";
	if (path.endsWith(".webp")) return "image/webp";
	if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
	throw new Error(`unsupported style image type: ${path}`);
}

export function createOpenAiImageClientFromEnv(
	env: NodeJS.ProcessEnv = process.env,
	fetchImpl: typeof fetch = fetch,
): OpenAiImageClient {
	const key = env.OPENAI_API_KEY?.trim();
	if (!key) throw new Error("OPENAI_API_KEY must be set in the environment");
	return {
		async generate({
			model = OPENAI_IMAGE_MODEL,
			prompt,
			size,
			quality,
			background,
			styleImages,
			mask,
		}) {
			const headers: Record<string, string> = { Authorization: `Bearer ${key}` };
			let response: Response;
			if (styleImages.length === 0) {
				headers["Content-Type"] = "application/json";
				response = await fetchImpl(OPENAI_IMAGES_URL, {
					method: "POST",
					headers,
					body: JSON.stringify({
						model,
						prompt,
						size,
						quality,
						output_format: "png",
						...(background ? { background } : {}),
					}),
				});
			} else {
				const body = new FormData();
				body.set("model", model);
				body.set("prompt", prompt);
				body.set("size", size);
				body.set("quality", quality);
				if (background) body.set("background", background);
				const field = styleImages.length === 1 ? "image" : "image[]";
				for (const image of styleImages) {
					body.append(
						field,
						new Blob([Uint8Array.from(image.bytes)], { type: image.type }),
						image.name,
					);
				}
				if (mask) {
					body.append(
						"mask",
						new Blob([Uint8Array.from(mask.bytes)], { type: mask.type }),
						mask.name,
					);
				}
				response = await fetchImpl(OPENAI_IMAGE_EDITS_URL, { method: "POST", headers, body });
			}
			if (!response.ok) {
				throw new Error(`OpenAI image request failed: ${response.status} ${await response.text()}`);
			}
			const payload = (await response.json()) as {
				data?: Array<{ b64_json?: string }>;
				usage?: OpenAiImageUsage;
			};
			const encoded = payload.data?.[0]?.b64_json;
			if (!encoded) throw new Error("OpenAI image response missing b64_json");
			return { png: Buffer.from(encoded, "base64"), usage: payload.usage ?? {} };
		},
	};
}

export async function runOpenAiImage(
	blueprintPath: string,
	options: {
		repoRoot: string;
		confirmPaid?: boolean;
		client?: OpenAiImageClient;
		env?: NodeJS.ProcessEnv;
	},
): Promise<OpenAiImageRun> {
	if (!options.confirmPaid) {
		throw new Error("refusing paid OpenAI call without --confirm-paid");
	}
	const blueprint = await loadOpenAiImageBlueprint(blueprintPath, options.repoRoot);
	const client = options.client ?? createOpenAiImageClientFromEnv(options.env);
	const styleImages = [];
	for (const stylePath of blueprint.style_images ?? []) {
		const abs = insideRepo(options.repoRoot, stylePath);
		styleImages.push({
			name: basename(abs),
			bytes: await readFile(abs),
			type: mimeFor(abs),
		});
	}
	const { png, usage } = await client.generate({
		prompt: blueprint.prompt,
		size: blueprint.size,
		quality: blueprint.quality,
		styleImages,
	});
	const outputDir = insideRepo(options.repoRoot, blueprint.output_directory);
	await mkdir(outputDir, { recursive: true });
	const outputPath = resolve(outputDir, blueprint.output_filename);
	await writeFile(outputPath, png);
	const [widthText, heightText] = blueprint.size.split("x");
	const tileability = blueprint.require_tileability
		? checkTileability(outputPath, { previewPath: resolve(outputDir, "tile-3x3.png") })
		: null;
	const run: OpenAiImageRun = {
		schema: OPENAI_IMAGE_RUN_SCHEMA,
		provider: "OpenAI",
		model: OPENAI_IMAGE_MODEL,
		endpoint: styleImages.length > 0 ? OPENAI_IMAGE_EDITS_URL : OPENAI_IMAGES_URL,
		id: blueprint.id,
		job: blueprint.job,
		prompt: blueprint.prompt,
		style_images: blueprint.style_images ?? [],
		size: blueprint.size,
		quality: blueprint.quality,
		output: {
			path: relative(options.repoRoot, outputPath),
			sha256: createHash("sha256").update(png).digest("hex"),
			width: Number(widthText),
			height: Number(heightText),
		},
		usage,
		license: blueprint.provenance.license,
		tileability,
	};
	await writeFile(resolve(outputDir, "manifest.json"), `${JSON.stringify(run, null, 2)}\n`);
	if (tileability && !tileability.pass) {
		throw new Error(
			`tileability gate failed: left/right MAE ${tileability.left_right_mae}, top/bottom MAE ${tileability.top_bottom_mae}`,
		);
	}
	return run;
}
