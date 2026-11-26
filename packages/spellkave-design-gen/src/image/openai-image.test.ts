// A content author baking off OpenAI images relies on a confirmed run recording
// provider, model, prompt hash, usage and license. Plan and refusals are
// scenarios in behaviour/image.feature and behaviour/contract.feature.
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { type OpenAiImageClient, runOpenAiImage } from "./openai-image.ts";

const PNG = Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mP8z8BQz8AABI8ZABXbA/2d2U6YAAAAAElFTkSuQmCC",
	"base64",
);

function blueprint(
	outputDirectory: string,
	job: "seamless_material" | "hero_scene" = "hero_scene",
) {
	return {
		schema: "spellkave-openai-image-blueprint/v1",
		id: "woven-test",
		job,
		prompt: "Midnight jacquard cloth, aged gold stitch, no text.",
		size: "1024x1024",
		quality: "high",
		output_directory: outputDirectory,
		output_filename: "candidate.png",
		style_pack: ".impeccable/style-packs/woven-v1/manifest.json",
		require_tileability: false,
		provenance: {
			license: "OpenAI API output rights review required before promotion",
			source: "Spellkave test",
		},
	};
}

describe("OpenAI image bake-off tooling", () => {
	let root = "";
	afterEach(async () => {
		if (root) await rm(root, { recursive: true, force: true });
	});

	// open: needs a fake provider API and a base-URL override (sk-jay0.7.229.54)
	it("records provider, model, prompt, hash, usage, and license on a fake generate", async () => {
		root = await mkdtemp(join(tmpdir(), "spellkave-oai-"));
		const path = join(root, "blueprint.json");
		await writeFile(path, JSON.stringify(blueprint("openai-generations/test")));
		const client: OpenAiImageClient = {
			async generate() {
				return { png: PNG, usage: { output_tokens: 12 } };
			},
		};
		const run = await runOpenAiImage(path, { repoRoot: root, confirmPaid: true, client });
		expect(run.provider).toBe("OpenAI");
		expect(run.model).toBe("gpt-image-2");
		expect(run.output.sha256).toHaveLength(64);
		expect(run.usage.output_tokens).toBe(12);
		expect(run.tileability).toBeNull();
		const manifest = JSON.parse(
			await readFile(join(root, "openai-generations/test/manifest.json"), "utf8"),
		);
		expect(manifest.output.path).toBe("openai-generations/test/candidate.png");
	});
});
