// The files a scenario's workspace starts with: a prose manifest, or an art
// manifest and one blueprint per image provider. Each scenario gets its own
// temp directory and skgen runs in it, so whatever skgen writes lands there
// and nothing in the checkout changes. The shapes are the ones skgen's own
// parsers accept (src/text/manifest.ts, src/image/art-manifest.ts and the
// blueprint parsers); the Barbarian manifest is the committed fixture itself.
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const PKG = resolve(import.meta.dirname, "../..");
const REPO = resolve(PKG, "../..");

function put(root: string, path: string, content: unknown): void {
	mkdirSync(dirname(join(root, path)), { recursive: true });
	writeFileSync(
		join(root, path),
		typeof content === "string" ? content : `${JSON.stringify(content, null, 2)}\n`,
	);
}

export function barbarianManifest(root: string): void {
	copyFileSync(join(PKG, "fixtures/barbarian.prose-manifest.json"), join(root, "barbarian.json"));
}

const proseEntry = (
	id: string,
	display_name: string,
	prompt_id: string,
	core_traits: Record<string, string>,
	must_include: string[] = [],
) => ({
	id,
	display_name,
	prompt_id,
	model: "openai/gpt-4o-mini",
	core_traits,
	must_include,
	must_not: ["Source:"],
});

/** Two gear entries, plus the hand-written candidates the ingest scenarios hand back. */
export function gearManifest(root: string): void {
	put(root, "prose.json", {
		schema: "spellkave-prose-manifest/v1",
		output_dir: "out",
		entries: [
			proseEntry(
				"gear/backpack",
				"Backpack",
				"flavor-gear",
				{
					srd_text: "A backpack holds up to 30 pounds.",
				},
				["backpack"],
			),
			proseEntry("gear/chest", "Chest", "flavor-gear", { srd_text: "A sturdy chest." }, ["chest"]),
		],
	});
	put(root, "candidate.txt", "A sturdy backpack.\n");
	put(root, "pack.txt", "A pack for carrying things.\n");
}

export function singleEntryManifest(
	root: string,
	promptId: string,
	name: string,
	traits: Record<string, string>,
): void {
	put(root, "prose.json", {
		schema: "spellkave-prose-manifest/v1",
		output_dir: "out",
		entries: [proseEntry("entry/one", name, promptId, traits)],
	});
}

const PROVENANCE = { license: "review required", source: "Spellkave behaviour scenario" };

/** An art manifest with two sprites, and one blueprint per provider workflow. */
export function imageWorkspace(root: string): void {
	const templates = "scripts/design-assets/prompt-templates.placeholder.json";
	mkdirSync(join(root, dirname(templates)), { recursive: true });
	copyFileSync(join(REPO, templates), join(root, templates));
	const sprite = (n: number) => ({
		id: `sprite-${n}`,
		kind: "sprite",
		name: `Sprite ${n}`,
		prompt_inputs: { subject: `subject ${n}` },
		size: { width: 64, height: 64 },
		output_path: `assets/sprite-${n}.webp`,
		target_attachment_ref: `batch/sprite-${n}#art.image`,
	});
	put(root, "art.json", {
		schema: "spellkave-art-manifest/v1",
		id: "batch-test",
		templates,
		provider: "pixellab-pixflux",
		style_pack: "style-packs/test/manifest.json",
		balance_floor: { type: "generations", generations: 0 },
		output_root: "pixellab-generations/batch",
		provenance: PROVENANCE,
		entries: [sprite(1), sprite(2)],
	});
	put(root, "pixellab.json", {
		schema: "spellkave-pixellab-blueprint/v1",
		id: "woven-test",
		description: "One empty woven button frame; no text or watermark.",
		image_size: { width: 64, height: 32 },
		output_directory: "pixellab-generations/test",
		output_filename: "button.png",
		no_background: true,
		seed: 42,
		style_pack: "style-packs/test/manifest.json",
		provenance: PROVENANCE,
	});
	put(root, "pixellab-ui.json", {
		schema: "spellkave-pixellab-ui-v2-blueprint/v1",
		id: "woven-ui-test",
		description: "One empty woven button frame with square corners and no text.",
		image_size: { width: 512, height: 224 },
		output_directory: "pixellab-generations/test",
		output_filename: "button.png",
		style_image: "style.png",
		color_palette: "midnight blue, aged gold, warm cream",
		no_background: true,
		seed: 42,
		pieces: [{ id: "frame", kind: "rounded_rect", x: 0, y: 0, w: 512, h: 224, radius: 0 }],
		style_pack: "style-packs/test/manifest.json",
		provenance: PROVENANCE,
	});
	const openai = {
		schema: "spellkave-openai-image-blueprint/v1",
		id: "woven-test",
		job: "hero_scene",
		prompt: "Midnight jacquard cloth, aged gold stitch, no text.",
		size: "1024x1024",
		quality: "high",
		output_directory: "openai-generations/test",
		output_filename: "candidate.png",
		style_pack: "style-packs/test/manifest.json",
		require_tileability: false,
		provenance: PROVENANCE,
	};
	put(root, "openai.json", openai);
	put(root, "openai-bad-job.json", { ...openai, job: "button" });
}
