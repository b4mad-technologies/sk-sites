import {
	createRouteSet,
	type GenerateContext,
	type ImageBalance,
	type ImageProvider,
	type ImageUsage,
	type ProviderPlan,
} from "./image-provider.ts";

export interface FakeImageProviderOptions {
	png: Buffer;
	usage?: ImageUsage;
	balances?: number[];
	failIds?: string[];
	unit?: string;
}

/**
 * Test double: no network, deterministic bytes, scripted remaining balance.
 */
export function createFakeImageProvider(options: FakeImageProviderOptions): ImageProvider {
	const balances = [...(options.balances ?? [100])];
	const failIds = new Set(options.failIds ?? []);
	const unit = options.unit ?? "generations";
	const usage: ImageUsage = options.usage ?? { type: unit, generations: 1 };

	function currentBalance(): ImageBalance {
		const remaining = balances[0] ?? 0;
		return { remaining, unit, raw: { [unit]: remaining } };
	}

	return {
		id: "pixellab-pixflux",
		routes: createRouteSet(["/fake"]),
		validate(raw: unknown) {
			return raw;
		},
		plan(): ProviderPlan {
			return {
				kind: "image_provider_plan",
				paid_call: false,
				provider: "pixellab-pixflux",
				route: "/fake",
				estimated_usage: usage,
				confirmation_required: "--confirm-paid",
			};
		},
		async generate(request: unknown, _ctx: GenerateContext) {
			const id =
				typeof request === "object" &&
				request !== null &&
				"id" in request &&
				typeof (request as { id: unknown }).id === "string"
					? (request as { id: string }).id
					: "unknown";
			if (failIds.has(id)) throw new Error(`fake provider failed for ${id}`);
			if (balances.length > 1) balances.shift();
			else if (balances[0] !== undefined) balances[0] = Math.max(0, balances[0] - 1);
			return {
				bytes: options.png,
				mime: "image/png" as const,
				usage,
				providerIds: { fake: "1" },
			};
		},
		async balance() {
			return currentBalance();
		},
	};
}
