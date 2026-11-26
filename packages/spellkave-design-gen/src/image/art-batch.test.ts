// A content author running an art manifest relies on skgen to expand entries
// into provider blueprints, stop at the balance floor, resume failures and
// record provenance. Free plans are scenarios in behaviour/image.feature.
// The compose case needs ffmpeg, which CI's Triton image lacks; it skips there.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runArtBatch } from "./art-batch.ts";
import { expandEntry, parseArtManifest, parsePromptTemplates } from "./art-manifest.ts";
import { createFakeImageProvider } from "./fake-image-provider.ts";
import { parseOpenAiImageBlueprint } from "./openai-image.ts";
import { parseBlueprint, planGeneration } from "./pixellab.ts";
import { solidPng } from "./pixellab-png.ts";
import { parseUiV2Blueprint } from "./pixellab-ui-v2.ts";
import { pixellabV2Provider } from "./pixellab-v2-provider.ts";

// Monorepo-root data the tests read (style packs, sample manifests, the
// PixelLab reference). Copied into test/repo-root; see PROVENANCE.md.
const REPO_FIXTURE = resolve(import.meta.dirname, "../../test/repo-root");

const PNG = Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+3MxZ5wAAAABJRU5ErkJggg==",
	"base64",
);

// See overlay-compose.test.ts: CI's Triton image intentionally has no ffmpeg.
const hasFfmpeg = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status === 0;

const PLACEHOLDER = JSON.parse(
	readFileSync(
		join(REPO_FIXTURE, "scripts/design-assets/prompt-templates.placeholder.json"),
		"utf8",
	),
);

function manifestDoc(outputRoot: string, entries = 2, floor = 0) {
	const list = Array.from({ length: entries }, (_, index) => ({
		id: `sprite-${index + 1}`,
		kind: "sprite",
		name: `Sprite ${index + 1}`,
		prompt_inputs: { subject: `subject ${index + 1}` },
		size: { width: 64, height: 64 },
		output_path: `packages/spellkave-ui/src/assets/batch/sprite-${index + 1}.webp`,
		target_attachment_ref: `batch/sprite-${index + 1}#art.image`,
	}));
	return {
		schema: "spellkave-art-manifest/v1",
		id: "batch-test",
		templates: "scripts/design-assets/prompt-templates.placeholder.json",
		provider: "pixellab-pixflux",
		balance_floor: { type: "generations", generations: floor },
		output_root: outputRoot,
		provenance: { license: "review required", source: "test" },
		entries: list,
	};
}

async function writeManifest(root: string, doc: unknown): Promise<string> {
	await mkdir(join(root, "scripts/design-assets"), { recursive: true });
	await writeFile(
		join(root, "scripts/design-assets/prompt-templates.placeholder.json"),
		JSON.stringify(PLACEHOLDER),
	);
	const path = join(root, "art-manifest.json");
	await writeFile(path, JSON.stringify(doc));
	return path;
}

describe("art-batch runner", () => {
	let root = "";
	afterEach(async () => {
		if (root) await rm(root, { recursive: true, force: true });
	});

	// keep(K1): manifest expansion over a pure function
	it("expands a manifest into per-kind blueprints from prompt templates", () => {
		const templates = parsePromptTemplates(PLACEHOLDER);
		const manifest = parseArtManifest(manifestDoc("pixellab-generations/batch"));
		const expanded = expandEntry(manifest, manifest.entries[0], templates);
		expect(expanded.provider).toBe("pixellab-pixflux");
		expect(expanded.blueprint.schema).toBe("spellkave-pixellab-blueprint/v1");
		expect(expanded.blueprint.provider).toBe("pixellab-pixflux");
		expect(String(expanded.blueprint.description)).toContain("Sprite 1");
		expect(String(expanded.blueprint.description)).toContain("subject 1");
		expect(expanded.blueprint.image_size).toEqual({ width: 64, height: 64 });
	});

	// keep(K1): blueprint parser defaults
	it("defaults provider on existing pixellab, ui-v2, and openai blueprints", () => {
		expect(
			parseBlueprint({
				schema: "spellkave-pixellab-blueprint/v1",
				id: "woven-test",
				description: "frame",
				image_size: { width: 64, height: 32 },
				output_directory: "pixellab-generations/test",
				output_filename: "button.png",
				provenance: { license: "review", source: "test" },
			}).provider,
		).toBe("pixellab-pixflux");
		expect(
			parseUiV2Blueprint({
				schema: "spellkave-pixellab-ui-v2-blueprint/v1",
				id: "woven-ui-test",
				description: "frame",
				image_size: { width: 192, height: 192 },
				output_directory: "pixellab-generations/test",
				output_filename: "button.png",
				no_background: true,
				provenance: { license: "review", source: "test" },
			}).provider,
		).toBe("pixellab-v2");
		expect(
			parseOpenAiImageBlueprint({
				schema: "spellkave-openai-image-blueprint/v1",
				id: "woven-test",
				job: "hero_scene",
				prompt: "scene",
				size: "1024x1024",
				quality: "high",
				output_directory: "openai-generations/test",
				output_filename: "candidate.png",
				require_tileability: false,
				provenance: { license: "review", source: "test" },
			}).provider,
		).toBe("openai-image");
	});

	// keep(K1): route registry cases
	it("lets a provider register extra routes without the runner knowing them", () => {
		expect(pixellabV2Provider.routes.has("/create-ui-asset")).toBe(true);
		pixellabV2Provider.routes.register("generate-with-style-v2");
		pixellabV2Provider.routes.register("create-character-v3");
		expect(pixellabV2Provider.routes.has("generate-with-style-v2")).toBe(true);
		expect(pixellabV2Provider.routes.list()).toContain("create-character-v3");
	});

	// open: needs a fake provider API and a base-URL override (sk-jay0.7.229.54)
	it("generates, converts, ingests, and writes provenance; rerun skips completed", async () => {
		root = await mkdtemp(join(tmpdir(), "spellkave-art-batch-"));
		const path = await writeManifest(root, manifestDoc("pixellab-generations/batch", 2, 0));
		const fake = createFakeImageProvider({ png: PNG, balances: [20] });
		const convert = async (png: Buffer) => Buffer.concat([Buffer.from("RIFF"), png]);
		const first = await runArtBatch(path, {
			repoRoot: root,
			confirmPaid: true,
			provider: fake,
			convertPngToWebp: convert,
		});
		expect(first.entries.map((entry) => entry.status)).toEqual(["completed", "completed"]);
		const ingested = join(root, "packages/spellkave-ui/src/assets/batch/sprite-1.webp");
		const sidecar = JSON.parse(await readFile(`${ingested}.json`, "utf8"));
		expect(sidecar.schema).toBe("spellkave-design-asset-provenance/v1");
		expect(sidecar.provider).toBe("pixellab-pixflux");
		expect(sidecar.target_attachment_ref).toBe("batch/sprite-1#art.image");
		expect(JSON.stringify(sidecar)).not.toContain("PIXELLAB_SECRET");
		const second = await runArtBatch(path, {
			repoRoot: root,
			confirmPaid: true,
			provider: fake,
			convertPngToWebp: convert,
		});
		expect(second.entries.map((entry) => entry.status)).toEqual(["skipped", "skipped"]);
		expect(second.entries[0].reason).toBe("completed");
	});

	// keep(K2): the failure is injected through a fake image provider
	it("resumes a failed entry and does not skip it", async () => {
		root = await mkdtemp(join(tmpdir(), "spellkave-art-batch-"));
		const path = await writeManifest(root, manifestDoc("pixellab-generations/batch", 1, 0));
		const failing = createFakeImageProvider({ png: PNG, failIds: ["sprite-1"] });
		await expect(
			runArtBatch(path, {
				repoRoot: root,
				confirmPaid: true,
				provider: failing,
				convertPngToWebp: async (png) => png,
			}),
		).rejects.toThrow("fake provider failed");
		const retry = createFakeImageProvider({ png: PNG, balances: [9] });
		const result = await runArtBatch(path, {
			repoRoot: root,
			confirmPaid: true,
			provider: retry,
			convertPngToWebp: async (png) => png,
		});
		expect(result.entries).toEqual([
			expect.objectContaining({ id: "sprite-1", status: "completed" }),
		]);
	});

	// open: needs a fake provider API and a base-URL override (sk-jay0.7.229.54)
	it("refuses a completed entry whose ingested hash no longer matches", async () => {
		root = await mkdtemp(join(tmpdir(), "spellkave-art-batch-"));
		const path = await writeManifest(root, manifestDoc("pixellab-generations/batch", 1, 0));
		const fake = createFakeImageProvider({ png: PNG, balances: [9] });
		await runArtBatch(path, {
			repoRoot: root,
			confirmPaid: true,
			provider: fake,
			convertPngToWebp: async (png) => png,
		});
		const ingested = join(root, "packages/spellkave-ui/src/assets/batch/sprite-1.webp");
		await writeFile(ingested, Buffer.from("tampered"));
		await expect(
			runArtBatch(path, {
				repoRoot: root,
				confirmPaid: true,
				provider: fake,
				convertPngToWebp: async (png) => png,
			}),
		).rejects.toThrow("hash mismatch");
	});

	// open: needs a fake provider API and a base-URL override (sk-jay0.7.229.54)
	it("stops before a paid call when remaining balance is at the floor", async () => {
		root = await mkdtemp(join(tmpdir(), "spellkave-art-batch-"));
		const path = await writeManifest(root, manifestDoc("pixellab-generations/batch", 2, 5));
		const fake = createFakeImageProvider({ png: PNG, balances: [5] });
		const events: string[] = [];
		const result = await runArtBatch(path, {
			repoRoot: root,
			confirmPaid: true,
			provider: fake,
			convertPngToWebp: async (png) => png,
			onEvent: (event) => {
				events.push(event.kind);
			},
		});
		expect(result.stopped_on_balance_floor).toBe(true);
		expect(result.entries.map((entry) => entry.status)).toEqual(["stopped", "stopped"]);
		expect(events).toContain("balance_floor_stop");
		expect(events).not.toContain("generation_completed");
	});
});

describe("existing blueprint plan still works", () => {
	// keep(K5): the committed scripts/design-assets example must keep planning
	it("plans the committed pixellab example without a provider field", async () => {
		const plan = await planGeneration(
			join(REPO_FIXTURE, "scripts/design-assets/woven-example.blueprint.json"),
			REPO_FIXTURE,
		);
		expect(plan.paid_call).toBe(false);
		expect(plan.route).toBe("/generate-image-pixflux");
	});
});

describe("pixellab-pixen provider and reduce-colors post-pass", () => {
	let root = "";
	afterEach(async () => {
		if (root) await rm(root, { recursive: true, force: true });
	});

	// keep(K5): the committed entity-art-v1 templates must keep parsing
	it("parses entity-art-v1 templates as pixellab-pixen", () => {
		const templates = parsePromptTemplates(
			JSON.parse(
				readFileSync(
					join(REPO_FIXTURE, ".impeccable/style-packs/entity-art-v1/prompt-templates.json"),
					"utf8",
				),
			),
		);
		expect(templates.kinds.creature?.provider).toBe("pixellab-pixen");
		expect(templates.boilerplate).toContain("Theme-neutral");
	});

	// open: `skgen image plan` on the entity-art manifest scenario not written yet
	it("plans pixen plus a reduce-colors post-pass from the style pack palette", async () => {
		const previews: Array<Record<string, unknown>> = [];
		const result = await runArtBatch(
			join(REPO_FIXTURE, "scripts/design-assets/entity-art-v1.sample.art-manifest.json"),
			{
				repoRoot: REPO_FIXTURE,
				onEvent: (event) => {
					if (event.kind === "cost_preview") previews.push(event);
				},
			},
		);
		expect(result.entries).toHaveLength(36);
		expect(result.entries.every((entry) => entry.status === "planned")).toBe(true);
		expect(previews.every((event) => event.provider === "pixellab-pixen")).toBe(true);
		expect(previews.every((event) => event.route === "/create-image-pixen")).toBe(true);
		const pass = previews[0]?.post_pass as { route?: string; palette?: string } | undefined;
		expect(pass?.route).toBe("/reduce-colors");
		expect(pass?.palette).toBe(".impeccable/style-packs/entity-art-v1/palette.png");
	});

	// open: needs a fake provider API and a base-URL override (sk-jay0.7.229.54)
	it("runs reduce-colors after pixen generate", async () => {
		root = await mkdtemp(join(tmpdir(), "spellkave-pixen-"));
		await mkdir(join(root, ".impeccable/style-packs/entity-art-v1"), { recursive: true });
		await writeFile(join(root, ".impeccable/style-packs/entity-art-v1/palette.png"), PNG);
		const templates = JSON.parse(
			readFileSync(
				join(REPO_FIXTURE, ".impeccable/style-packs/entity-art-v1/prompt-templates.json"),
				"utf8",
			),
		);
		await mkdir(join(root, ".impeccable/style-packs/entity-art-v1"), { recursive: true });
		await writeFile(
			join(root, ".impeccable/style-packs/entity-art-v1/prompt-templates.json"),
			JSON.stringify(templates),
		);
		await writeFile(
			join(root, ".impeccable/style-packs/entity-art-v1/manifest.json"),
			JSON.stringify({ schema: "spellkave-style-pack/v1", id: "entity-art-v1" }),
		);
		const doc = {
			schema: "spellkave-art-manifest/v1",
			id: "pixen-pass-test",
			style_pack: ".impeccable/style-packs/entity-art-v1/manifest.json",
			output_root: "pixellab-generations/pixen-pass",
			provenance: { license: "review", source: "test" },
			entries: [
				{
					id: "wolf",
					kind: "creature",
					name: "Wolf",
					prompt_inputs: { subject: "a wolf" },
					size: { width: 64, height: 64 },
					output_path: "packages/spellkave-ui/src/assets/batch/wolf.webp",
					target_attachment_ref: "batch/wolf#art.image",
				},
			],
		};
		const path = join(root, "art-manifest.json");
		await writeFile(path, JSON.stringify(doc));
		const routes: string[] = [];
		const fetchImpl: typeof fetch = async (input, init) => {
			const href = String(input);
			routes.push(`${init?.method ?? "GET"} ${href.replace(/.*\/v2/, "")}`);
			if (href.endsWith("/balance")) {
				return new Response(JSON.stringify({ subscription: { generations: 50 } }));
			}
			return new Response(
				JSON.stringify({
					image: { type: "base64", base64: PNG.toString("base64"), format: "png" },
					usage: { type: "generations", generations: href.includes("reduce-colors") ? 0.1 : 1 },
				}),
			);
		};
		const events: string[] = [];
		const result = await runArtBatch(path, {
			repoRoot: root,
			confirmPaid: true,
			fetchImpl,
			env: { PIXELLAB_SECRET: "test-only" },
			convertPngToWebp: async (png) => png,
			onEvent: (event) => {
				events.push(String(event.kind));
			},
		});
		expect(result.entries[0]?.status).toBe("completed");
		expect(routes.some((route) => route.includes("/create-image-pixen"))).toBe(true);
		expect(routes.some((route) => route.includes("/reduce-colors"))).toBe(true);
		expect(events).toContain("post_pass");
	});
});

describe("overlay compose", () => {
	let root = "";
	afterEach(async () => {
		if (root) await rm(root, { recursive: true, force: true });
	});

	// open: `skgen image plan` on an overlay manifest scenario not written yet
	it("plans family badges with cost and composed variants at 0 generations", async () => {
		root = await mkdtemp(join(tmpdir(), "spellkave-overlay-plan-"));
		await mkdir(join(root, ".impeccable/style-packs/entity-art-v1"), { recursive: true });
		await writeFile(
			join(root, ".impeccable/style-packs/entity-art-v1/prompt-templates.json"),
			readFileSync(
				join(REPO_FIXTURE, ".impeccable/style-packs/entity-art-v1/prompt-templates.json"),
			),
		);
		await writeFile(
			join(root, ".impeccable/style-packs/entity-art-v1/manifest.json"),
			JSON.stringify({ schema: "spellkave-style-pack/v1", id: "entity-art-v1" }),
		);
		const doc = {
			schema: "spellkave-art-manifest/v1",
			id: "overlay-plan",
			style_pack: ".impeccable/style-packs/entity-art-v1/manifest.json",
			output_root: "pixellab-generations/overlay-plan",
			provenance: { license: "review", source: "test" },
			overlay_badges: { "flame-tongue": "fire" },
			entries: [
				{
					id: "badge-fire",
					kind: "badge",
					name: "Fire",
					prompt_inputs: { descriptors: "single small pixel-art icon of a flame" },
					size: { width: 24, height: 24 },
					output_path: "pixellab-generations/overlay-plan/badge-fire.png",
					target_attachment_ref: "badge/fire#art.image",
				},
				{
					id: "item-longsword",
					kind: "item",
					name: "Longsword",
					prompt_inputs: { subject: "a longsword" },
					size: { width: 64, height: 64 },
					output_path: "pixellab-generations/overlay-plan/item-longsword.png",
					target_attachment_ref: "item/longsword#art.image",
				},
				{
					id: "item-flame-tongue-dagger",
					kind: "item",
					name: "Flame Tongue Dagger",
					prompt_inputs: { subject: "dagger" },
					size: { width: 64, height: 64 },
					output_path: "pixellab-generations/overlay-plan/item-flame-tongue-dagger.webp",
					target_attachment_ref: "item/flame-tongue-dagger#art.image",
					overlay_of: "item-longsword",
					overlay_template: "flame-tongue",
					overlay_badge: "fire",
				},
				{
					id: "item-flame-tongue-longsword",
					kind: "item",
					name: "Flame Tongue Longsword",
					prompt_inputs: { subject: "longsword" },
					size: { width: 64, height: 64 },
					output_path: "pixellab-generations/overlay-plan/item-flame-tongue-longsword.webp",
					target_attachment_ref: "item/flame-tongue-longsword#art.image",
					overlay_of: "item-longsword",
					overlay_template: "flame-tongue",
					overlay_badge: "fire",
				},
				{
					id: "item-shield",
					kind: "item",
					name: "Shield",
					prompt_inputs: { subject: "a shield" },
					size: { width: 64, height: 64 },
					output_path: "pixellab-generations/overlay-plan/item-shield.png",
					target_attachment_ref: "item/shield#art.image",
				},
				{
					id: "spell-shield",
					kind: "spell",
					name: "Shield",
					prompt_inputs: { subject: "a ward" },
					size: { width: 64, height: 64 },
					output_path: "pixellab-generations/overlay-plan/spell-shield.png",
					target_attachment_ref: "spell/shield#art.image",
				},
			],
		};
		const path = join(root, "art-manifest.json");
		await writeFile(path, JSON.stringify(doc));
		const previews: Array<Record<string, unknown>> = [];
		const result = await runArtBatch(path, {
			repoRoot: root,
			onEvent: (event) => {
				if (event.kind === "cost_preview") previews.push(event);
			},
		});
		expect(result.entries.map((entry) => entry.id)).toEqual([
			"badge-fire",
			"item-longsword",
			"item-shield",
			"spell-shield",
			"item-flame-tongue-dagger",
			"item-flame-tongue-longsword",
		]);
		expect(previews.filter((event) => event.route === "/create-image-pixen")).toHaveLength(4);
		const composed = previews.filter((event) => event.route === "compose-overlay");
		expect(composed).toHaveLength(2);
		expect(
			composed.every((event) => {
				const usage = event.estimated_usage;
				return Boolean(
					usage && typeof usage === "object" && "generations" in usage && usage.generations === 0,
				);
			}),
		).toBe(true);
		expect(result.entries.filter((entry) => entry.reason === "compose")).toHaveLength(2);
	});

	// open: `skgen image batch --compose-only` scenario not written yet (needs ffmpeg)
	it.skipIf(!hasFfmpeg)(
		"composites one badge per family and resumes completed compose",
		async () => {
			root = await mkdtemp(join(tmpdir(), "spellkave-overlay-run-"));
			await mkdir(join(root, ".impeccable/style-packs/entity-art-v1"), { recursive: true });
			await writeFile(
				join(root, ".impeccable/style-packs/entity-art-v1/prompt-templates.json"),
				readFileSync(
					join(REPO_FIXTURE, ".impeccable/style-packs/entity-art-v1/prompt-templates.json"),
				),
			);
			await writeFile(
				join(root, ".impeccable/style-packs/entity-art-v1/manifest.json"),
				JSON.stringify({ schema: "spellkave-style-pack/v1", id: "entity-art-v1" }),
			);
			await writeFile(join(root, ".impeccable/style-packs/entity-art-v1/palette.png"), PNG);
			const doc = {
				schema: "spellkave-art-manifest/v1",
				id: "overlay-run",
				style_pack: ".impeccable/style-packs/entity-art-v1/manifest.json",
				output_root: "pixellab-generations/overlay-run",
				provenance: { license: "review", source: "test" },
				overlay_badges: { "flame-tongue": "fire" },
				entries: [
					{
						id: "badge-fire",
						kind: "badge",
						name: "Fire",
						prompt_inputs: { descriptors: "single small pixel-art icon of a flame" },
						size: { width: 16, height: 16 },
						output_path: "out/badge-fire.png",
						target_attachment_ref: "badge/fire#art.image",
					},
					{
						id: "item-longsword",
						kind: "item",
						name: "Longsword",
						prompt_inputs: { subject: "a longsword" },
						size: { width: 32, height: 32 },
						output_path: "out/item-longsword.png",
						target_attachment_ref: "item/longsword#art.image",
					},
					{
						id: "item-flame-tongue-dagger",
						kind: "item",
						name: "Flame Tongue Dagger",
						prompt_inputs: { subject: "dagger" },
						size: { width: 32, height: 32 },
						output_path: "out/item-flame-tongue-dagger.webp",
						target_attachment_ref: "item/flame-tongue-dagger#art.image",
						overlay_of: "item-longsword",
						overlay_template: "flame-tongue",
						overlay_badge: "fire",
					},
				],
			};
			const path = join(root, "art-manifest.json");
			await writeFile(path, JSON.stringify(doc));
			let generates = 0;
			const fetchImpl: typeof fetch = async (input, init) => {
				const href = String(input);
				if (href.endsWith("/balance")) {
					return new Response(JSON.stringify({ subscription: { generations: 80 } }));
				}
				if (href.includes("/reduce-colors")) {
					const body = JSON.parse(String(init?.body ?? "{}")) as {
						images?: Array<{ base64?: string }>;
					};
					const b64 = body.images?.[0]?.base64 ?? solidPng("#c4a056", 16, 16).toString("base64");
					return new Response(
						JSON.stringify({
							image: { type: "base64", base64: b64, format: "png" },
							usage: { type: "generations", generations: 0.1 },
						}),
					);
				}
				if (init?.method === "POST" && href.includes("/create-image-pixen")) generates += 1;
				let width = 16;
				try {
					const body = JSON.parse(String(init?.body ?? "{}")) as {
						image_size?: { width?: number };
					};
					if (typeof body.image_size?.width === "number") width = body.image_size.width;
				} catch {
					width = 16;
				}
				const validPng = solidPng("#c4a056", width, width);
				return new Response(
					JSON.stringify({
						image: { type: "base64", base64: validPng.toString("base64"), format: "png" },
						usage: { type: "generations", generations: 1 },
					}),
				);
			};
			const first = await runArtBatch(path, {
				repoRoot: root,
				confirmPaid: true,
				fetchImpl,
				env: { PIXELLAB_SECRET: "test-only" },
				convertPngToWebp: async (png) => png,
			});
			expect(first.entries.map((entry) => entry.status)).toEqual([
				"completed",
				"completed",
				"completed",
			]);
			expect(first.entries[2]?.reason).toBe("compose");
			expect(generates).toBe(2);
			const sidecar = JSON.parse(
				await readFile(join(root, "out/item-flame-tongue-dagger.webp.json"), "utf8"),
			);
			expect(sidecar.provider).toBe("compose-overlay");
			expect(sidecar.overlay_template).toBe("flame-tongue");
			expect(sidecar.overlay_badge).toBe("fire");
			expect(sidecar.base_sha256).toBeTruthy();
			const second = await runArtBatch(path, {
				repoRoot: root,
				confirmPaid: true,
				fetchImpl,
				env: { PIXELLAB_SECRET: "test-only" },
				convertPngToWebp: async (png) => png,
			});
			expect(second.entries.every((entry) => entry.status === "skipped")).toBe(true);
			expect(generates).toBe(2);

			await rm(join(root, "pixellab-generations/overlay-run/batch-state.json"));
			await rm(join(root, "out/item-flame-tongue-dagger.webp"));
			await rm(join(root, "out/item-flame-tongue-dagger.webp.json"));
			const composeOnly = await runArtBatch(path, {
				repoRoot: root,
				confirmPaid: true,
				composeOnly: true,
				fetchImpl,
				env: { PIXELLAB_SECRET: "test-only" },
				convertPngToWebp: async (png) => png,
			});
			expect(composeOnly.entries).toHaveLength(1);
			expect(composeOnly.entries[0]?.reason).toBe("compose");
			expect(generates).toBe(2);
		},
	);
});
