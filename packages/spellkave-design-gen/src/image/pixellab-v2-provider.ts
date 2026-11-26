import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import {
	createRouteSet,
	type GenerateContext,
	type ImageProvider,
	isRecord,
	type JsonRecord,
	normalizeBalance,
	type ProviderPlan,
	resolveInsideRepo,
} from "./image-provider.ts";
import { type PixelLabUiV2Blueprint, parseUiV2Blueprint } from "./pixellab-ui-v2.ts";

const API_BASE_URL = "https://api.pixellab.ai/v2";

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

export const pixellabV2Provider: ImageProvider = {
	id: "pixellab-v2",
	routes: createRouteSet(["/create-ui-asset"]),
	validate(raw: unknown): PixelLabUiV2Blueprint {
		return parseUiV2Blueprint(raw);
	},
	plan(): ProviderPlan {
		return {
			kind: "image_provider_plan",
			paid_call: false,
			provider: "pixellab-v2",
			route: "/create-ui-asset",
			estimated_usage: { type: "provider-priced-pro-job", jobs: 1 },
			confirmation_required: "--confirm-paid",
		};
	},
	async generate(request: unknown, ctx: GenerateContext) {
		const blueprint = request as PixelLabUiV2Blueprint;
		const fetchImpl = ctx.fetchImpl ?? fetch;
		const secret = secretFromEnv(ctx.env ?? process.env);
		const stylePath = blueprint.style_image
			? resolveInsideRepo(ctx.repoRoot, blueprint.style_image, "style_image")
			: undefined;
		const styleBuffer = stylePath ? await readFile(stylePath) : undefined;
		const styleFormat = stylePath ? extname(stylePath).slice(1).replace("jpg", "jpeg") : undefined;
		const body = {
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
		const submitted = await providerJson(fetchImpl, secret, "/create-ui-asset", {
			method: "POST",
			body: JSON.stringify(body),
		});
		const jobId = requiredString(submitted.background_job_id, "background_job_id");
		const assetId = requiredString(submitted.ui_asset_id, "ui_asset_id");
		const sleep =
			ctx.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
		const maxPolls = ctx.maxPolls ?? 120;
		let detail: JsonRecord | undefined;
		for (let poll = 0; poll < maxPolls; poll += 1) {
			detail = await providerJson(fetchImpl, secret, `/ui-assets/${encodeURIComponent(assetId)}`);
			if (detail.status === "completed") break;
			if (detail.status === "failed") throw new Error("PixelLab UI asset job failed");
			await sleep(ctx.pollIntervalMs ?? 5_000);
		}
		if (!detail || detail.status !== "completed")
			throw new Error("PixelLab UI asset job timed out");
		const imageUrl = requiredString(detail.image_url, "image_url");
		const parsedImageUrl = new URL(imageUrl);
		if (parsedImageUrl.protocol !== "https:") throw new Error("PixelLab image_url must use HTTPS");
		const imageResponse = await fetchImpl(imageUrl, { headers: { accept: "image/*" } });
		if (!imageResponse.ok) {
			throw new Error(`PixelLab image download returned HTTP ${imageResponse.status}`);
		}
		const bytes = Buffer.from(await imageResponse.arrayBuffer());
		if (bytes.length === 0) throw new Error("PixelLab image download was empty");
		const job = await providerJson(
			fetchImpl,
			secret,
			`/background-jobs/${encodeURIComponent(jobId)}`,
		);
		const usage = isRecord(job.usage)
			? job.usage
			: isRecord(submitted.usage)
				? submitted.usage
				: { type: "provider-priced-pro-job", jobs: 1 };
		return {
			bytes,
			mime: "image/png" as const,
			usage: {
				type: typeof usage.type === "string" ? usage.type : "provider-priced-pro-job",
				usd: typeof usage.usd === "number" ? usage.usd : null,
				generations: typeof usage.generations === "number" ? usage.generations : null,
				jobs: 1,
			},
			providerIds: {
				background_job_id: jobId,
				ui_asset_id: assetId,
			},
		};
	},
	async balance(ctx) {
		const fetchImpl = ctx.fetchImpl ?? fetch;
		const secret = secretFromEnv(ctx.env ?? process.env);
		return normalizeBalance(await providerJson(fetchImpl, secret, "/balance"));
	},
};

for (const path of [
	"/create-image-pixflux",
	"/create-image-pixen",
	"/create-image-bitforge",
	"/generate-with-style-v2",
	"/create-character-v3",
	"/create-character-with-8-directions",
	"/enhance-pixen-prompt",
	"/image-to-pixelart",
	"/reduce-colors",
	"/remove-background",
]) {
	pixellabV2Provider.routes.register(path);
}
