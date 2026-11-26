import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import {
	createRouteSet,
	type GenerateContext,
	type ImageProvider,
	type ProviderPlan,
	resolveInsideRepo,
} from "./image-provider.ts";
import {
	createOpenAiImageClientFromEnv,
	OPENAI_IMAGE_EDITS_URL,
	OPENAI_IMAGE_MODEL,
	OPENAI_IMAGES_URL,
	type OpenAiImageBlueprint,
	type OpenAiImageClient,
	parseOpenAiImageBlueprint,
} from "./openai-image.ts";

function mimeFor(path: string): string {
	if (path.endsWith(".png")) return "image/png";
	if (path.endsWith(".webp")) return "image/webp";
	if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
	throw new Error(`unsupported style image type: ${path}`);
}

function clientFrom(ctx: GenerateContext): OpenAiImageClient {
	const injected = ctx.clients?.openai;
	if (injected) return injected as OpenAiImageClient;
	return createOpenAiImageClientFromEnv(ctx.env);
}

export const openaiImageProvider: ImageProvider = {
	id: "openai-image",
	routes: createRouteSet(["/v1/images/generations", "/v1/images/edits"]),
	validate(raw: unknown): OpenAiImageBlueprint {
		return parseOpenAiImageBlueprint(raw);
	},
	plan(request: unknown): ProviderPlan {
		const blueprint = request as OpenAiImageBlueprint;
		const endpoint =
			(blueprint.style_images?.length ?? 0) > 0 ? OPENAI_IMAGE_EDITS_URL : OPENAI_IMAGES_URL;
		return {
			kind: "image_provider_plan",
			paid_call: false,
			provider: "openai-image",
			route: endpoint,
			estimated_usage: { type: "tokens" },
			confirmation_required: "--confirm-paid",
		};
	},
	async generate(request: unknown, ctx: GenerateContext) {
		const blueprint = request as OpenAiImageBlueprint;
		const client = clientFrom(ctx);
		const styleImages = [];
		for (const stylePath of blueprint.style_images ?? []) {
			const abs = resolveInsideRepo(ctx.repoRoot, stylePath, "style_images");
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
		return {
			bytes: png,
			mime: "image/png" as const,
			usage: {
				type: "tokens",
				tokens: usage.total_tokens ?? usage.output_tokens ?? null,
			},
			providerIds: {
				model: OPENAI_IMAGE_MODEL,
				endpoint: styleImages.length > 0 ? OPENAI_IMAGE_EDITS_URL : OPENAI_IMAGES_URL,
			},
		};
	},
	async balance() {
		return { remaining: null, unit: "tokens", raw: null };
	},
};
