import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { type PixelLabV2Options, remainingGenerations } from "./pixellab-entity-art.ts";
import { paletteStripPng } from "./pixellab-png.ts";
import { FIRST_PARTY_ART_LICENSE } from "./art-manifest.ts";

const API_BASE_URL = "https://api.pixellab.ai/v2";
const PACK_DIR = ".impeccable/style-packs/entity-art-v1";
const PILOT_ROOT = ".impeccable/mocks/pixellab/entity-art-v1";
const PALETTE = ["#2a2d28", "#e6dcc0", "#c4a056", "#5f7a58", "#b85a42"] as const;
const SEED = 20260916;

type Json = Record<string, unknown>;

function isRecord(value: unknown): value is Json {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sha256(value: Buffer | string): string {
	return createHash("sha256").update(value).digest("hex");
}

function secretFromEnv(env: NodeJS.ProcessEnv): string {
	const secret = env.PIXELLAB_SECRET ?? env.PIXELLAB_API_KEY;
	if (!secret) throw new Error("PIXELLAB_SECRET is required for a live PixelLab v2 call");
	return secret;
}

export type PromptTemplates = {
	boilerplate: string;
	kinds: Record<
		string,
		{
			description: string;
			defaults?: { outline?: string; detail?: string; view?: string; direction?: string };
		}
	>;
};

export function fillTemplate(template: string, vars: Record<string, string>): string {
	return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => vars[key] ?? "");
}

export const ENTITY_ART_PILOT = [
	{
		id: "goblin-warrior",
		kind: "creature",
		size: 96,
		name: "Goblin Warrior",
		descriptors: "Small humanoid goblin, leather armor, crude spear, aggressive stance",
	},
	{
		id: "wolf",
		kind: "creature",
		size: 96,
		name: "Wolf",
		descriptors: "Medium beast, grey-brown fur, four legs, alert snarl",
	},
	{
		id: "skeleton",
		kind: "creature",
		size: 96,
		name: "Skeleton",
		descriptors: "Medium undead, bone body, rusted shortsword, hollow eyes",
	},
	{
		id: "ogre",
		kind: "creature",
		size: 96,
		name: "Ogre",
		descriptors: "Large giant, hunched, club, ragged hide clothes",
	},
	{
		id: "giant-spider",
		kind: "creature",
		size: 96,
		name: "Giant Spider",
		descriptors: "Large beast, eight legs, bristled abdomen, no rider",
	},
	{
		id: "adult-red-dragon",
		kind: "creature",
		size: 96,
		name: "Adult Red Dragon",
		descriptors:
			"Huge dragon, wings folded for a sprite, horns, smoke at jaws, still readable at 96",
	},
	{
		id: "longsword",
		kind: "item",
		size: 64,
		name: "Longsword",
		descriptors:
			"Martial melee weapon, steel blade, leather grip, simple crossguard, material steel",
	},
	{
		id: "longsword-plus-1",
		kind: "item",
		size: 64,
		name: "Longsword +1",
		descriptors:
			"Martial melee weapon, same longsword shape with a muted gold fuller, magic weapon variant, no numerals",
	},
	{
		id: "shield",
		kind: "item",
		size: 64,
		name: "Shield",
		descriptors: "Wood and iron heater shield, item only, no emblem letters",
	},
	{
		id: "torch",
		kind: "item",
		size: 64,
		name: "Torch",
		descriptors: "Wooden stave, wrapped cloth, small flame, adventuring gear",
	},
	{
		id: "potion-of-healing",
		kind: "item",
		size: 64,
		name: "Potion of Healing",
		descriptors: "Small corked flask, red liquid, glass, no label text",
	},
	{
		id: "rope",
		kind: "item",
		size: 64,
		name: "Rope",
		descriptors: "Coiled hemp rope, adventuring gear, no knots as letters",
	},
	{
		id: "fireball",
		kind: "spell",
		size: 64,
		name: "Fireball",
		descriptors: "Evocation, fire damage, round flame burst, 3rd-level spell glyph",
	},
	{
		id: "magic-missile",
		kind: "spell",
		size: 64,
		name: "Magic Missile",
		descriptors: "Evocation, force damage, three darts of light, 1st-level spell glyph",
	},
	{
		id: "cure-wounds",
		kind: "spell",
		size: 64,
		name: "Cure Wounds",
		descriptors: "Evocation, healing, warm gold-green light, 1st-level spell glyph",
	},
	{
		id: "shield-spell",
		kind: "spell",
		size: 64,
		name: "Shield",
		descriptors:
			"Abjuration, a flat hexagonal force pane hovering, 1st-level spell glyph, not a wooden shield and not an explosion",
	},
	{
		id: "alert",
		kind: "feat",
		size: 64,
		name: "Alert",
		descriptors: "Feat glyph, open eye and watch, readiness, no face",
	},
	{
		id: "tough",
		kind: "feat",
		size: 64,
		name: "Tough",
		descriptors: "Feat glyph, knotted heart of oak, endurance, no anatomy study",
	},
	{
		id: "fighter-emblem",
		kind: "class_emblem",
		size: 96,
		name: "Fighter",
		descriptors: "Class emblem, heater shield and crossed sword, martial, no letters",
	},
	{
		id: "wizard-emblem",
		kind: "class_emblem",
		size: 96,
		name: "Wizard",
		descriptors: "Class emblem, pointed hat and starburst, arcane, no letters",
	},
	{
		id: "renn",
		kind: "person",
		size: 96,
		name: "Renn the Roadwarden",
		descriptors: "Human roadwarden, travel cloak, hood, walking staff, weathered",
	},
	{
		id: "mira",
		kind: "person",
		size: 96,
		name: "Mira",
		descriptors: "Elven scout, short cloak, bow unstrung at back, alert stance",
	},
	{
		id: "aldwin",
		kind: "person",
		size: 96,
		name: "Aldwin",
		descriptors: "Older human scholar, worn robe, satchel, lantern at belt",
	},
	{
		id: "cellar-rat",
		kind: "creature",
		size: 64,
		name: "Cellar Rat",
		descriptors: "Tiny beast, brown rat, low to the ground, no rider",
	},
] as const;

export async function loadPromptTemplates(repoRoot: string): Promise<PromptTemplates> {
	const path = resolve(repoRoot, PACK_DIR, "prompt-templates.json");
	const value: unknown = JSON.parse(await readFile(path, "utf8"));
	if (!isRecord(value) || !isRecord(value.kinds) || typeof value.boilerplate !== "string") {
		throw new Error("entity-art-v1 prompt-templates.json is missing kinds or boilerplate");
	}
	return value as PromptTemplates;
}

export function renderPilotPrompt(
	templates: PromptTemplates,
	subject: (typeof ENTITY_ART_PILOT)[number],
): string {
	const kind = templates.kinds[subject.kind];
	if (!kind) throw new Error(`no prompt template for kind ${subject.kind}`);
	return fillTemplate(kind.description, {
		name: subject.name,
		descriptors: subject.descriptors,
		boilerplate: templates.boilerplate,
	});
}

async function providerJson(
	fetchImpl: typeof fetch,
	secret: string,
	path: string,
	init: RequestInit = {},
): Promise<Json> {
	const response = await fetchImpl(`${API_BASE_URL}${path}`, {
		...init,
		headers: {
			accept: "application/json",
			authorization: `Bearer ${secret}`,
			...(init.body ? { "content-type": "application/json" } : {}),
		},
	});
	const text = await response.text();
	let value: unknown;
	try {
		value = JSON.parse(text);
	} catch {
		throw new Error(`PixelLab ${path} returned HTTP ${response.status} with invalid JSON`);
	}
	if (!response.ok) {
		throw new Error(
			`PixelLab ${path} returned HTTP ${response.status}: ${JSON.stringify(value).slice(0, 400)}`,
		);
	}
	if (!isRecord(value)) throw new Error(`PixelLab ${path} returned a non-object`);
	return value;
}

function imageFromBody(body: Json): Buffer {
	const candidates: unknown[] = [body.image];
	if (Array.isArray(body.images)) candidates.push(body.images[0]);
	for (const candidate of candidates) {
		if (isRecord(candidate) && typeof candidate.base64 === "string") {
			return Buffer.from(
				String(candidate.base64).replace(/^data:image\/\w+;base64,/, ""),
				"base64",
			);
		}
	}
	throw new Error("PixelLab response had no image");
}

async function writeJson(path: string, value: unknown): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, `${JSON.stringify(value, null, "\t")}\n`, "utf8");
}

export async function writeEntityArtPackAssets(repoRoot: string): Promise<Json> {
	const palette = paletteStripPng(PALETTE);
	const palettePath = resolve(repoRoot, PACK_DIR, "palette.png");
	await mkdir(dirname(palettePath), { recursive: true });
	await writeFile(palettePath, palette);
	return {
		kind: "entity_art_pack_assets",
		palette: relative(repoRoot, palettePath),
		sha256: sha256(palette),
	};
}

export function planEntityArtPilot(): Json {
	return {
		kind: "pixellab_entity_art_pilot_plan",
		paid_call: false,
		route: "/create-image-pixen",
		palette_pass: "/reduce-colors",
		seed: SEED,
		subjects: ENTITY_ART_PILOT.length,
		estimated_usage: {
			pixen: ENTITY_ART_PILOT.length,
			reduce_colors: ENTITY_ART_PILOT.length * 0.1,
		},
		confirmation_required: "--confirm-paid",
	};
}

export async function runEntityArtPilot(options: PixelLabV2Options): Promise<Json> {
	const plan = planEntityArtPilot();
	await options.onEvent?.(plan);
	if (!options.confirmPaid) return plan;

	const repoRoot = resolve(options.repoRoot);
	await writeEntityArtPackAssets(repoRoot);
	const templates = await loadPromptTemplates(repoRoot);
	const palettePng = await readFile(resolve(repoRoot, PACK_DIR, "palette.png"));
	const fetchImpl = options.fetchImpl ?? fetch;
	const secret = secretFromEnv(options.env ?? process.env);
	const before = await providerJson(fetchImpl, secret, "/balance");
	const outputs: Json[] = [];

	for (const subject of ENTITY_ART_PILOT) {
		const kindDir = resolve(repoRoot, PILOT_ROOT, subject.kind);
		const pngPath = resolve(kindDir, `${subject.id}.png`);
		const blueprintPath = resolve(kindDir, `${subject.id}.blueprint.json`);
		const description = renderPilotPrompt(templates, subject);
		const blueprint = {
			schema: "spellkave-pixellab-entity-art-blueprint/v1",
			id: `entity-art-v1-${subject.id}`,
			kind: subject.kind,
			description,
			image_size: { width: subject.size, height: subject.size },
			no_background: true,
			seed: SEED,
			outline: "selective outline",
			detail: "medium detail",
			output_directory: `${PILOT_ROOT}/${subject.kind}`,
			output_filename: `${subject.id}.png`,
			style_pack: `${PACK_DIR}/manifest.json`,
			provenance: {
				license: FIRST_PARTY_ART_LICENSE,
				source: "sk-jay0.3.5.4 entity-art-v1 pilot",
			},
		};
		await writeJson(blueprintPath, blueprint);
		try {
			await access(pngPath);
			outputs.push({
				id: subject.id,
				kind: subject.kind,
				path: relative(repoRoot, pngPath),
				skipped: true,
			});
			await options.onEvent?.({ kind: "pilot_skipped", id: subject.id });
			continue;
		} catch {
			/* generate */
		}
		try {
			const pixen = await providerJson(fetchImpl, secret, "/create-image-pixen", {
				method: "POST",
				body: JSON.stringify({
					description,
					image_size: { width: subject.size, height: subject.size },
					no_background: true,
					seed: SEED,
					outline: "selective outline",
					detail: "medium detail",
				}),
			});
			const raw = imageFromBody(pixen);
			const quantized = await providerJson(fetchImpl, secret, "/reduce-colors", {
				method: "POST",
				body: JSON.stringify({
					images: [{ type: "base64", base64: raw.toString("base64"), format: "png" }],
					palette_image: { type: "base64", base64: palettePng.toString("base64"), format: "png" },
					dithering: "none",
				}),
			});
			const png = imageFromBody(quantized);
			await mkdir(kindDir, { recursive: true });
			await writeFile(pngPath, png);
			outputs.push({
				id: subject.id,
				kind: subject.kind,
				path: relative(repoRoot, pngPath),
				sha256: sha256(png),
				pixen_usage: pixen.usage ?? null,
				reduce_usage: quantized.usage ?? null,
			});
			await options.onEvent?.({ kind: "pilot_generated", id: subject.id });
		} catch (error) {
			outputs.push({
				id: subject.id,
				kind: subject.kind,
				error: error instanceof Error ? error.message : "pilot generation failed",
			});
			await options.onEvent?.({ kind: "pilot_failed", id: subject.id });
		}
	}

	const after = await providerJson(fetchImpl, secret, "/balance");
	const summary = {
		kind: "pixellab_entity_art_pilot_run",
		status: "completed",
		balance_before: before,
		balance_after: after,
		measured_cost_generations:
			remainingGenerations(before) !== null && remainingGenerations(after) !== null
				? (remainingGenerations(before) as number) - (remainingGenerations(after) as number)
				: null,
		outputs,
	};
	await writeJson(resolve(repoRoot, PILOT_ROOT, "run-summary.json"), summary);
	return summary;
}

function ffmpegSheet(inputs: string[], output: string, cell: number): void {
	if (inputs.length === 0) throw new Error("contact sheet needs images");
	const args: string[] = ["-y"];
	for (const input of inputs) args.push("-i", input);
	const scaled = inputs
		.map(
			(_file, index) =>
				`[${index}]scale=iw*3:ih*3:flags=neighbor,pad=${cell}:${cell}:(ow-iw)/2:(oh-ih)/2:color=0x00000000[s${index}]`,
		)
		.join(";");
	const cols = inputs.length;
	const layout = inputs
		.map((_file, index) => {
			const x = (index % cols) * cell;
			const y = Math.floor(index / cols) * cell;
			return `${x}_${y}`;
		})
		.join("|");
	const stack = `${inputs.map((_file, index) => `[s${index}]`).join("")}xstack=inputs=${inputs.length}:layout=${layout}:fill=0x00000000[out]`;
	args.push("-filter_complex", `${scaled};${stack}`, "-map", "[out]", "-frames:v", "1", output);
	const result = spawnSync("ffmpeg", args, { encoding: "utf8" });
	if (result.status !== 0) throw new Error(result.stderr || "ffmpeg contact sheet failed");
}

export async function writeEntityArtSheets(repoRoot: string): Promise<Json> {
	const root = resolve(repoRoot);
	const sheetsDir = resolve(root, PACK_DIR, "sheets");
	await mkdir(sheetsDir, { recursive: true });
	const kinds = [...new Set(ENTITY_ART_PILOT.map((subject) => subject.kind))];
	const sheets: Json[] = [];
	for (const kind of kinds) {
		const members = ENTITY_ART_PILOT.filter((subject) => subject.kind === kind);
		const files = members.map((subject) => resolve(root, PILOT_ROOT, kind, `${subject.id}.png`));
		const cell = Math.max(...members.map((subject) => subject.size)) * 3;
		const output = resolve(sheetsDir, `${kind}.png`);
		ffmpegSheet(files, output, cell);
		const buffer = await readFile(output);
		sheets.push({
			path: relative(root, output),
			sha256: sha256(buffer),
			role: `${kind} Bitforge style-sheet input`,
			kind,
		});
	}
	const manifestPath = resolve(root, PACK_DIR, "manifest.json");
	const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Json;
	manifest.references = [
		{
			path: `${PACK_DIR}/palette.png`,
			sha256: sha256(await readFile(resolve(root, PACK_DIR, "palette.png"))),
			role: "reduce-colors palette",
			provenance: "Theme-neutral pack swatches",
		},
		...sheets,
	];
	await writeJson(manifestPath, manifest);
	return { kind: "entity_art_sheets", sheets };
}
