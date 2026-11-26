import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, isAbsolute, relative, resolve } from "node:path";
import { type ProviderId, resolveBlueprintProvider } from "./image-provider.ts";

const BLUEPRINT_SCHEMA = "spellkave-pixellab-ui-v2-blueprint/v1";
const RUN_SCHEMA = "spellkave-pixellab-ui-v2-run/v1";
const API_BASE_URL = "https://api.pixellab.ai/v2";

type JsonRecord = Record<string, unknown>;

type RoundedRect = {
	id: string;
	kind: "rounded_rect";
	label?: string;
	x: number;
	y: number;
	w: number;
	h: number;
	radius?: number;
};

export type PixelLabUiV2Blueprint = {
	schema: typeof BLUEPRINT_SCHEMA;
	provider: ProviderId;
	id: string;
	description: string;
	image_size: { width: number; height: number };
	output_directory: string;
	output_filename: string;
	style_image?: string;
	color_palette?: string;
	no_background: boolean;
	seed?: number;
	pieces?: RoundedRect[];
	style_pack?: string;
	provenance: { license: string; source: string };
};

export type PixelLabUiV2Options = {
	repoRoot: string;
	confirmPaid?: boolean;
	resume?: boolean;
	env?: NodeJS.ProcessEnv;
	fetchImpl?: typeof fetch;
	sleep?: (milliseconds: number) => Promise<void>;
	pollIntervalMs?: number;
	maxPolls?: number;
	now?: () => Date;
	onEvent?: (event: JsonRecord) => void | Promise<void>;
};

function isRecord(value: unknown): value is JsonRecord {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, field: string): string {
	if (typeof value !== "string" || value.trim() === "") {
		throw new Error(`${field} must be a non-empty string`);
	}
	return value;
}

function finiteNumber(value: unknown, field: string): number {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		throw new Error(`${field} must be a finite number`);
	}
	return value;
}

function integerInRange(value: unknown, field: string, minimum: number, maximum: number): number {
	const number = finiteNumber(value, field);
	if (!Number.isInteger(number) || number < minimum || number > maximum) {
		throw new Error(`${field} must be an integer from ${minimum} to ${maximum}`);
	}
	return number;
}

function booleanWithDefault(value: unknown, field: string, fallback: boolean): boolean {
	if (value === undefined) return fallback;
	if (typeof value !== "boolean") throw new Error(`${field} must be a boolean`);
	return value;
}

function resolveRepoPath(repoRoot: string, input: string, field: string): string {
	const root = resolve(repoRoot);
	const candidate = resolve(root, input);
	const path = relative(root, candidate);
	if (path === "" || (!path.startsWith("..") && !isAbsolute(path))) return candidate;
	throw new Error(`${field} must remain inside the repository`);
}

function parsePieces(value: unknown): RoundedRect[] | undefined {
	if (value === undefined) return undefined;
	if (!Array.isArray(value) || value.length === 0) {
		throw new Error("pieces must be a non-empty array when supplied");
	}
	const ids = new Set<string>();
	return value.map((piece, index) => {
		if (!isRecord(piece) || piece.kind !== "rounded_rect") {
			throw new Error(`pieces[${index}] must be a rounded_rect`);
		}
		const id = requiredString(piece.id, `pieces[${index}].id`);
		if (ids.has(id)) throw new Error(`pieces contains duplicate id: ${id}`);
		ids.add(id);
		return {
			id,
			kind: "rounded_rect",
			label: typeof piece.label === "string" ? piece.label : undefined,
			x: finiteNumber(piece.x, `pieces[${index}].x`),
			y: finiteNumber(piece.y, `pieces[${index}].y`),
			w: finiteNumber(piece.w, `pieces[${index}].w`),
			h: finiteNumber(piece.h, `pieces[${index}].h`),
			radius:
				piece.radius === undefined
					? undefined
					: finiteNumber(piece.radius, `pieces[${index}].radius`),
		};
	});
}

export function parseUiV2Blueprint(value: unknown): PixelLabUiV2Blueprint {
	if (!isRecord(value) || value.schema !== BLUEPRINT_SCHEMA) {
		throw new Error(`blueprint schema must be ${BLUEPRINT_SCHEMA}`);
	}
	const id = requiredString(value.id, "id");
	if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
		throw new Error("id must contain only lowercase letters, digits, and hyphens");
	}
	if (!isRecord(value.image_size)) throw new Error("image_size must be an object");
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
	const styleImage =
		value.style_image === undefined ? undefined : requiredString(value.style_image, "style_image");
	if (styleImage && ![".png", ".jpg", ".jpeg"].includes(extname(styleImage).toLowerCase())) {
		throw new Error("style_image must be a PNG or JPEG accepted by the PixelLab v2 contract");
	}
	if (!isRecord(value.provenance)) throw new Error("provenance must be an object");
	return {
		schema: BLUEPRINT_SCHEMA,
		provider: resolveBlueprintProvider(BLUEPRINT_SCHEMA, value.provider),
		id,
		description: requiredString(value.description, "description"),
		image_size: {
			width: integerInRange(value.image_size.width, "image_size.width", 192, 688),
			height: integerInRange(value.image_size.height, "image_size.height", 192, 688),
		},
		output_directory: outputDirectory,
		output_filename: outputFilename,
		style_image: styleImage,
		color_palette:
			value.color_palette === undefined
				? undefined
				: requiredString(value.color_palette, "color_palette"),
		no_background: booleanWithDefault(value.no_background, "no_background", true),
		seed:
			value.seed === undefined ? undefined : integerInRange(value.seed, "seed", 0, 4_294_967_295),
		pieces: parsePieces(value.pieces),
		style_pack:
			value.style_pack === undefined ? undefined : requiredString(value.style_pack, "style_pack"),
		provenance: {
			license: requiredString(value.provenance.license, "provenance.license"),
			source: requiredString(value.provenance.source, "provenance.source"),
		},
	};
}

function sha256(value: Buffer | string): string {
	return createHash("sha256").update(value).digest("hex");
}

async function writeJson(path: string, value: unknown): Promise<void> {
	await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function readManifest(path: string): Promise<JsonRecord | undefined> {
	try {
		const value: unknown = JSON.parse(await readFile(path, "utf8"));
		return isRecord(value) ? value : undefined;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
		throw error;
	}
}

function secretFromEnv(env: NodeJS.ProcessEnv): string {
	const secret = env.PIXELLAB_SECRET ?? env.PIXELLAB_API_KEY;
	if (!secret) throw new Error("PIXELLAB_SECRET is required for a live PixelLab v2 call");
	return secret;
}

async function providerJson(
	fetchImpl: typeof fetch,
	secret: string,
	path: string,
	init: RequestInit = {},
): Promise<JsonRecord> {
	const response = await fetchImpl(`${API_BASE_URL}${path}`, {
		...init,
		headers: {
			accept: "application/json",
			authorization: `Bearer ${secret}`,
			...(init.body ? { "content-type": "application/json" } : {}),
		},
	});
	const text = await response.text();
	let value: unknown;
	try {
		value = JSON.parse(text);
	} catch {
		throw new Error(`PixelLab ${path} returned HTTP ${response.status} with invalid JSON`);
	}
	if (!response.ok) throw new Error(`PixelLab ${path} returned HTTP ${response.status}`);
	if (!isRecord(value)) throw new Error(`PixelLab ${path} returned a non-object response`);
	return value;
}

export async function planUiV2Generation(blueprintPath: string, repoRoot: string) {
	const text = await readFile(blueprintPath, "utf8");
	const blueprint = parseUiV2Blueprint(JSON.parse(text));
	resolveRepoPath(repoRoot, blueprint.output_directory, "output_directory");
	if (blueprint.style_image) resolveRepoPath(repoRoot, blueprint.style_image, "style_image");
	return {
		kind: "pixellab_ui_v2_generation_plan",
		paid_call: false,
		blueprint: relative(resolve(repoRoot), resolve(blueprintPath)),
		id: blueprint.id,
		provider: "PixelLab",
		api_base_url: API_BASE_URL,
		route: "/create-ui-asset",
		image_size: blueprint.image_size,
		output_directory: blueprint.output_directory,
		estimated_usage: { type: "provider-priced-pro-job", jobs: 1 },
		confirmation_required: "--confirm-paid",
	};
}

export async function runUiV2Generation(
	blueprintPath: string,
	options: PixelLabUiV2Options,
): Promise<JsonRecord> {
	const repoRoot = resolve(options.repoRoot);
	const blueprintText = await readFile(blueprintPath, "utf8");
	const blueprint = parseUiV2Blueprint(JSON.parse(blueprintText));
	const plan = await planUiV2Generation(blueprintPath, repoRoot);
	await options.onEvent?.({ ...plan, kind: "cost_preview" });
	if (!options.confirmPaid) return plan;

	const outputDirectory = resolveRepoPath(repoRoot, blueprint.output_directory, "output_directory");
	const outputPath = resolve(outputDirectory, blueprint.output_filename);
	const manifestPath = resolve(outputDirectory, "manifest.json");
	const blueprintSha256 = sha256(blueprintText);
	const previous = await readManifest(manifestPath);
	if (previous) {
		if (!options.resume) throw new Error("output_directory already contains a run; pass --resume");
		if (previous.schema !== RUN_SCHEMA || previous.blueprint_sha256 !== blueprintSha256) {
			throw new Error("existing run does not match this blueprint");
		}
		if (!["failed", "generating"].includes(String(previous.status))) {
			throw new Error("only a failed or interrupted generating run can be resumed");
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

	const stylePath = blueprint.style_image
		? resolveRepoPath(repoRoot, blueprint.style_image, "style_image")
		: undefined;
	const styleBuffer = stylePath ? await readFile(stylePath) : undefined;
	const styleFormat = stylePath ? extname(stylePath).slice(1).replace("jpg", "jpeg") : undefined;
	const request = {
		description: blueprint.description,
		image_size: blueprint.image_size,
		pieces: blueprint.pieces,
		style_image:
			styleBuffer && styleFormat
				? { type: "base64", base64: styleBuffer.toString("base64"), format: styleFormat }
				: undefined,
		color_palette: blueprint.color_palette,
		no_background: blueprint.no_background,
		seed: blueprint.seed,
		name: blueprint.id,
	};
	const publicRequest = {
		...request,
		style_image: stylePath
			? {
					path: relative(repoRoot, stylePath),
					sha256: sha256(styleBuffer as Buffer),
					format: styleFormat,
				}
			: null,
	};
	const now = options.now ?? (() => new Date());
	let manifest: JsonRecord = previous
		? { ...previous }
		: {
				schema: RUN_SCHEMA,
				status: "prepared",
				attempt: 1,
				created_at: now().toISOString(),
				provider: "PixelLab",
				api: {
					base_url: API_BASE_URL,
					route: "/create-ui-asset",
					v2_reference: "docs/references/pixellab-api-v2.llms.txt",
				},
				blueprint: relative(repoRoot, resolve(blueprintPath)),
				blueprint_sha256: blueprintSha256,
				style_pack: blueprint.style_pack ?? null,
				request: publicRequest,
				provenance: blueprint.provenance,
				estimated_usage: plan.estimated_usage,
			};
	if (previous) {
		delete manifest.error;
		delete manifest.failed_at;
		manifest = { ...manifest, attempt: Number(previous.attempt ?? 1) + 1 };
	}
	await writeJson(manifestPath, manifest);

	const fetchImpl = options.fetchImpl ?? fetch;
	const secret = secretFromEnv(options.env ?? process.env);
	try {
		const balance = await providerJson(fetchImpl, secret, "/balance");
		await options.onEvent?.({ kind: "balance", balance });
		let jobId =
			typeof manifest.background_job_id === "string" ? manifest.background_job_id : undefined;
		let assetId = typeof manifest.ui_asset_id === "string" ? manifest.ui_asset_id : undefined;
		let submittedUsage = isRecord(manifest.submitted_usage) ? manifest.submitted_usage : undefined;
		if (!jobId || !assetId) {
			await options.onEvent?.({ kind: "generation_started", attempt: manifest.attempt });
			const submitted = await providerJson(fetchImpl, secret, "/create-ui-asset", {
				method: "POST",
				body: JSON.stringify(request),
			});
			jobId = requiredString(submitted.background_job_id, "background_job_id");
			assetId = requiredString(submitted.ui_asset_id, "ui_asset_id");
			submittedUsage = isRecord(submitted.usage) ? submitted.usage : undefined;
		}
		manifest = {
			...manifest,
			status: "generating",
			balance_before: balance,
			background_job_id: jobId,
			ui_asset_id: assetId,
			submitted_usage: submittedUsage ?? null,
		};
		await writeJson(manifestPath, manifest);

		const sleep =
			options.sleep ??
			((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
		const maxPolls = options.maxPolls ?? 120;
		let detail: JsonRecord | undefined;
		for (let poll = 0; poll < maxPolls; poll += 1) {
			detail = await providerJson(fetchImpl, secret, `/ui-assets/${encodeURIComponent(assetId)}`);
			if (detail.status === "completed") break;
			if (detail.status === "failed") throw new Error("PixelLab UI asset job failed");
			await sleep(options.pollIntervalMs ?? 5_000);
		}
		if (!detail || detail.status !== "completed")
			throw new Error("PixelLab UI asset job timed out");
		const imageUrl = requiredString(detail.image_url, "image_url");
		const parsedImageUrl = new URL(imageUrl);
		if (parsedImageUrl.protocol !== "https:") throw new Error("PixelLab image_url must use HTTPS");
		const imageResponse = await fetchImpl(imageUrl, { headers: { accept: "image/*" } });
		if (!imageResponse.ok)
			throw new Error(`PixelLab image download returned HTTP ${imageResponse.status}`);
		const image = Buffer.from(await imageResponse.arrayBuffer());
		if (image.length === 0) throw new Error("PixelLab image download was empty");
		await writeFile(outputPath, image);
		const job = await providerJson(
			fetchImpl,
			secret,
			`/background-jobs/${encodeURIComponent(jobId)}`,
		);
		const completed = {
			...manifest,
			status: "completed",
			completed_at: now().toISOString(),
			usage: isRecord(job.usage) ? job.usage : (submittedUsage ?? null),
			output: {
				path: blueprint.output_filename,
				sha256: sha256(image),
				format: "png",
				dimensions: [blueprint.image_size.width, blueprint.image_size.height],
			},
		};
		await writeJson(manifestPath, completed);
		await options.onEvent?.({ kind: "generation_completed", output: completed.output });
		return completed;
	} catch (error) {
		const failure = {
			...manifest,
			status: "failed",
			failed_at: now().toISOString(),
			error: {
				name: error instanceof Error ? error.name : "UnknownError",
				message: error instanceof Error ? error.message : "PixelLab v2 call failed",
			},
		};
		await writeJson(manifestPath, failure);
		throw error;
	}
}
