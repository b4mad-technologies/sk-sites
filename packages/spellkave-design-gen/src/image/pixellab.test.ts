// A content author running PixelLab v1 blueprints relies on skgen to refuse a bad
// blueprint before any paid call, to talk to the pinned SDK, and to keep a
// failed or reviewed run safe to resume or ingest. Plans are scenarios in
// behaviour/image.feature; the paid paths here wait for a fake PixelLab API.
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Base64Image, PixelLabClient } from "@pixellab-code/pixellab";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	createClientFromEnv,
	ingestGeneration,
	type PixelLabSdkClient,
	parseBlueprint,
	runGeneration,
} from "./pixellab.ts";
import { ENTITY_ART_ROUTE_PATHS } from "./pixellab-openapi.ts";
import { checkReference, refreshReference } from "./pixellab-reference.ts";

// Monorepo-root data the tests read (style packs, sample manifests, the
// PixelLab reference). Copied into test/repo-root; see PROVENANCE.md.
const REPO_FIXTURE = resolve(import.meta.dirname, "../../test/repo-root");

const PNG = Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+3MxZ5wAAAABJRU5ErkJggg==",
	"base64",
);

function blueprint(outputDirectory: string) {
	return {
		schema: "spellkave-pixellab-blueprint/v1",
		id: "woven-test",
		description: "One empty woven button frame; no text or watermark.",
		image_size: { width: 64, height: 32 },
		output_directory: outputDirectory,
		output_filename: "button.png",
		no_background: true,
		seed: 42,
		style_pack: ".impeccable/style-packs/woven-v1/manifest.json",
		provenance: { license: "review required", source: "Spellkave test" },
	};
}

describe("PixelLab design tooling", () => {
	let root = "";
	afterEach(async () => {
		if (root) await rm(root, { recursive: true, force: true });
	});

	// keep(K1): blueprint parser rule cases
	it("validates the paid request before any API call", () => {
		expect(parseBlueprint(blueprint("pixellab-generations/test"))).toMatchObject({
			id: "woven-test",
			image_size: { width: 64, height: 32 },
		});
		expect(() => parseBlueprint({ ...blueprint("../outside"), id: "Bad ID" })).toThrow("lowercase");
	});

	// keep(K5): pins the official SDK client and its base URL
	it("constructs the pinned official SDK client from environment-only credentials", () => {
		const client = createClientFromEnv({ PIXELLAB_SECRET: "test-only-secret" });
		expect(client).toBeInstanceOf(PixelLabClient);
		expect(client.baseUrl).toBe("https://api.pixellab.ai/v1");
	});

	// keep(K5): pins the patched SDK's parse of the PixFlux answer
	it("accepts subscription generation usage from the official PixFlux route", async () => {
		const server = createServer((_request, response) => {
			response.writeHead(200, { "content-type": "application/json" });
			response.end(
				JSON.stringify({
					image: { type: "base64", base64: PNG.toString("base64"), format: "png" },
					usage: { type: "generations", generations: 1 },
				}),
			);
		});
		await new Promise<void>((resolve, reject) => {
			server.once("error", reject);
			server.listen(0, "127.0.0.1", resolve);
		});
		try {
			const address = server.address();
			if (!address || typeof address === "string") throw new Error("test server has no TCP port");
			const client = new PixelLabClient("test-only-secret", `http://127.0.0.1:${address.port}`);
			const result = await client.generateImagePixflux({
				description: "One empty woven button frame.",
				imageSize: { width: 64, height: 32 },
			});
			expect(result.usage).toEqual({ type: "generations", generations: 1 });
		} finally {
			await new Promise<void>((resolve, reject) => {
				server.close((error) => (error ? reject(error) : resolve()));
			});
		}
	});

	// open: needs a fake provider API and a base-URL override (sk-jay0.7.229.54)
	it("emits cost and balance before the SDK call and writes provenance", async () => {
		root = await mkdtemp(join(tmpdir(), "spellkave-pixellab-"));
		const blueprintPath = join(root, "blueprint.json");
		await writeFile(blueprintPath, JSON.stringify(blueprint("pixellab-generations/test")));
		const events: string[] = [];
		const client: PixelLabSdkClient = {
			getBalance: vi.fn(async () => ({ type: "usd", usd: 9 })),
			generateImagePixflux: vi.fn(async () => {
				events.push("sdk_called");
				return {
					image: Base64Image.fromBuffer(PNG),
					usage: { type: "usd" as const, usd: 0.01 },
				};
			}),
		};
		await runGeneration(blueprintPath, {
			repoRoot: root,
			confirmPaid: true,
			client,
			now: () => new Date("2026-08-24T20:00:00Z"),
			onEvent: (event) => {
				events.push(event.kind);
			},
		});
		expect(events).toEqual([
			"cost_preview",
			"balance",
			"generation_started",
			"sdk_called",
			"generation_completed",
		]);
		const manifest = JSON.parse(
			await readFile(join(root, "pixellab-generations/test/manifest.json"), "utf8"),
		);
		expect(manifest).toMatchObject({
			status: "completed",
			sdk: {
				package: "@pixellab-code/pixellab",
				version: "1.0.2",
				patch: "patches/@pixellab-code__pixellab@1.0.2.patch",
			},
			request: { description: expect.stringContaining("woven button"), seed: 42 },
			usage: { type: "usd", usd: 0.01 },
			output: { path: "button.png", dimensions: [64, 32] },
		});
		expect(JSON.stringify(manifest)).not.toContain("PIXELLAB_SECRET");
	});

	// open: needs a fake provider API and a base-URL override (sk-jay0.7.229.54)
	it("keeps a failed run resumable and refuses mismatched reuse", async () => {
		root = await mkdtemp(join(tmpdir(), "spellkave-pixellab-"));
		const blueprintPath = join(root, "blueprint.json");
		await writeFile(blueprintPath, JSON.stringify(blueprint("pixellab-generations/test")));
		const failing: PixelLabSdkClient = {
			getBalance: async () => ({ type: "usd", usd: 9 }),
			generateImagePixflux: async () => {
				throw new Error("provider unavailable");
			},
		};
		await expect(
			runGeneration(blueprintPath, { repoRoot: root, confirmPaid: true, client: failing }),
		).rejects.toThrow("provider unavailable");
		const failed = JSON.parse(
			await readFile(join(root, "pixellab-generations/test/manifest.json"), "utf8"),
		);
		expect(failed.status).toBe("failed");
		await expect(
			runGeneration(blueprintPath, { repoRoot: root, confirmPaid: true, client: failing }),
		).rejects.toThrow("pass --resume");
	});

	// open: needs a fake provider API and a base-URL override (sk-jay0.7.229.54)
	it("ingests only a reviewed, hash-matching asset below the UI asset root", async () => {
		root = await mkdtemp(join(tmpdir(), "spellkave-pixellab-"));
		const blueprintPath = join(root, "blueprint.json");
		await writeFile(blueprintPath, JSON.stringify(blueprint("pixellab-generations/test")));
		const client: PixelLabSdkClient = {
			getBalance: async () => ({ type: "usd", usd: 9 }),
			generateImagePixflux: async () => ({
				image: Base64Image.fromBuffer(PNG),
				usage: { type: "usd", usd: 0.01 },
			}),
		};
		const manifestPath = join(root, "pixellab-generations/test/manifest.json");
		await runGeneration(blueprintPath, { repoRoot: root, confirmPaid: true, client });
		const dryRun = await ingestGeneration(
			manifestPath,
			"packages/spellkave-ui/src/assets/woven-ui/button.png",
			{ repoRoot: root },
		);
		expect(dryRun.confirmation_required).toBe("--confirm-reviewed");
		await ingestGeneration(manifestPath, "packages/spellkave-ui/src/assets/woven-ui/button.png", {
			repoRoot: root,
			confirmReviewed: true,
		});
		expect(
			await readFile(join(root, "packages/spellkave-ui/src/assets/woven-ui/button.png")),
		).toEqual(PNG);
		await expect(
			ingestGeneration(manifestPath, "outside/button.png", { repoRoot: root }),
		).rejects.toThrow("must be below");
	});

	// open: `skgen image pixellab reference check` scenario not written yet
	it("checks the committed reference hash without network access", async () => {
		const result = await checkReference(REPO_FIXTURE);
		expect(result).toMatchObject({ kind: "pixellab_reference_check", upstream_matches: null });
	});

	// keep(K2): the refresh reaches the network only through an injected fetch
	it("refreshes and then verifies the reference through an injected fetch", async () => {
		root = await mkdtemp(join(tmpdir(), "spellkave-pixellab-reference-"));
		await mkdir(join(root, "docs/references"), { recursive: true });
		const paths = Object.fromEntries(
			ENTITY_ART_ROUTE_PATHS.map((path) => [
				path,
				{ post: { summary: path, responses: { "200": {} } } },
			]),
		);
		const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
			const href = String(input);
			if (href.includes("llms.txt")) return new Response("# Pixel Lab API\n");
			if (href.includes("openapi.json")) {
				return new Response(
					JSON.stringify({
						openapi: "3.1.0",
						info: { title: "Pixel Lab API", version: "dev" },
						paths,
						components: { schemas: {} },
					}),
				);
			}
			throw new Error(`unexpected fetch ${href}`);
		});
		await refreshReference(root, {
			fetchImpl,
			now: () => new Date("2026-08-24T20:00:00Z"),
		});
		await expect(checkReference(root)).resolves.toMatchObject({
			kind: "pixellab_reference_check",
			upstream_matches: null,
		});
		expect(fetchImpl).toHaveBeenCalledTimes(2);
	});
});
