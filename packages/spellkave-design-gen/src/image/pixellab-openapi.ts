import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PIXELLAB_V2_OPENAPI_URL } from "./pixellab.ts";

export const ENTITY_ART_ROUTE_PATHS = [
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
] as const;

export const OPENAPI_EXTRACT_PATH = "docs/references/pixellab-openapi-v2.entity-art.json";
export const OPENAPI_METADATA_PATH =
	"docs/references/pixellab-openapi-v2.entity-art.json.meta.json";

type Json = Record<string, unknown>;

function isRecord(value: unknown): value is Json {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sha256(value: string): string {
	return createHash("sha256").update(value).digest("hex");
}

function collectRefs(node: unknown, acc: Set<string>): Set<string> {
	if (!node || typeof node !== "object") return acc;
	if (Array.isArray(node)) {
		for (const item of node) collectRefs(item, acc);
		return acc;
	}
	const record = node as Json;
	if (typeof record.$ref === "string" && record.$ref.startsWith("#/components/schemas/")) {
		acc.add(record.$ref.slice("#/components/schemas/".length));
	}
	for (const value of Object.values(record)) collectRefs(value, acc);
	return acc;
}

export function extractEntityArtOpenApi(spec: unknown): Json {
	if (!isRecord(spec) || !isRecord(spec.paths) || !isRecord(spec.components)) {
		throw new Error("PixelLab OpenAPI document is missing paths or components");
	}
	const components = isRecord(spec.components.schemas) ? spec.components.schemas : {};
	const paths: Json = {};
	const names = new Set<string>();
	for (const path of ENTITY_ART_ROUTE_PATHS) {
		const item = spec.paths[path];
		if (!isRecord(item) || !isRecord(item.post)) {
			throw new Error(`PixelLab OpenAPI is missing POST ${path}`);
		}
		paths[path] = item;
		collectRefs(item, names);
	}
	const pending = [...names];
	while (pending.length > 0) {
		const name = pending.pop() as string;
		const schema = components[name];
		if (!schema) throw new Error(`PixelLab OpenAPI is missing schema ${name}`);
		for (const nested of collectRefs(schema, new Set())) {
			if (!names.has(nested)) {
				names.add(nested);
				pending.push(nested);
			}
		}
	}
	const schemas: Json = {};
	for (const name of [...names].sort()) {
		schemas[name] = components[name];
	}
	const info = isRecord(spec.info) ? spec.info : {};
	return {
		openapi: spec.openapi,
		info: { title: info.title ?? "Pixel Lab API", version: info.version ?? "unknown" },
		source: PIXELLAB_V2_OPENAPI_URL,
		paths,
		components: { schemas },
	};
}

export async function checkOpenApiExtract(repoRoot: string): Promise<Record<string, unknown>> {
	const snapshot = await readFile(resolve(repoRoot, OPENAPI_EXTRACT_PATH), "utf8");
	const metadata = JSON.parse(await readFile(resolve(repoRoot, OPENAPI_METADATA_PATH), "utf8"));
	const actualHash = sha256(snapshot);
	if (metadata.sha256 !== actualHash)
		throw new Error("PixelLab OpenAPI entity-art checksum drifted");
	return {
		kind: "pixellab_openapi_entity_art_check",
		path: OPENAPI_EXTRACT_PATH,
		sha256: actualHash,
		routes: ENTITY_ART_ROUTE_PATHS,
	};
}

export async function refreshOpenApiExtract(
	repoRoot: string,
	options: { fetchImpl?: typeof fetch; now?: () => Date } = {},
): Promise<Record<string, unknown>> {
	const response = await (options.fetchImpl ?? fetch)(PIXELLAB_V2_OPENAPI_URL);
	if (!response.ok) throw new Error(`PixelLab OpenAPI fetch failed with HTTP ${response.status}`);
	const spec: unknown = JSON.parse(await response.text());
	const extract = extractEntityArtOpenApi(spec);
	const snapshot = `${JSON.stringify(extract, null, "\t")}\n`;
	const hash = sha256(snapshot);
	const metadata = {
		schema: "spellkave-external-reference/v1",
		source: PIXELLAB_V2_OPENAPI_URL,
		fetched_at: (options.now ?? (() => new Date()))().toISOString(),
		sha256: hash,
		routes: ENTITY_ART_ROUTE_PATHS,
	};
	await writeFile(resolve(repoRoot, OPENAPI_EXTRACT_PATH), snapshot, "utf8");
	await writeFile(
		resolve(repoRoot, OPENAPI_METADATA_PATH),
		`${JSON.stringify(metadata, null, "\t")}\n`,
		"utf8",
	);
	return { kind: "pixellab_openapi_entity_art_refresh", path: OPENAPI_EXTRACT_PATH, sha256: hash };
}
