import { isAbsolute, relative, resolve } from "node:path";

export const PROVIDER_IDS = [
	"pixellab-pixflux",
	"pixellab-v2",
	"pixellab-pixen",
	"openai-image",
] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

export const PIXELLAB_BLUEPRINT_SCHEMA = "spellkave-pixellab-blueprint/v1";
export const PIXELLAB_UI_V2_BLUEPRINT_SCHEMA = "spellkave-pixellab-ui-v2-blueprint/v1";
export const OPENAI_IMAGE_BLUEPRINT_SCHEMA = "spellkave-openai-image-blueprint/v1";
export const PIXELLAB_PIXEN_BLUEPRINT_SCHEMA = "spellkave-pixellab-entity-art-blueprint/v1";

export const SCHEMA_DEFAULT_PROVIDER = {
	[PIXELLAB_BLUEPRINT_SCHEMA]: "pixellab-pixflux",
	[PIXELLAB_UI_V2_BLUEPRINT_SCHEMA]: "pixellab-v2",
	[PIXELLAB_PIXEN_BLUEPRINT_SCHEMA]: "pixellab-pixen",
	[OPENAI_IMAGE_BLUEPRINT_SCHEMA]: "openai-image",
} as const satisfies Record<string, ProviderId>;

export type JsonRecord = Record<string, unknown>;

export interface ImageUsage {
	type: string;
	usd?: number | null;
	generations?: number | null;
	tokens?: number | null;
	jobs?: number | null;
}

export interface ImageBalance {
	remaining: number | null;
	unit: string;
	raw: unknown;
}

export interface GenerateResult {
	bytes: Buffer;
	mime: "image/png";
	usage: ImageUsage;
	providerIds: Record<string, string>;
}

export interface ProviderPlan {
	kind: "image_provider_plan";
	paid_call: false;
	provider: ProviderId;
	route: string;
	estimated_usage: ImageUsage;
	confirmation_required: "--confirm-paid";
}

export interface GenerateContext {
	repoRoot: string;
	env?: NodeJS.ProcessEnv;
	fetchImpl?: typeof fetch;
	sleep?: (milliseconds: number) => Promise<void>;
	pollIntervalMs?: number;
	maxPolls?: number;
	clients?: Record<string, unknown>;
}

export interface BalanceContext {
	env?: NodeJS.ProcessEnv;
	fetchImpl?: typeof fetch;
	clients?: Record<string, unknown>;
}

export interface RouteSet {
	readonly builtin: readonly string[];
	list(): string[];
	register(name: string): void;
	has(name: string): boolean;
}

/**
 * Extra route names a provider can advertise without the batch runner switching
 * on them. Audit-lane candidates (generate-with-style-v2, create-character-v3)
 * register here.
 */
export function createRouteSet(builtin: readonly string[]): RouteSet {
	const extra: string[] = [];
	return {
		builtin,
		list() {
			return [...builtin, ...extra];
		},
		register(name: string) {
			if (name.trim() === "") throw new Error("route name must be non-empty");
			if (!builtin.includes(name) && !extra.includes(name)) extra.push(name);
		},
		has(name: string) {
			return builtin.includes(name) || extra.includes(name);
		},
	};
}

export interface ImageProvider {
	readonly id: ProviderId;
	readonly routes: RouteSet;
	validate(raw: unknown): unknown;
	plan(request: unknown, ctx: { repoRoot: string; blueprintPath?: string }): ProviderPlan;
	generate(request: unknown, ctx: GenerateContext): Promise<GenerateResult>;
	balance(ctx: BalanceContext): Promise<ImageBalance>;
}

const registry = new Map<ProviderId, ImageProvider>();

export function registerProvider(provider: ImageProvider): void {
	registry.set(provider.id, provider);
}

export function getProvider(id: ProviderId): ImageProvider {
	const provider = registry.get(id);
	if (!provider) throw new Error(`unknown image provider: ${id}`);
	return provider;
}

export function isProviderId(value: string): value is ProviderId {
	return (PROVIDER_IDS as readonly string[]).includes(value);
}

export function parseProviderId(value: unknown, field = "provider"): ProviderId {
	if (typeof value !== "string" || !isProviderId(value)) {
		throw new Error(`${field} must be one of: ${PROVIDER_IDS.join(", ")}`);
	}
	return value;
}

export function resolveBlueprintProvider(schema: string, value: unknown): ProviderId {
	const expected = (SCHEMA_DEFAULT_PROVIDER as Record<string, ProviderId | undefined>)[schema];
	if (!expected) throw new Error(`no default provider for schema ${schema}`);
	if (value === undefined) return expected;
	const provider = parseProviderId(value);
	if (provider !== expected) {
		throw new Error(`schema ${schema} requires provider ${expected}`);
	}
	return expected;
}

export function isRecord(value: unknown): value is JsonRecord {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function resolveInsideRepo(repoRoot: string, input: string, field: string): string {
	const root = resolve(repoRoot);
	const candidate = resolve(root, input);
	const rel = relative(root, candidate);
	if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) return candidate;
	throw new Error(`${field} must remain inside the repository`);
}

export function normalizeBalance(raw: unknown, fallbackUnit = "generations"): ImageBalance {
	if (!isRecord(raw)) return { remaining: null, unit: fallbackUnit, raw };
	if (typeof raw.generations === "number") {
		return { remaining: raw.generations, unit: "generations", raw };
	}
	if (typeof raw.usd === "number") {
		return { remaining: raw.usd, unit: "usd", raw };
	}
	if (isRecord(raw.subscription) && typeof raw.subscription.generations === "number") {
		return { remaining: raw.subscription.generations, unit: "generations", raw };
	}
	if (isRecord(raw.credits) && typeof raw.credits.usd === "number") {
		return { remaining: raw.credits.usd, unit: "usd", raw };
	}
	return { remaining: null, unit: fallbackUnit, raw };
}
