import { readFile } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve } from "node:path";
import {
	createRouteSet,
	type GenerateContext,
	type ImageProvider,
	isRecord,
	type JsonRecord,
	normalizeBalance,
	PIXELLAB_PIXEN_BLUEPRINT_SCHEMA,
	type ProviderPlan,
} from "./image-provider.ts";

const API_BASE_URL = "https://api.pixellab.ai/v2";

export type PixelLabPixenBlueprint = {
	schema: typeof PIXELLAB_PIXEN_BLUEPRINT_SCHEMA;
	id: string;
	description: string;
	image_size: { width: number; height: number };
	output_directory: string;
	output_filename: string;
	no_background?: boolean;
	outline?: string;
	detail?: string;
	view?: string;
	direction?: string;
	seed?: number;
	enhance_prompt?: boolean;
	style_pack?: string | null;
	provenance?: { license: string; source: string };
};

function secretFromEnv(env: NodeJS.ProcessEnv | undefined): string {
	const secret = env?.PIXELLAB_SECRET ?? env?.PIXELLAB_API_KEY;
	if (!secret) throw new Error("PIXELLAB_SECRET is required for a live PixelLab v2 call");
	return secret;
}

function requiredString(value: unknown, field: string): string {
	if (typeof value !== "string" || value.trim() === "") {
		throw new Error(`${field} must be a non-empty string`);
	}
	return value;
}

function pixenSize(value: unknown, field: string): number {
	if (typeof value !== "number" || !Number.isInteger(value)) {
		throw new Error(`${field} must be an integer`);
	}
	if (value < 16 || value > 512 || value % 4 !== 0) {
		throw new Error(`${field} must be 16–512 and divisible by 4`);
	}
	return value;
}

export function parsePixenBlueprint(raw: unknown): PixelLabPixenBlueprint {
	if (!isRecord(raw)) throw new Error("pixen blueprint must be an object");
	if (raw.schema !== PIXELLAB_PIXEN_BLUEPRINT_SCHEMA) {
		throw new Error(`blueprint schema must be ${PIXELLAB_PIXEN_BLUEPRINT_SCHEMA}`);
	}
	const id = requiredString(raw.id, "id");
	if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
		throw new Error("id must contain only lowercase letters, digits, and hyphens");
	}
	if (!isRecord(raw.image_size)) throw new Error("image_size must be an object");
	const outputFilename = requiredString(raw.output_filename, "output_filename");
	if (isAbsolute(outputFilename) || outputFilename.includes("/") || outputFilename.includes("\\")) {
		throw new Error("output_filename must be a filename, not a path");
	}
	if (extname(outputFilename).toLowerCase() !== ".png") {
		throw new Error("output_filename must end in .png");
	}
	return {
		schema: PIXELLAB_PIXEN_BLUEPRINT_SCHEMA,
		id,
		description: requiredString(raw.description, "description"),
		image_size: {
			width: pixenSize(raw.image_size.width, "image_size.width"),
			height: pixenSize(raw.image_size.height, "image_size.height"),
		},
		output_directory: requiredString(raw.output_directory, "output_directory").replaceAll(
			"\\",
			"/",
		),
		output_filename: outputFilename,
		no_background: typeof raw.no_background === "boolean" ? raw.no_background : true,
		outline: typeof raw.outline === "string" ? raw.outline : undefined,
		detail: typeof raw.detail === "string" ? raw.detail : undefined,
		view: typeof raw.view === "string" ? raw.view : undefined,
		direction: typeof raw.direction === "string" ? raw.direction : undefined,
		seed: typeof raw.seed === "number" ? raw.seed : undefined,
		enhance_prompt: typeof raw.enhance_prompt === "boolean" ? raw.enhance_prompt : undefined,
		style_pack: typeof raw.style_pack === "string" ? raw.style_pack : null,
		provenance: isRecord(raw.provenance)
			? {
					license: requiredString(raw.provenance.license, "provenance.license"),
					source: requiredString(raw.provenance.source, "provenance.source"),
				}
			: undefined,
	};
}

export async function providerJson(
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
	if (!response.ok) {
		throw new Error(`PixelLab ${path} returned HTTP ${response.status}: ${text.slice(0, 240)}`);
	}
	if (!isRecord(value)) throw new Error(`PixelLab ${path} returned a non-object response`);
	return value;
}

function imageFromBody(body: JsonRecord): Buffer {
	const candidates: unknown[] = [body.image];
	if (Array.isArray(body.images)) candidates.push(body.images[0]);
	for (const candidate of candidates) {
		if (isRecord(candidate) && typeof candidate.base64 === "string") {
			return Buffer.from(
				String(candidate.base64).replace(/^data:image\/\w+;base64,/, ""),
				"base64",
			);
		}
	}
	throw new Error("PixelLab Pixen response had no image");
}

export async function reduceColorsOntoPalette(
	png: Buffer,
	palettePng: Buffer,
	ctx: { env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch },
): Promise<{ bytes: Buffer; usage: { type: string; generations: number | null } }> {
	const fetchImpl = ctx.fetchImpl ?? fetch;
	const secret = secretFromEnv(ctx.env ?? process.env);
	const body = await providerJson(fetchImpl, secret, "/reduce-colors", {
		method: "POST",
		body: JSON.stringify({
			images: [{ type: "base64", base64: png.toString("base64"), format: "png" }],
			palette_image: { type: "base64", base64: palettePng.toString("base64"), format: "png" },
			dithering: "none",
		}),
	});
	const usage = isRecord(body.usage) ? body.usage : {};
	return {
		bytes: imageFromBody(body),
		usage: {
			type: typeof usage.type === "string" ? usage.type : "generations",
			generations: typeof usage.generations === "number" ? usage.generations : 0.1,
		},
	};
}

export function palettePathForStylePack(stylePack: string): string {
	const dir = stylePack.replace(/\/manifest\.json$/, "");
	return `${dir}/palette.png`;
}

export const pixellabPixenProvider: ImageProvider = {
	id: "pixellab-pixen",
	routes: createRouteSet(["/create-image-pixen", "/reduce-colors", "/enhance-pixen-prompt"]),
	validate(raw: unknown): PixelLabPixenBlueprint {
		return parsePixenBlueprint(raw);
	},
	plan(request: unknown): ProviderPlan {
		const blueprint = request as PixelLabPixenBlueprint;
		return {
			kind: "image_provider_plan",
			paid_call: false,
			provider: "pixellab-pixen",
			route: "/create-image-pixen",
			estimated_usage: {
				type: "generations",
				generations: blueprint.enhance_prompt ? 1.05 : 1,
			},
			confirmation_required: "--confirm-paid",
		};
	},
	async generate(request: unknown, ctx: GenerateContext) {
		const blueprint = request as PixelLabPixenBlueprint;
		const fetchImpl = ctx.fetchImpl ?? fetch;
		const secret = secretFromEnv(ctx.env ?? process.env);
		const body = await providerJson(fetchImpl, secret, "/create-image-pixen", {
			method: "POST",
			body: JSON.stringify({
				description: blueprint.description,
				image_size: blueprint.image_size,
				no_background: blueprint.no_background ?? true,
				seed: blueprint.seed,
				outline: blueprint.outline,
				detail: blueprint.detail,
				view: blueprint.view,
				direction: blueprint.direction,
				enhance_prompt: blueprint.enhance_prompt,
			}),
		});
		const usage = isRecord(body.usage) ? body.usage : {};
		return {
			bytes: imageFromBody(body),
			mime: "image/png" as const,
			usage: {
				type: typeof usage.type === "string" ? usage.type : "generations",
				generations: typeof usage.generations === "number" ? usage.generations : 1,
			},
			providerIds: { api_base_url: API_BASE_URL, route: "/create-image-pixen" },
		};
	},
	async balance(ctx) {
		const fetchImpl = ctx.fetchImpl ?? fetch;
		const secret = secretFromEnv(ctx.env ?? process.env);
		return normalizeBalance(await providerJson(fetchImpl, secret, "/balance"));
	},
};

export function resolveRepoFile(repoRoot: string, input: string, field: string): string {
	const root = resolve(repoRoot);
	const candidate = resolve(root, input);
	const rel = relative(root, candidate);
	if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) return candidate;
	throw new Error(`${field} must remain inside the repository`);
}

export async function readPalettePng(repoRoot: string, stylePack: string): Promise<Buffer> {
	const path = resolveRepoFile(
		repoRoot,
		palettePathForStylePack(stylePack),
		"reduce-colors palette",
	);
	return readFile(path);
}
