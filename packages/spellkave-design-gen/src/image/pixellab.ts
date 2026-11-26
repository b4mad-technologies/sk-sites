import { createHash } from "node:crypto";
import { access, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, isAbsolute, relative, resolve } from "node:path";
import {
	Base64Image,
	type CameraView,
	type Detail,
	type Direction,
	type GenerateImagePixfluxParams,
	type Outline,
	PixelLabClient,
	type Shading,
} from "@pixellab-code/pixellab";
import { type ProviderId, resolveBlueprintProvider } from "./image-provider.ts";

export const PIXELLAB_SDK_PACKAGE = "@pixellab-code/pixellab";
export const PIXELLAB_SDK_VERSION = "1.0.2";
export const PIXELLAB_SDK_PATCH = "patches/@pixellab-code__pixellab@1.0.2.patch";
export const PIXELLAB_SDK_API_BASE_URL = "https://api.pixellab.ai/v1";
export const PIXELLAB_V2_REFERENCE_URL = "https://api.pixellab.ai/v2/llms.txt";
export const PIXELLAB_V2_OPENAPI_URL = "https://api.pixellab.ai/v2/openapi.json";

const BLUEPRINT_SCHEMA = "spellkave-pixellab-blueprint/v1";
const RUN_SCHEMA = "spellkave-pixellab-run/v1";
const INGEST_ROOT = "packages/spellkave-ui/src/assets";

type JsonRecord = Record<string, unknown>;

export interface PixelLabBlueprint {
	schema: typeof BLUEPRINT_SCHEMA;
	provider: ProviderId;
	id: string;
	description: string;
	image_size: { width: number; height: number };
	output_directory: string;
	output_filename: string;
	negative_description?: string;
	text_guidance_scale?: number;
	outline?: Outline;
	shading?: Shading;
	detail?: Detail;
	view?: CameraView;
	direction?: Direction;
	isometric?: boolean;
	no_background?: boolean;
	coverage_percentage?: number;
	init_image?: string;
	init_image_strength?: number;
	color_image?: string;
	seed?: number;
	style_pack?: string;
	provenance: {
		license: string;
		source: string;
	};
}

export interface PixelLabUsage {
	type: "usd" | "generations";
	usd?: number | null;
	generations?: number | null;
}

export interface PixelLabImage {
	toBuffer(): Buffer;
	saveToFile(path: string): Promise<void>;
}

export interface PixelLabSdkClient {
	getBalance(): Promise<unknown>;
	generateImagePixflux(params: GenerateImagePixfluxParams): Promise<{
		image: PixelLabImage;
		usage: PixelLabUsage;
	}>;
}

export interface GenerationEvent {
	kind: "cost_preview" | "balance" | "generation_started" | "generation_completed";
	[key: string]: unknown;
}

export interface GenerationPlan {
	kind: "pixellab_generation_plan";
	paid_call: false;
	blueprint: string;
	id: string;
	provider: "PixelLab";
	sdk: { package: string; version: string; patch: string };
	api_base_url: string;
	route: "/generate-image-pixflux";
	image_size: { width: number; height: number };
	output_directory: string;
	estimated_usage: { type: "generations"; generations: 1 };
	confirmation_required: "--confirm-paid";
	sdk_compatibility: string;
}

export interface GenerationOptions {
	repoRoot: string;
	confirmPaid?: boolean;
	resume?: boolean;
	client?: PixelLabSdkClient;
	env?: NodeJS.ProcessEnv;
	now?: () => Date;
	onEvent?: (event: GenerationEvent) => void | Promise<void>;
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

function optionalString(value: unknown, field: string): string | undefined {
	if (value === undefined) return undefined;
	return requiredString(value, field);
}

function optionalNumber(value: unknown, field: string): number | undefined {
	if (value === undefined) return undefined;
	if (typeof value !== "number" || !Number.isFinite(value)) {
		throw new Error(`${field} must be a finite number`);
	}
	return value;
}

function optionalBoolean(value: unknown, field: string): boolean | undefined {
	if (value === undefined) return undefined;
	if (typeof value !== "boolean") throw new Error(`${field} must be a boolean`);
	return value;
}

function enumValue<T extends string>(
	value: unknown,
	field: string,
	values: readonly T[],
): T | undefined {
	if (value === undefined) return undefined;
	if (typeof value !== "string" || !values.includes(value as T)) {
		throw new Error(`${field} must be one of: ${values.join(", ")}`);
	}
	return value as T;
}

export function parseBlueprint(value: unknown): PixelLabBlueprint {
	if (!isRecord(value)) throw new Error("blueprint must be a JSON object");
	if (value.schema !== BLUEPRINT_SCHEMA) {
		throw new Error(`blueprint schema must be ${BLUEPRINT_SCHEMA}`);
	}

	const id = requiredString(value.id, "id");
	if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
		throw new Error("id must contain only lowercase letters, digits, and hyphens");
	}
	if (!isRecord(value.image_size)) throw new Error("image_size must be an object");
	const width = optionalNumber(value.image_size.width, "image_size.width");
	const height = optionalNumber(value.image_size.height, "image_size.height");
	if (!Number.isInteger(width) || !Number.isInteger(height)) {
		throw new Error("image_size width and height must be integers");
	}
	if (
		(width as number) < 32 ||
		(width as number) > 400 ||
		(height as number) < 32 ||
		(height as number) > 400
	) {
		throw new Error("PixFlux image_size width and height must each be between 32 and 400");
	}

	const outputFilename = requiredString(value.output_filename, "output_filename");
	if (isAbsolute(outputFilename) || outputFilename.includes("/") || outputFilename.includes("\\")) {
		throw new Error("output_filename must be a filename, not a path");
	}
	if (extname(outputFilename).toLowerCase() !== ".png") {
		throw new Error("output_filename must end in .png");
	}
	const outputDirectory = requiredString(value.output_directory, "output_directory").replaceAll(
		"\\",
		"/",
	);
	if (!outputDirectory.startsWith("pixellab-generations/")) {
		throw new Error("output_directory must be below pixellab-generations/");
	}
	if (!isRecord(value.provenance)) throw new Error("provenance must be an object");

	return {
		schema: BLUEPRINT_SCHEMA,
		provider: resolveBlueprintProvider(BLUEPRINT_SCHEMA, value.provider),
		id,
		description: requiredString(value.description, "description"),
		image_size: { width: width as number, height: height as number },
		output_directory: outputDirectory,
		output_filename: outputFilename,
		negative_description: optionalString(value.negative_description, "negative_description"),
		text_guidance_scale: optionalNumber(value.text_guidance_scale, "text_guidance_scale"),
		outline: enumValue(value.outline, "outline", [
			"single color black outline",
			"single color outline",
			"selective outline",
			"lineless",
		]),
		shading: enumValue(value.shading, "shading", [
			"flat shading",
			"basic shading",
			"medium shading",
			"detailed shading",
			"highly detailed shading",
		]),
		detail: enumValue(value.detail, "detail", ["low detail", "medium detail", "highly detailed"]),
		view: enumValue(value.view, "view", ["side", "low top-down", "high top-down"]),
		direction: enumValue(value.direction, "direction", [
			"south",
			"south-east",
			"east",
			"north-east",
			"north",
			"north-west",
			"west",
			"south-west",
		]),
		isometric: optionalBoolean(value.isometric, "isometric"),
		no_background: optionalBoolean(value.no_background, "no_background"),
		coverage_percentage: optionalNumber(value.coverage_percentage, "coverage_percentage"),
		init_image: optionalString(value.init_image, "init_image"),
		init_image_strength: optionalNumber(value.init_image_strength, "init_image_strength"),
		color_image: optionalString(value.color_image, "color_image"),
		seed: optionalNumber(value.seed, "seed"),
		style_pack: optionalString(value.style_pack, "style_pack"),
		provenance: {
			license: requiredString(value.provenance.license, "provenance.license"),
			source: requiredString(value.provenance.source, "provenance.source"),
		},
	};
}

export async function readBlueprint(path: string): Promise<PixelLabBlueprint> {
	return parseBlueprint(JSON.parse(await readFile(path, "utf8")));
}

export function createClientFromEnv(env: NodeJS.ProcessEnv = process.env): PixelLabClient {
	const secret = env.PIXELLAB_SECRET ?? env.PIXELLAB_API_KEY;
	if (!secret) {
		throw new Error("PIXELLAB_SECRET is required in the environment for a live PixelLab call");
	}
	return new PixelLabClient(secret, PIXELLAB_SDK_API_BASE_URL);
}

function resolveRepoPath(repoRoot: string, input: string, field: string): string {
	const root = resolve(repoRoot);
	const candidate = resolve(root, input);
	const rel = relative(root, candidate);
	if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) return candidate;
	throw new Error(`${field} must remain inside the repository`);
}

async function sha256File(path: string): Promise<string> {
	return createHash("sha256")
		.update(await readFile(path))
		.digest("hex");
}

function sha256Text(value: string): string {
	return createHash("sha256").update(value).digest("hex");
}

function publicRequest(blueprint: PixelLabBlueprint): JsonRecord {
	return {
		description: blueprint.description,
		image_size: blueprint.image_size,
		negative_description: blueprint.negative_description ?? "",
		text_guidance_scale: blueprint.text_guidance_scale ?? 8,
		outline: blueprint.outline ?? null,
		shading: blueprint.shading ?? null,
		detail: blueprint.detail ?? null,
		view: blueprint.view ?? null,
		direction: blueprint.direction ?? null,
		isometric: blueprint.isometric ?? false,
		no_background: blueprint.no_background ?? false,
		coverage_percentage: blueprint.coverage_percentage ?? null,
		init_image: blueprint.init_image ?? null,
		init_image_strength: blueprint.init_image_strength ?? 300,
		color_image: blueprint.color_image ?? null,
		seed: blueprint.seed ?? null,
	};
}

export async function planGeneration(
	blueprintPath: string,
	repoRoot: string,
): Promise<GenerationPlan> {
	const blueprint = await readBlueprint(blueprintPath);
	resolveRepoPath(repoRoot, blueprint.output_directory, "output_directory");
	return {
		kind: "pixellab_generation_plan",
		paid_call: false,
		blueprint: relative(resolve(repoRoot), resolve(blueprintPath)),
		id: blueprint.id,
		provider: "PixelLab",
		sdk: {
			package: PIXELLAB_SDK_PACKAGE,
			version: PIXELLAB_SDK_VERSION,
			patch: PIXELLAB_SDK_PATCH,
		},
		api_base_url: PIXELLAB_SDK_API_BASE_URL,
		route: "/generate-image-pixflux",
		image_size: blueprint.image_size,
		output_directory: blueprint.output_directory,
		estimated_usage: { type: "generations", generations: 1 },
		confirmation_required: "--confirm-paid",
		sdk_compatibility:
			"The pinned SDK targets v1. Its repository patch accepts the live subscription generations usage shape; the committed v2 reference remains advisory until upstream adds v2 response types.",
	};
}

async function optionalImage(
	repoRoot: string,
	input: string | undefined,
): Promise<Base64Image | undefined> {
	if (!input) return undefined;
	return Base64Image.fromFile(resolveRepoPath(repoRoot, input, "image input"));
}

function errorSummary(error: unknown): { name: string; message: string } {
	if (error instanceof Error) return { name: error.name, message: error.message };
	return { name: "UnknownError", message: "PixelLab call failed without an Error object" };
}

async function readResumeManifest(path: string): Promise<JsonRecord | undefined> {
	try {
		const value = JSON.parse(await readFile(path, "utf8"));
		return isRecord(value) ? value : undefined;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
		throw error;
	}
}

async function writeJson(path: string, value: unknown): Promise<void> {
	await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function runGeneration(
	blueprintPath: string,
	options: GenerationOptions,
): Promise<GenerationPlan | JsonRecord> {
	const repoRoot = resolve(options.repoRoot);
	const blueprintText = await readFile(blueprintPath, "utf8");
	const blueprint = parseBlueprint(JSON.parse(blueprintText));
	const plan = await planGeneration(blueprintPath, repoRoot);
	await options.onEvent?.({ ...plan, kind: "cost_preview" });
	if (!options.confirmPaid) return plan;
	const client = options.client ?? createClientFromEnv(options.env);

	const outputDirectory = resolveRepoPath(repoRoot, blueprint.output_directory, "output_directory");
	const outputPath = resolve(outputDirectory, blueprint.output_filename);
	const manifestPath = resolve(outputDirectory, "manifest.json");
	const blueprintSha256 = sha256Text(blueprintText);
	const previous = await readResumeManifest(manifestPath);
	if (previous) {
		if (!options.resume) {
			throw new Error(
				"output_directory already contains a run; pass --resume only for a matching failed run",
			);
		}
		if (previous.schema !== RUN_SCHEMA || previous.blueprint_sha256 !== blueprintSha256) {
			throw new Error("existing run does not match this blueprint");
		}
		if (previous.status !== "failed") {
			throw new Error("only a failed run can be resumed");
		}
	} else {
		try {
			await access(outputDirectory);
			throw new Error("output_directory already exists; choose a new directory");
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
		}
		await mkdir(outputDirectory, { recursive: true });
	}

	const now = options.now ?? (() => new Date());
	const attempt = typeof previous?.attempt === "number" ? previous.attempt + 1 : 1;
	const baseManifest: JsonRecord = {
		schema: RUN_SCHEMA,
		status: "prepared",
		attempt,
		created_at: now().toISOString(),
		provider: "PixelLab",
		sdk: {
			package: PIXELLAB_SDK_PACKAGE,
			version: PIXELLAB_SDK_VERSION,
			patch: PIXELLAB_SDK_PATCH,
		},
		api: {
			base_url: PIXELLAB_SDK_API_BASE_URL,
			route: "/generate-image-pixflux",
			v2_reference: "docs/references/pixellab-api-v2.llms.txt",
		},
		blueprint: relative(repoRoot, resolve(blueprintPath)),
		blueprint_sha256: blueprintSha256,
		style_pack: blueprint.style_pack ?? null,
		request: publicRequest(blueprint),
		request_id: null,
		provenance: blueprint.provenance,
		estimated_usage: plan.estimated_usage,
	};
	await writeJson(manifestPath, baseManifest);

	try {
		const balance = await client.getBalance();
		await options.onEvent?.({ kind: "balance", balance });
		const params: GenerateImagePixfluxParams = {
			description: blueprint.description,
			imageSize: blueprint.image_size,
			negativeDescription: blueprint.negative_description,
			textGuidanceScale: blueprint.text_guidance_scale,
			outline: blueprint.outline,
			shading: blueprint.shading,
			detail: blueprint.detail,
			view: blueprint.view,
			direction: blueprint.direction,
			isometric: blueprint.isometric,
			noBackground: blueprint.no_background,
			coveragePercentage: blueprint.coverage_percentage,
			initImage: await optionalImage(repoRoot, blueprint.init_image),
			initImageStrength: blueprint.init_image_strength,
			colorImage: await optionalImage(repoRoot, blueprint.color_image),
			seed: blueprint.seed,
		};
		await writeJson(manifestPath, {
			...baseManifest,
			status: "generating",
			balance_before: balance,
		});
		await options.onEvent?.({ kind: "generation_started", attempt });
		const response = await client.generateImagePixflux(params);
		await response.image.saveToFile(outputPath);
		const completed = {
			...baseManifest,
			status: "completed",
			completed_at: now().toISOString(),
			balance_before: balance,
			usage: response.usage,
			output: {
				path: blueprint.output_filename,
				sha256: await sha256File(outputPath),
				format: "png",
				dimensions: [blueprint.image_size.width, blueprint.image_size.height],
			},
		};
		await writeJson(manifestPath, completed);
		await options.onEvent?.({ kind: "generation_completed", output: completed.output });
		return completed;
	} catch (error) {
		await writeJson(manifestPath, {
			...baseManifest,
			status: "failed",
			failed_at: now().toISOString(),
			error: errorSummary(error),
		});
		throw error;
	}
}

export interface IngestOptions {
	repoRoot: string;
	confirmReviewed?: boolean;
}

export async function ingestGeneration(
	manifestPath: string,
	targetRelativePath: string,
	options: IngestOptions,
): Promise<JsonRecord> {
	const repoRoot = resolve(options.repoRoot);
	const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
	if (!isRecord(manifest) || manifest.schema !== RUN_SCHEMA || manifest.status !== "completed") {
		throw new Error("manifest must be a completed spellkave-pixellab-run/v1 record");
	}
	if (!isRecord(manifest.output)) throw new Error("manifest.output is missing");
	const sourceName = requiredString(manifest.output.path, "manifest.output.path");
	if (isAbsolute(sourceName) || sourceName.includes("/") || sourceName.includes("\\")) {
		throw new Error("manifest.output.path must be a filename");
	}
	const expectedHash = requiredString(manifest.output.sha256, "manifest.output.sha256");
	const sourcePath = resolve(dirname(manifestPath), sourceName);
	if ((await sha256File(sourcePath)) !== expectedHash) {
		throw new Error("generated image hash does not match the manifest");
	}

	const normalizedTarget = targetRelativePath.replaceAll("\\", "/");
	if (!normalizedTarget.startsWith(`${INGEST_ROOT}/`)) {
		throw new Error(`ingest target must be below ${INGEST_ROOT}/`);
	}
	const targetPath = resolveRepoPath(repoRoot, normalizedTarget, "ingest target");
	const plan = {
		kind: "pixellab_ingest_plan",
		paid_call: false,
		source: relative(repoRoot, sourcePath),
		target: normalizedTarget,
		sha256: expectedHash,
		confirmation_required: "--confirm-reviewed",
	};
	if (!options.confirmReviewed) return plan;

	try {
		await access(targetPath);
		throw new Error("ingest target already exists");
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
	}
	await mkdir(dirname(targetPath), { recursive: true });
	await copyFile(sourcePath, targetPath);
	await writeJson(`${targetPath}.json`, {
		schema: "spellkave-design-asset-provenance/v1",
		provider: manifest.provider,
		sdk: manifest.sdk,
		api: manifest.api,
		prompt: isRecord(manifest.request) ? manifest.request.description : null,
		style_pack: manifest.style_pack,
		provenance: manifest.provenance,
		usage: manifest.usage,
		generated_at: manifest.completed_at,
		source_manifest: relative(repoRoot, resolve(manifestPath)),
		sha256: expectedHash,
	});
	return { ...plan, ingested: true };
}
