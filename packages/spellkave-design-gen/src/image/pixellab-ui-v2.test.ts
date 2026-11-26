// A content author generating PixelLab v2 UI assets relies on skgen to refuse
// a blueprint the provider would reject and to make exactly one paid job per
// asset, resumable. The free plan is a scenario in behaviour/image.feature.
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseUiV2Blueprint, runUiV2Generation } from "./pixellab-ui-v2.ts";

const PNG = Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+3MxZ5wAAAABJRU5ErkJggg==",
	"base64",
);

function blueprint(outputDirectory: string) {
	return {
		schema: "spellkave-pixellab-ui-v2-blueprint/v1",
		id: "woven-ui-test",
		description: "One empty woven button frame with square corners and no text.",
		image_size: { width: 512, height: 224 },
		output_directory: outputDirectory,
		output_filename: "button.png",
		style_image: "style.png",
		color_palette: "midnight blue, aged gold, warm cream",
		no_background: true,
		seed: 42,
		pieces: [{ id: "frame", kind: "rounded_rect", x: 0, y: 0, w: 512, h: 224, radius: 0 }],
		style_pack: ".impeccable/style-packs/woven-v1/manifest.json",
		provenance: { license: "review required", source: "Spellkave test" },
	};
}

describe("PixelLab v2 UI asset tooling", () => {
	let root = "";
	afterEach(async () => {
		if (root) await rm(root, { recursive: true, force: true });
	});

	// keep(K1): blueprint parser rule cases
	it("validates the v2 dimensions, shape, and provider-supported style format", () => {
		expect(parseUiV2Blueprint(blueprint("pixellab-generations/test"))).toMatchObject({
			image_size: { width: 512, height: 224 },
			pieces: [{ kind: "rounded_rect", radius: 0 }],
		});
		expect(() =>
			parseUiV2Blueprint({ ...blueprint("pixellab-generations/test"), style_image: "style.webp" }),
		).toThrow("PNG or JPEG");
		expect(() =>
			parseUiV2Blueprint({ ...blueprint("pixellab-generations/test"), no_background: "yes" }),
		).toThrow("must be a boolean");
	});

	// open: needs a fake provider API and a base-URL override (sk-jay0.7.229.54)
	it("submits, polls, downloads, and records a resumable hash-addressed run", async () => {
		root = await mkdtemp(join(tmpdir(), "spellkave-pixellab-ui-v2-"));
		const blueprintPath = join(root, "blueprint.json");
		await writeFile(blueprintPath, JSON.stringify(blueprint("pixellab-generations/test")));
		await writeFile(join(root, "style.png"), PNG);
		const calls: string[] = [];
		const fetchImpl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
			const url = String(input);
			calls.push(`${init?.method ?? "GET"} ${url}`);
			if (url.endsWith("/balance")) {
				return Response.json({
					credits: { type: "usd", usd: 0 },
					subscription: { type: "generations", generations: 99, total: 100 },
				});
			}
			if (url.endsWith("/create-ui-asset")) {
				const request = JSON.parse(String(init?.body));
				expect(request.style_image.base64).toBe(PNG.toString("base64"));
				expect(init?.headers).toMatchObject({ authorization: "Bearer test-only-secret" });
				return Response.json(
					{
						background_job_id: "job-1",
						ui_asset_id: "asset-1",
						status: "processing",
						usage: { type: "generations", generations: 20 },
					},
					{ status: 202 },
				);
			}
			if (url.endsWith("/ui-assets/asset-1")) {
				return Response.json({
					id: "asset-1",
					prompt: "woven",
					size: { width: 512, height: 224 },
					status: "completed",
					image_url: "https://cdn.example.test/button.png",
					created_at: "2026-08-25T10:00:00Z",
				});
			}
			if (url.endsWith("/background-jobs/job-1")) {
				return Response.json({
					id: "job-1",
					status: "completed",
					created_at: "2026-08-25T10:00:00Z",
					usage: { type: "generations", generations: 20 },
				});
			}
			if (url === "https://cdn.example.test/button.png") {
				return new Response(PNG, { status: 200, headers: { "content-type": "image/png" } });
			}
			return Response.json({ error: "unexpected test URL" }, { status: 500 });
		}) as typeof fetch;

		const result = await runUiV2Generation(blueprintPath, {
			repoRoot: root,
			confirmPaid: true,
			env: { PIXELLAB_SECRET: "test-only-secret" },
			fetchImpl,
			sleep: async () => undefined,
			now: () => new Date("2026-08-25T10:00:00Z"),
		});
		expect(calls).toContain("POST https://api.pixellab.ai/v2/create-ui-asset");
		expect(result).toMatchObject({
			status: "completed",
			background_job_id: "job-1",
			ui_asset_id: "asset-1",
			usage: { type: "generations", generations: 20 },
			output: { path: "button.png", dimensions: [512, 224] },
		});
		const manifest = await readFile(join(root, "pixellab-generations/test/manifest.json"), "utf8");
		expect(manifest).not.toContain("test-only-secret");
		expect(manifest).not.toContain(PNG.toString("base64"));
	});

	// open: needs a fake provider API and a base-URL override (sk-jay0.7.229.54)
	it("resumes the recorded provider asset without submitting a second paid job", async () => {
		root = await mkdtemp(join(tmpdir(), "spellkave-pixellab-ui-v2-"));
		const blueprintPath = join(root, "blueprint.json");
		await writeFile(blueprintPath, JSON.stringify(blueprint("pixellab-generations/resume")));
		await writeFile(join(root, "style.png"), PNG);
		let providerFailed = true;
		let submissions = 0;
		const fetchImpl = vi.fn(async (input: string | URL | Request) => {
			const url = String(input);
			if (url.endsWith("/balance")) {
				return Response.json({ credits: { type: "usd", usd: 0 }, subscription: {} });
			}
			if (url.endsWith("/create-ui-asset")) {
				submissions += 1;
				return Response.json(
					{ background_job_id: "job-resume", ui_asset_id: "asset-resume" },
					{ status: 202 },
				);
			}
			if (url.endsWith("/ui-assets/asset-resume")) {
				return Response.json({
					id: "asset-resume",
					prompt: "woven",
					size: { width: 512, height: 224 },
					status: providerFailed ? "failed" : "completed",
					image_url: providerFailed ? null : "https://cdn.example.test/resumed.png",
					created_at: "2026-08-25T10:00:00Z",
				});
			}
			if (url === "https://cdn.example.test/resumed.png") return new Response(PNG);
			if (url.endsWith("/background-jobs/job-resume")) {
				return Response.json({
					id: "job-resume",
					status: "completed",
					created_at: "2026-08-25T10:00:00Z",
					usage: { type: "generations", generations: 25 },
				});
			}
			return Response.json({ error: "unexpected test URL" }, { status: 500 });
		}) as typeof fetch;

		await expect(
			runUiV2Generation(blueprintPath, {
				repoRoot: root,
				confirmPaid: true,
				env: { PIXELLAB_SECRET: "test-only-secret" },
				fetchImpl,
				sleep: async () => undefined,
			}),
		).rejects.toThrow("job failed");
		providerFailed = false;
		await expect(
			runUiV2Generation(blueprintPath, {
				repoRoot: root,
				confirmPaid: true,
				resume: true,
				env: { PIXELLAB_SECRET: "test-only-secret" },
				fetchImpl,
				sleep: async () => undefined,
			}),
		).resolves.toMatchObject({ status: "completed", attempt: 2 });
		expect(submissions).toBe(1);
	});
});
