import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
	PIXELLAB_SDK_API_BASE_URL,
	PIXELLAB_SDK_PACKAGE,
	PIXELLAB_SDK_VERSION,
	PIXELLAB_V2_REFERENCE_URL,
} from "./pixellab.ts";
import { checkOpenApiExtract, refreshOpenApiExtract } from "./pixellab-openapi.ts";

export const REFERENCE_PATH = "docs/references/pixellab-api-v2.llms.txt";
export const REFERENCE_METADATA_PATH = "docs/references/pixellab-api-v2.llms.json";

function sha256(value: string): string {
	return createHash("sha256").update(value).digest("hex");
}

export async function checkReference(
	repoRoot: string,
	options: { remote?: boolean; fetchImpl?: typeof fetch } = {},
): Promise<Record<string, unknown>> {
	const snapshot = await readFile(resolve(repoRoot, REFERENCE_PATH), "utf8");
	const metadata = JSON.parse(await readFile(resolve(repoRoot, REFERENCE_METADATA_PATH), "utf8"));
	const actualHash = sha256(snapshot);
	if (metadata.sha256 !== actualHash) throw new Error("PixelLab reference checksum drifted");

	let upstreamMatches: boolean | null = null;
	if (options.remote) {
		const response = await (options.fetchImpl ?? fetch)(PIXELLAB_V2_REFERENCE_URL);
		if (!response.ok)
			throw new Error(`PixelLab reference fetch failed with HTTP ${response.status}`);
		upstreamMatches = (await response.text()) === snapshot;
		if (!upstreamMatches)
			throw new Error("PixelLab v2 reference changed upstream; run reference refresh");
	}
	return {
		kind: "pixellab_reference_check",
		path: REFERENCE_PATH,
		sha256: actualHash,
		upstream_matches: upstreamMatches,
		openapi: await checkOpenApiExtract(repoRoot),
	};
}

export async function refreshReference(
	repoRoot: string,
	options: { fetchImpl?: typeof fetch; now?: () => Date } = {},
): Promise<Record<string, unknown>> {
	const response = await (options.fetchImpl ?? fetch)(PIXELLAB_V2_REFERENCE_URL);
	if (!response.ok) throw new Error(`PixelLab reference fetch failed with HTTP ${response.status}`);
	const snapshot = await response.text();
	const hash = sha256(snapshot);
	const metadata = {
		schema: "spellkave-external-reference/v1",
		source: PIXELLAB_V2_REFERENCE_URL,
		fetched_at: (options.now ?? (() => new Date()))().toISOString(),
		sha256: hash,
		sdk: {
			package: PIXELLAB_SDK_PACKAGE,
			version: PIXELLAB_SDK_VERSION,
			api_base_url: PIXELLAB_SDK_API_BASE_URL,
			compatibility:
				"The SDK currently targets its documented v1 contract; this v2 snapshot is the extension and drift reference.",
		},
	};
	await writeFile(resolve(repoRoot, REFERENCE_PATH), snapshot, "utf8");
	await writeFile(
		resolve(repoRoot, REFERENCE_METADATA_PATH),
		`${JSON.stringify(metadata, null, 2)}\n`,
		"utf8",
	);
	const openapi = await refreshOpenApiExtract(repoRoot, options);
	return { kind: "pixellab_reference_refresh", path: REFERENCE_PATH, sha256: hash, openapi };
}
