import { Base64Image, type GenerateImagePixfluxParams } from "@pixellab-code/pixellab";
import {
	createRouteSet,
	type GenerateContext,
	type ImageProvider,
	normalizeBalance,
	type ProviderPlan,
	resolveInsideRepo,
} from "./image-provider.ts";
import {
	createClientFromEnv,
	PIXELLAB_SDK_API_BASE_URL,
	type PixelLabBlueprint,
	type PixelLabSdkClient,
	parseBlueprint,
} from "./pixellab.ts";

async function optionalImage(
	repoRoot: string,
	input: string | undefined,
	field: string,
): Promise<Base64Image | undefined> {
	if (!input) return undefined;
	return Base64Image.fromFile(resolveInsideRepo(repoRoot, input, field));
}

function clientFrom(ctx: {
	env?: NodeJS.ProcessEnv;
	clients?: Record<string, unknown>;
}): PixelLabSdkClient {
	const injected = ctx.clients?.pixellab;
	if (injected) return injected as PixelLabSdkClient;
	return createClientFromEnv(ctx.env);
}

export const pixellabPixfluxProvider: ImageProvider = {
	id: "pixellab-pixflux",
	routes: createRouteSet(["/generate-image-pixflux"]),
	validate(raw: unknown): PixelLabBlueprint {
		return parseBlueprint(raw);
	},
	plan(request: unknown): ProviderPlan {
		const blueprint = request as PixelLabBlueprint;
		return {
			kind: "image_provider_plan",
			paid_call: false,
			provider: "pixellab-pixflux",
			route: "/generate-image-pixflux",
			estimated_usage: { type: "generations", generations: 1 },
			confirmation_required: "--confirm-paid",
		};
	},
	async generate(request: unknown, ctx: GenerateContext) {
		const blueprint = request as PixelLabBlueprint;
		const client = clientFrom(ctx);
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
			initImage: await optionalImage(ctx.repoRoot, blueprint.init_image, "init_image"),
			initImageStrength: blueprint.init_image_strength,
			colorImage: await optionalImage(ctx.repoRoot, blueprint.color_image, "color_image"),
			seed: blueprint.seed,
		};
		const response = await client.generateImagePixflux(params);
		return {
			bytes: response.image.toBuffer(),
			mime: "image/png" as const,
			usage: {
				type: response.usage.type,
				usd: response.usage.usd,
				generations: response.usage.generations,
			},
			providerIds: { api_base_url: PIXELLAB_SDK_API_BASE_URL },
		};
	},
	async balance(ctx) {
		return normalizeBalance(await clientFrom(ctx).getBalance());
	},
};
