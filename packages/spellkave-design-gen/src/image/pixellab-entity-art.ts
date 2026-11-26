import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { normalizeBalance } from "./image-provider.ts";
import { ENTITY_ART_ROUTE_PATHS } from "./pixellab-openapi.ts";
import { paletteStripPng, pngSize, solidPng } from "./pixellab-png.ts";
import { FIRST_PARTY_ART_LICENSE } from "./art-manifest.ts";

const API_BASE_URL = "https://api.pixellab.ai/v2";
const AUDIT_DIR = "pixellab-generations/entity-art-audit";
const PROPOSAL_ROOT = ".impeccable/mocks/pixellab/style-proposals";
const STYLE_PACK_ROOT = ".impeccable/style-packs";

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

export type PixelLabV2Options = {
	repoRoot: string;
	confirmPaid?: boolean;
	env?: NodeJS.ProcessEnv;
	fetchImpl?: typeof fetch;
	sleep?: (milliseconds: number) => Promise<void>;
	pollIntervalMs?: number;
	maxPolls?: number;
	now?: () => Date;
	onEvent?: (event: Json) => void | Promise<void>;
};

export const THEME_DIRECTIONS = [
	{
		id: "living-grammar-woven",
		theme_id: "living-grammar",
		world: "Woven / Living Grammar",
		background: "#0d1830",
		palette: ["#0d1830", "#efe6cf", "#d3a342", "#6e8b67", "#d46b54"],
		materials:
			"midnight jacquard, aged gold thread, cream stitch highlights, woven cloth rather than metal",
		negative: "no glossy chrome, no Celtic knotwork, no photorealism, no letters, no watermark",
	},
	{
		id: "loom-paper-chronicle",
		theme_id: "loom-paper",
		world: "Chronicle / Loom Paper",
		background: "#eee4c8",
		palette: ["#eee4c8", "#1c1a15", "#a5452d", "#6f8d61", "#8d2b1d"],
		materials: "rag paper, iron-gall ink line, rust stamp, pressed-map pigment, dry pigment edges",
		negative: "no neon, no glossy metal, no photorealism, no letters, no watermark",
	},
	{
		id: "worlds-in-motion-board",
		theme_id: "worlds-in-motion",
		world: "Board / Worlds in Motion",
		background: "#0f110e",
		palette: ["#0f110e", "#ebe5d2", "#e7a936", "#6f7f5c", "#d8583b"],
		materials:
			"blackened station enamel, amber split-flap lettering as color only, brass hairlines, aged route paper",
		negative: "no transport logos, no readable type, no photorealism, no watermark",
	},
	{
		id: "theme-neutral",
		theme_id: "neutral",
		world: "Theme-neutral",
		background: "#6a6458",
		palette: ["#2a2d28", "#e6dcc0", "#c4a056", "#5f7a58", "#b85a42"],
		materials:
			"mid-contrast cream, charcoal, muted gold, forest, rust; readable on dark jacquard, rag paper, and enamel",
		negative: "no extreme black or white fills, no photorealism, no letters, no watermark",
	},
] as const;

export const PROBE_SUBJECTS = [
	{
		id: "goblin-warrior",
		kind: "monster",
		label: "Goblin Warrior",
		prompt:
			"A small goblin warrior in stitched leather armor, crude spear, south-facing game sprite, full body, centered",
	},
	{
		id: "renn-the-roadwarden",
		kind: "person",
		label: "Renn the Roadwarden",
		prompt:
			"A weathered human roadwarden in a travel cloak and hood, walking staff, south-facing portrait sprite, full body, centered",
	},
	{
		id: "longsword",
		kind: "weapon",
		label: "longsword",
		prompt:
			"A single longsword, simple crossguard, leather-wrapped grip, item icon, centered, no wielder",
	},
	{
		id: "potion-of-healing",
		kind: "potion",
		label: "Potion of Healing",
		prompt:
			"A small round potion flask of red healing liquid with a cork, item icon, centered, no text",
	},
	{
		id: "fireball",
		kind: "spell",
		label: "Fireball",
		prompt:
			"A compact fireball spell burst, round flame with sparks, VFX icon, centered, no caster",
	},
	{
		id: "fighter-emblem",
		kind: "emblem",
		label: "Fighter emblem",
		prompt:
			"A class emblem of a heater shield with a crossed sword, geometric badge, centered, no letters",
	},
] as const;

function base64Image(png: Buffer): Json {
	return { type: "base64", base64: png.toString("base64"), format: "png" };
}

async function providerJson(
	fetchImpl: typeof fetch,
	secret: string,
	path: string,
	init: RequestInit = {},
): Promise<{ status: number; body: Json }> {
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
		const detail = isRecord(value) ? JSON.stringify(value).slice(0, 400) : text.slice(0, 400);
		throw new Error(`PixelLab ${path} returned HTTP ${response.status}: ${detail}`);
	}
	if (!isRecord(value)) throw new Error(`PixelLab ${path} returned a non-object response`);
	return { status: response.status, body: value };
}

export function remainingGenerations(balance: unknown): number | null {
	return normalizeBalance(balance).remaining;
}

function usageGenerations(usage: unknown): number | null {
	if (!isRecord(usage)) return null;
	if (usage.type === "generations" && typeof usage.generations === "number")
		return usage.generations;
	if (typeof usage.generations === "number") return usage.generations;
	return null;
}

async function writeJson(path: string, value: unknown): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, `${JSON.stringify(value, null, "\t")}\n`, "utf8");
}

function saveImageFromBody(body: Json, outputPath: string): Promise<string | null> {
	const candidates: unknown[] = [body.image];
	if (Array.isArray(body.images)) candidates.push(body.images[0]);
	if (isRecord(body.last_response)) {
		candidates.push(body.last_response.image);
		if (Array.isArray(body.last_response.images)) candidates.push(body.last_response.images[0]);
	}
	for (const candidate of candidates) {
		if (isRecord(candidate) && typeof candidate.base64 === "string") {
			const png = Buffer.from(candidate.base64.replace(/^data:image\/\w+;base64,/, ""), "base64");
			return writeFile(outputPath, png).then(() => outputPath);
		}
	}
	return Promise.resolve(null);
}

async function pollJob(
	fetchImpl: typeof fetch,
	secret: string,
	jobId: string,
	options: PixelLabV2Options,
): Promise<Json> {
	const sleep =
		options.sleep ?? ((ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms)));
	const maxPolls = options.maxPolls ?? 180;
	for (let poll = 0; poll < maxPolls; poll += 1) {
		const { body } = await providerJson(
			fetchImpl,
			secret,
			`/background-jobs/${encodeURIComponent(jobId)}`,
		);
		const status = String(body.status ?? "");
		if (status === "completed") return body;
		if (status === "failed") throw new Error(`PixelLab job ${jobId} failed`);
		await sleep(options.pollIntervalMs ?? 5_000);
	}
	throw new Error(`PixelLab job ${jobId} timed out`);
}

export function planEntityArtAudit(): Json {
	return {
		kind: "pixellab_entity_art_audit_plan",
		paid_call: false,
		api_base_url: API_BASE_URL,
		routes: ENTITY_ART_ROUTE_PATHS,
		output_directory: AUDIT_DIR,
		confirmation_required: "--confirm-paid",
		note: "Each listed route is called once. Balance is read before and after that call.",
	};
}

async function probePng(): Promise<Buffer> {
	return paletteStripPng(["#0d1830", "#efe6cf", "#d3a342", "#6e8b67", "#d46b54"], 16);
}

async function styleProbePng(): Promise<Buffer> {
	return solidPng("#d3a342", 64, 64);
}

function buildAuditBody(route: string, sourcePng: Buffer, stylePng: Buffer): Json {
	const size = { width: 64, height: 64 };
	const description = "A tiny pixel-art goblin warrior facing south, no text, no watermark.";
	const image = base64Image(sourcePng);
	switch (route) {
		case "/create-image-pixflux":
			return { description, image_size: size, no_background: true, seed: 20260907 };
		case "/create-image-pixen":
			return {
				description,
				image_size: size,
				no_background: true,
				seed: 20260907,
				outline: "selective outline",
				detail: "medium detail",
			};
		case "/create-image-bitforge":
			return {
				description,
				image_size: { width: 64, height: 64 },
				no_background: true,
				seed: 20260907,
				style_image: base64Image(stylePng),
				style_strength: 50,
			};
		case "/generate-with-style-v2": {
			const { width, height } = pngSize(stylePng);
			return {
				description,
				no_background: true,
				seed: 20260907,
				style_images: [{ image: base64Image(stylePng), width, height }],
				style_description: "16-bit RPG pixel art, selective outline, muted gold and midnight cloth",
			};
		}
		case "/create-character-v3":
			return {
				description,
				image_size: { width: 32, height: 32 },
				name: "sk-jay03516-audit-v3",
				no_background: true,
				seed: 20260907,
			};
		case "/create-character-with-8-directions":
			return {
				description,
				image_size: { width: 32, height: 32 },
				seed: 20260907,
			};
		case "/enhance-pixen-prompt":
			return { description, image_size: size, no_background: true };
		case "/image-to-pixelart":
			return { image, image_size: pngSize(sourcePng), output_size: size, fixer: true };
		case "/reduce-colors":
			return { images: [image], num_colors: 8, dithering: "none" };
		case "/remove-background":
			return { image, image_size: pngSize(sourcePng) };
		default:
			throw new Error(`unsupported audit route ${route}`);
	}
}

export async function runEntityArtAudit(options: PixelLabV2Options): Promise<Json> {
	const plan = planEntityArtAudit();
	await options.onEvent?.(plan);
	if (!options.confirmPaid) return plan;

	const repoRoot = resolve(options.repoRoot);
	const outDir = resolve(repoRoot, AUDIT_DIR);
	await mkdir(outDir, { recursive: true });
	const fetchImpl = options.fetchImpl ?? fetch;
	const secret = secretFromEnv(options.env ?? process.env);
	const sourcePng = await probePng();
	const stylePng = await styleProbePng();
	await writeFile(resolve(outDir, "probe-palette.png"), sourcePng);
	await writeFile(resolve(outDir, "probe-style.png"), stylePng);

	const { body: opening } = await providerJson(fetchImpl, secret, "/balance");
	const rows: Json[] = [];
	for (const path of ENTITY_ART_ROUTE_PATHS) {
		const { body: before } = await providerJson(fetchImpl, secret, "/balance");
		const started = (options.now ?? (() => new Date()))().toISOString();
		let row: Json = {
			route: path,
			sync: ![
				"/generate-with-style-v2",
				"/create-character-v3",
				"/create-character-with-8-directions",
			].includes(path),
			started_at: started,
			balance_before: before,
			generations_before: remainingGenerations(before),
		};
		try {
			await options.onEvent?.({ kind: "audit_route_started", route: path });
			const { status, body } = await providerJson(fetchImpl, secret, path, {
				method: "POST",
				body: JSON.stringify(buildAuditBody(path, sourcePng, stylePng)),
			});
			row = { ...row, http_status: status, submit: publicBody(body) };
			const jobId = typeof body.background_job_id === "string" ? body.background_job_id : undefined;
			if (jobId) {
				const job = await pollJob(fetchImpl, secret, jobId, options);
				row = { ...row, job: publicBody(job), usage: job.usage ?? body.usage ?? null };
				await saveImageFromBody(job, resolve(outDir, `${path.slice(1)}.png`));
			} else {
				row = { ...row, usage: body.usage ?? null };
				if (path === "/enhance-pixen-prompt") {
					await writeJson(resolve(outDir, "enhance-pixen-prompt.json"), body);
				} else {
					await saveImageFromBody(body, resolve(outDir, `${path.slice(1)}.png`));
				}
			}
		} catch (error) {
			row = {
				...row,
				error: error instanceof Error ? error.message : "PixelLab audit call failed",
			};
		}
		const { body: after } = await providerJson(fetchImpl, secret, "/balance");
		const beforeN = remainingGenerations(before);
		const afterN = remainingGenerations(after);
		row = {
			...row,
			balance_after: after,
			generations_after: afterN,
			measured_cost_generations:
				beforeN !== null && afterN !== null ? beforeN - afterN : usageGenerations(row.usage),
			finished_at: (options.now ?? (() => new Date()))().toISOString(),
		};
		rows.push(row);
		await options.onEvent?.({
			kind: "audit_route_finished",
			route: path,
			measured_cost_generations: row.measured_cost_generations,
		});
	}
	const { body: closing } = await providerJson(fetchImpl, secret, "/balance");
	const summary = {
		kind: "pixellab_entity_art_audit",
		status: "completed",
		api_base_url: API_BASE_URL,
		balance_before: opening,
		balance_after: closing,
		measured_cost_generations_total:
			remainingGenerations(opening) !== null && remainingGenerations(closing) !== null
				? (remainingGenerations(opening) as number) - (remainingGenerations(closing) as number)
				: null,
		routes: rows,
	};
	await writeJson(resolve(outDir, "summary.json"), summary);
	return summary;
}

function publicBody(body: Json): Json {
	const copy: Json = { ...body };
	if (isRecord(copy.image) && typeof copy.image.base64 === "string") {
		copy.image = {
			type: "base64",
			format: copy.image.format ?? "png",
			sha256: sha256(copy.image.base64),
		};
	}
	if (Array.isArray(copy.images)) {
		copy.images = copy.images.map((image) =>
			isRecord(image) && typeof image.base64 === "string"
				? { type: "base64", format: image.format ?? "png", sha256: sha256(image.base64) }
				: image,
		);
	}
	return copy;
}

export function subjectPrompt(
	direction: (typeof THEME_DIRECTIONS)[number],
	subject: (typeof PROBE_SUBJECTS)[number],
): string {
	return `${subject.prompt}; ${direction.materials}; pixel art game sprite; transparent background; ${direction.negative}.`;
}

export function proposalBlueprint(
	directionId: string,
	subjectId: string,
	route: "pixflux" | "pixen" | "bitforge",
): Json {
	const direction = THEME_DIRECTIONS.find((entry) => entry.id === directionId);
	const subject = PROBE_SUBJECTS.find((entry) => entry.id === subjectId);
	if (!direction || !subject) throw new Error("unknown direction or subject");
	return {
		schema: "spellkave-pixellab-entity-art-blueprint/v1",
		id: `${direction.id}-${subject.id}-${route}`,
		direction: direction.id,
		subject: subject.id,
		route,
		description: subjectPrompt(direction, subject),
		image_size: { width: 64, height: 64 },
		no_background: true,
		seed: 20260916,
		outline: "selective outline",
		detail: "medium detail",
		color_palette: direction.palette,
		output_directory: `${PROPOSAL_ROOT}/${direction.id}/${route}`,
		output_filename: `${subject.id}.png`,
		style_pack: `${STYLE_PACK_ROOT}/${direction.id}/manifest.json`,
		provenance: {
			license: FIRST_PARTY_ART_LICENSE,
			source: "sk-jay0.3.5.16 style proposal probe",
		},
	};
}

export async function writeStyleProposalScaffold(repoRoot: string): Promise<Json> {
	const root = resolve(repoRoot);
	const created: string[] = [];
	for (const direction of THEME_DIRECTIONS) {
		const packDir = resolve(root, STYLE_PACK_ROOT, direction.id);
		const pack = {
			schema: "spellkave-style-pack/v1",
			id: direction.id,
			status: "proposal",
			description: `${direction.world}: ${direction.materials}.`,
			palette: direction.palette,
			pixel_scale: "Generate at native 64×64; display nearest-neighbor.",
			outline: "Selective outline; avoid heavy cartoon black.",
			shading: "Basic to medium; no gloss or bloom.",
			negative_direction: direction.negative,
			theme_id: direction.theme_id,
			background: direction.background,
		};
		await writeJson(resolve(packDir, "manifest.json"), pack);
		await writeFile(resolve(packDir, "palette.png"), paletteStripPng(direction.palette));
		created.push(relative(root, resolve(packDir, "manifest.json")));
		const directionDir = resolve(root, PROPOSAL_ROOT, direction.id);
		const blueprints = PROBE_SUBJECTS.flatMap((subject) =>
			(["pixflux", "pixen", "bitforge"] as const).map((route) =>
				proposalBlueprint(direction.id, subject.id, route),
			),
		);
		await writeJson(resolve(directionDir, "manifest.json"), {
			schema: "spellkave-pixellab-style-proposal/v1",
			id: direction.id,
			world: direction.world,
			theme_id: direction.theme_id,
			palette: direction.palette,
			materials: direction.materials,
			subjects: PROBE_SUBJECTS.map((subject) => subject.id),
			routes: ["pixflux", "pixen", "bitforge"],
			best_route: "bitforge",
			note: "PixFlux is the cheap baseline. Bitforge is the consistency candidate (style image + forced palette + seed). Pixen is the documented default still image route.",
		});
		for (const blueprint of blueprints) {
			const path = resolve(directionDir, `${blueprint.id}.blueprint.json`);
			await writeJson(path, blueprint);
			created.push(relative(root, path));
		}
	}
	return { kind: "pixellab_style_proposal_scaffold", files: created };
}

async function generateStill(
	route: "pixflux" | "pixen" | "bitforge",
	blueprint: Json,
	palettePng: Buffer,
	stylePng: Buffer | undefined,
	options: PixelLabV2Options,
	secret: string,
): Promise<Buffer> {
	const fetchImpl = options.fetchImpl ?? fetch;
	const description = String(blueprint.description);
	const imageSize = blueprint.image_size;
	const seed = blueprint.seed;
	let path = "/create-image-pixflux";
	let body: Json = {
		description,
		image_size: imageSize,
		no_background: true,
		seed,
		color_image: base64Image(palettePng),
	};
	if (route === "pixen") {
		path = "/create-image-pixen";
		body = {
			description,
			image_size: imageSize,
			no_background: true,
			seed,
			outline: "selective outline",
			detail: "medium detail",
		};
	} else if (route === "bitforge") {
		path = "/create-image-bitforge";
		body = {
			description,
			image_size: imageSize,
			no_background: true,
			seed,
			color_image: base64Image(palettePng),
			style_image: stylePng ? base64Image(stylePng) : undefined,
			style_strength: stylePng ? 60 : 0,
			outline: "selective outline",
			shading: "basic shading",
			detail: "medium detail",
		};
	}
	const { body: response } = await providerJson(fetchImpl, secret, path, {
		method: "POST",
		body: JSON.stringify(body),
	});
	if (!isRecord(response.image) || typeof response.image.base64 !== "string") {
		throw new Error(`${path} returned no image`);
	}
	return Buffer.from(
		String(response.image.base64).replace(/^data:image\/\w+;base64,/, ""),
		"base64",
	);
}

export async function runStyleProposals(options: PixelLabV2Options): Promise<Json> {
	const scaffold = await writeStyleProposalScaffold(options.repoRoot);
	await options.onEvent?.({ ...scaffold, kind: "cost_preview", paid_call: false });
	if (!options.confirmPaid) {
		return {
			kind: "pixellab_style_proposal_plan",
			paid_call: false,
			confirmation_required: "--confirm-paid",
			scaffold,
		};
	}
	const repoRoot = resolve(options.repoRoot);
	const fetchImpl = options.fetchImpl ?? fetch;
	const secret = secretFromEnv(options.env ?? process.env);
	const { body: before } = await providerJson(fetchImpl, secret, "/balance");
	const outputs: Json[] = [];
	for (const direction of THEME_DIRECTIONS) {
		const palettePng = paletteStripPng(direction.palette);
		let stylePng: Buffer | undefined;
		for (const subject of PROBE_SUBJECTS) {
			for (const route of ["pixflux", "pixen", "bitforge"] as const) {
				const blueprint = proposalBlueprint(direction.id, subject.id, route);
				try {
					const png = await generateStill(route, blueprint, palettePng, stylePng, options, secret);
					if (route === "pixflux" && subject.id === "goblin-warrior") stylePng = png;
					const outputPath = resolve(
						repoRoot,
						PROPOSAL_ROOT,
						direction.id,
						route,
						`${subject.id}.png`,
					);
					await mkdir(dirname(outputPath), { recursive: true });
					await writeFile(outputPath, png);
					outputs.push({
						direction: direction.id,
						subject: subject.id,
						route,
						path: relative(repoRoot, outputPath),
						sha256: sha256(png),
					});
					await options.onEvent?.({
						kind: "proposal_generated",
						path: relative(repoRoot, outputPath),
					});
				} catch (error) {
					outputs.push({
						direction: direction.id,
						subject: subject.id,
						route,
						error: error instanceof Error ? error.message : "generation failed",
					});
					await options.onEvent?.({
						kind: "proposal_failed",
						direction: direction.id,
						subject: subject.id,
						route,
					});
				}
			}
		}
	}
	const { body: after } = await providerJson(fetchImpl, secret, "/balance");
	const summary = {
		kind: "pixellab_style_proposal_run",
		status: "completed",
		balance_before: before,
		balance_after: after,
		measured_cost_generations:
			remainingGenerations(before) !== null && remainingGenerations(after) !== null
				? (remainingGenerations(before) as number) - (remainingGenerations(after) as number)
				: null,
		outputs,
	};
	await writeJson(resolve(repoRoot, PROPOSAL_ROOT, "run-summary.json"), summary);
	return summary;
}

export function overlaySprite(
	backgroundHex: string,
	spritePath: string,
	outputPath: string,
	canvas = 192,
): void {
	const color = backgroundHex.replace("#", "0x");
	const result = spawnSync(
		"ffmpeg",
		[
			"-y",
			"-f",
			"lavfi",
			"-i",
			`color=c=${color}:s=${canvas}x${canvas}:d=0.04`,
			"-i",
			spritePath,
			"-filter_complex",
			"[1]scale=128:128:flags=neighbor[s];[0][s]overlay=(W-w)/2:(H-h)/2",
			"-frames:v",
			"1",
			outputPath,
		],
		{ encoding: "utf8" },
	);
	if (result.status !== 0) {
		throw new Error(result.stderr || "ffmpeg overlay failed");
	}
}

export async function writeProposalReviewBoard(repoRoot: string): Promise<Json> {
	const root = resolve(repoRoot);
	const files: string[] = [];
	for (const direction of THEME_DIRECTIONS) {
		for (const subject of PROBE_SUBJECTS) {
			for (const route of ["pixflux", "bitforge"] as const) {
				const sprite = resolve(root, PROPOSAL_ROOT, direction.id, route, `${subject.id}.png`);
				for (const background of THEME_DIRECTIONS.filter((entry) => entry.theme_id !== "neutral")) {
					const out = resolve(
						root,
						PROPOSAL_ROOT,
						direction.id,
						"review",
						`${subject.id}-${route}-on-${background.theme_id}.png`,
					);
					await mkdir(dirname(out), { recursive: true });
					overlaySprite(background.background, sprite, out);
					files.push(relative(root, out));
				}
			}
		}
	}
	return { kind: "pixellab_style_proposal_review_board", files };
}
