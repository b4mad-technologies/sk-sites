import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, extname, join, relative, resolve } from "node:path";
import { promisify } from "node:util";
import {
	type ArtManifest,
	type ArtManifestEntry,
	type ExpandedEntry,
	expandArtManifest,
	loadPromptTemplates,
	parseArtManifest,
} from "./art-manifest.ts";
import {
	getProvider,
	type ImageProvider,
	isRecord,
	type JsonRecord,
	type ProviderId,
	registerProvider,
	resolveInsideRepo,
} from "./image-provider.ts";
import { openaiImageProvider } from "./openai-image-provider.ts";
import { badgeEntryId, composeBadgePng } from "./overlay-compose.ts";
import {
	palettePathForStylePack,
	pixellabPixenProvider,
	reduceColorsOntoPalette,
} from "./pixellab-pixen-provider.ts";
import { pixellabPixfluxProvider } from "./pixellab-pixflux-provider.ts";
import { pixellabV2Provider } from "./pixellab-v2-provider.ts";

const execFileAsync = promisify(execFile);
export const BATCH_STATE_SCHEMA = "spellkave-art-batch-state/v1";
export const PROVENANCE_SCHEMA = "spellkave-design-asset-provenance/v1";

export type BatchEvent = JsonRecord & { kind: string };

export interface ArtBatchOptions {
	repoRoot: string;
	confirmPaid?: boolean;
	only?: string;
	/** Select only deterministic overlay/badge compositions; never contact an image provider. */
	composeOnly?: boolean;
	provider?: ImageProvider;
	providers?: Partial<Record<ProviderId, ImageProvider>>;
	convertPngToWebp?: (png: Buffer) => Promise<Buffer>;
	env?: NodeJS.ProcessEnv;
	now?: () => Date;
	onEvent?: (event: BatchEvent) => void | Promise<void>;
	fetchImpl?: typeof fetch;
	clients?: Record<string, unknown>;
}

export interface BatchEntryResult {
	id: string;
	status: "planned" | "completed" | "skipped" | "failed" | "stopped";
	reason?: string;
	output_path?: string;
	sha256?: string;
}

export interface ArtBatchResult {
	kind: "art_batch_result";
	manifest: string;
	paid_call: boolean;
	stopped_on_balance_floor: boolean;
	entries: BatchEntryResult[];
}

type EntryState = {
	status: "started" | "completed" | "failed";
	output_sha256?: string;
	png_sha256?: string;
	error?: string;
};

type BatchState = {
	schema: typeof BATCH_STATE_SCHEMA;
	manifest_id: string;
	entries: Record<string, EntryState>;
};

let builtinsRegistered = false;

function ensureBuiltinProviders(): void {
	if (builtinsRegistered) return;
	registerProvider(pixellabPixfluxProvider);
	registerProvider(pixellabV2Provider);
	registerProvider(pixellabPixenProvider);
	registerProvider(openaiImageProvider);
	builtinsRegistered = true;
}

export function matchGlob(value: string, glob: string): boolean {
	const escaped = glob
		.replace(/[.+^${}()|[\]\\]/g, "\\$&")
		.replace(/\*/g, ".*")
		.replace(/\?/g, ".");
	return new RegExp(`^${escaped}$`).test(value);
}

function sha256Bytes(value: Buffer | string): string {
	return createHash("sha256").update(value).digest("hex");
}

async function sha256File(path: string): Promise<string> {
	return sha256Bytes(await readFile(path));
}

async function writeJson(path: string, value: unknown): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function appendJsonl(path: string, value: unknown): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, `${JSON.stringify(value)}\n`, { encoding: "utf8", flag: "a" });
}

async function readState(path: string): Promise<BatchState | undefined> {
	try {
		const value: unknown = JSON.parse(await readFile(path, "utf8"));
		if (!isRecord(value) || value.schema !== BATCH_STATE_SCHEMA) return undefined;
		const entries = isRecord(value.entries) ? (value.entries as Record<string, EntryState>) : {};
		return {
			schema: BATCH_STATE_SCHEMA,
			manifest_id: String(value.manifest_id ?? ""),
			entries,
		};
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
		throw error;
	}
}

function floorValue(manifest: ArtManifest): { unit: string; amount: number } | undefined {
	const floor = manifest.balance_floor;
	if (!floor) return undefined;
	if (typeof floor.generations === "number")
		return { unit: "generations", amount: floor.generations };
	if (typeof floor.usd === "number") return { unit: "usd", amount: floor.usd };
	if (typeof floor.tokens === "number") return { unit: "tokens", amount: floor.tokens };
	return undefined;
}

export function reduceColorsPaletteRel(
	manifest: ArtManifest,
	provider: ProviderId,
): string | undefined {
	const pass = manifest.post_pass;
	if (pass && (pass.route === "reduce-colors" || pass.route === "/reduce-colors")) {
		return (
			pass.palette_path ??
			(manifest.style_pack ? palettePathForStylePack(manifest.style_pack) : undefined)
		);
	}
	if (provider === "pixellab-pixen" && manifest.style_pack) {
		return palettePathForStylePack(manifest.style_pack);
	}
	return undefined;
}

export function isComposeEntry(entry: ArtManifestEntry): boolean {
	return Boolean(entry.overlay_of && entry.overlay_template);
}

export function orderBatchEntries(items: ExpandedEntry[]): ExpandedEntry[] {
	const overlays: ExpandedEntry[] = [];
	const rest: ExpandedEntry[] = [];
	const composed: ExpandedEntry[] = [];
	for (const item of items) {
		if (isComposeEntry(item.entry)) composed.push(item);
		else if (item.entry.kind === "badge" || item.entry.kind === "overlay") overlays.push(item);
		else rest.push(item);
	}
	return [...overlays, ...rest, ...composed];
}

function providerFor(id: ProviderId, options: ArtBatchOptions): ImageProvider {
	if (options.provider) return options.provider;
	const override = options.providers?.[id];
	if (override) return override;
	ensureBuiltinProviders();
	return getProvider(id);
}

/**
 * PNG → WebP lossless, never resample. Default is `cwebp -lossless -exact`.
 * Tests inject convertPngToWebp so the suite does not require the binary.
 */
export async function pngToWebpLossless(
	png: Buffer,
	convert?: (png: Buffer) => Promise<Buffer>,
): Promise<Buffer> {
	if (convert) return convert(png);
	const dir = await mkdtemp(join(tmpdir(), "spellkave-webp-"));
	const input = join(dir, "in.png");
	const output = join(dir, "out.webp");
	try {
		await writeFile(input, png);
		await execFileAsync("cwebp", ["-lossless", "-exact", "-quiet", input, "-o", output]);
		return await readFile(output);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

/**
 * Decode a lossless WebP base into RGBA PNG for ffmpeg overlay composition.
 * This changes neither canvas dimensions nor the source provenance hash.
 */
export async function imageToRgbaPng(image: Buffer, extension: string): Promise<Buffer> {
	if (extension.toLowerCase() === ".png") return image;
	if (extension.toLowerCase() !== ".webp") {
		throw new Error(`compose base must be PNG or WebP, got ${extension || "no extension"}`);
	}
	const dir = await mkdtemp(join(tmpdir(), "spellkave-png-"));
	const input = join(dir, "in.webp");
	const output = join(dir, "out.png");
	try {
		await writeFile(input, image);
		await execFileAsync("ffmpeg", ["-i", input, "-frames:v", "1", "-pix_fmt", "rgba", output]);
		return await readFile(output);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

async function fileExists(path: string): Promise<boolean> {
	try {
		await access(path);
		return true;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
		throw error;
	}
}

async function ingestWebp(options: {
	repoRoot: string;
	targetRel: string;
	bytes: Buffer;
	sha256: string;
	provenance: JsonRecord;
}): Promise<void> {
	const targetPath = resolveInsideRepo(options.repoRoot, options.targetRel, "output_path");
	if (await fileExists(targetPath)) {
		const existing = await sha256File(targetPath);
		if (existing !== options.sha256) {
			throw new Error(`ingest target already exists with a different hash: ${options.targetRel}`);
		}
		return;
	}
	await mkdir(dirname(targetPath), { recursive: true });
	await writeFile(targetPath, options.bytes);
	await writeJson(`${targetPath}.json`, options.provenance);
}

export async function runArtBatch(
	manifestPath: string,
	options: ArtBatchOptions,
): Promise<ArtBatchResult> {
	const repoRoot = resolve(options.repoRoot);
	const absManifest = resolve(manifestPath);
	const manifest = parseArtManifest(JSON.parse(await readFile(absManifest, "utf8")));
	resolveInsideRepo(repoRoot, manifest.output_root, "output_root");
	const { templates, source: templatesSource } = await loadPromptTemplates(manifest, repoRoot);
	const expanded = await expandArtManifest(manifest, repoRoot, templates);
	const selected = orderBatchEntries(
		expanded.filter(
			(item) =>
				(!options.composeOnly || isComposeEntry(item.entry)) &&
				(!options.only || matchGlob(item.entry.id, options.only)),
		),
	);

	const outputRoot = resolveInsideRepo(repoRoot, manifest.output_root, "output_root");
	const statePath = join(outputRoot, "batch-state.json");
	const eventsPath = join(outputRoot, "events.jsonl");
	const previous = (await readState(statePath)) ?? {
		schema: BATCH_STATE_SCHEMA,
		manifest_id: manifest.id,
		entries: {},
	};
	const now = options.now ?? (() => new Date());

	const emit = async (event: BatchEvent) => {
		await appendJsonl(eventsPath, event);
		await options.onEvent?.(event);
	};

	const results: BatchEntryResult[] = [];
	let stoppedOnFloor = false;

	if (!options.confirmPaid) {
		for (const item of selected) {
			if (isComposeEntry(item.entry)) {
				await emit({
					kind: "cost_preview",
					paid_call: false,
					provider: item.provider,
					route: "compose-overlay",
					estimated_usage: { type: "generations", generations: 0 },
					confirmation_required: "--confirm-paid",
					entry_id: item.entry.id,
					overlay_of: item.entry.overlay_of,
					overlay_template: item.entry.overlay_template,
					templates: templatesSource,
					post_pass: null,
				});
				results.push({ id: item.entry.id, status: "planned", reason: "compose" });
				continue;
			}
			const provider = providerFor(item.provider, options);
			const request = provider.validate(item.blueprint);
			const plan = provider.plan(request, { repoRoot, blueprintPath: item.blueprint_relpath });
			const paletteRel = reduceColorsPaletteRel(manifest, item.provider);
			await emit({
				...plan,
				kind: "cost_preview",
				entry_id: item.entry.id,
				provider: item.provider,
				templates: templatesSource,
				post_pass: paletteRel
					? {
							route: "/reduce-colors",
							palette: paletteRel,
							estimated_usage: { type: "generations", generations: 0.1 },
						}
					: null,
			});
			results.push({ id: item.entry.id, status: "planned" });
		}
		return {
			kind: "art_batch_result",
			manifest: relative(repoRoot, absManifest),
			paid_call: false,
			stopped_on_balance_floor: false,
			entries: results,
		};
	}

	const floor = floorValue(manifest);

	for (const item of selected) {
		if (stoppedOnFloor) {
			results.push({
				id: item.entry.id,
				status: "stopped",
				reason: "balance_floor",
			});
			continue;
		}

		if (isComposeEntry(item.entry)) {
			const targetRel = item.entry.output_path;
			const targetPath = resolveInsideRepo(repoRoot, targetRel, "output_path");
			const prior = previous.entries[item.entry.id];
			if (prior?.status === "completed") {
				if (!(await fileExists(targetPath))) {
					throw new Error(
						`hash mismatch: completed entry ${item.entry.id} is missing ${targetRel}`,
					);
				}
				const actual = await sha256File(targetPath);
				if (!prior.output_sha256 || actual !== prior.output_sha256) {
					throw new Error(
						`hash mismatch: completed entry ${item.entry.id} output does not match batch state`,
					);
				}
				await emit({ kind: "skipped", entry_id: item.entry.id, reason: "completed" });
				results.push({
					id: item.entry.id,
					status: "skipped",
					reason: "completed",
					output_path: targetRel,
					sha256: actual,
				});
				continue;
			}
			const baseEntry = manifest.entries.find((entry) => entry.id === item.entry.overlay_of);
			const family =
				item.entry.overlay_badge ??
				(item.entry.overlay_template
					? manifest.overlay_badges?.[item.entry.overlay_template]
					: undefined);
			if (!family) {
				throw new Error(`compose ${item.entry.id}: missing overlay_badge / overlay_badges mapping`);
			}
			const badgeId = badgeEntryId(family);
			const badgeEntry = manifest.entries.find((entry) => entry.id === badgeId);
			if (!baseEntry || !badgeEntry) {
				throw new Error(`compose ${item.entry.id}: missing overlay_of or badge entry ${badgeId}`);
			}
			const baseBytes = await readFile(
				resolveInsideRepo(repoRoot, baseEntry.output_path, "overlay_of"),
			);
			const basePng = await imageToRgbaPng(baseBytes, extname(baseEntry.output_path));
			const overlayBytes = await readFile(
				resolveInsideRepo(repoRoot, badgeEntry.output_path, "overlay_badge"),
			);
			await emit({
				kind: "cost_preview",
				paid_call: false,
				route: "compose-overlay",
				estimated_usage: { type: "generations", generations: 0 },
				entry_id: item.entry.id,
				overlay_of: item.entry.overlay_of,
				overlay_template: item.entry.overlay_template,
				overlay_badge: family,
			});
			const composed = composeBadgePng(basePng, overlayBytes);
			const webp = await pngToWebpLossless(composed, options.convertPngToWebp);
			const digest = sha256Bytes(webp);
			await ingestWebp({
				repoRoot,
				targetRel,
				bytes: webp,
				sha256: digest,
				provenance: {
					schema: PROVENANCE_SCHEMA,
					provider: "compose-overlay",
					overlay_of: item.entry.overlay_of,
					overlay_template: item.entry.overlay_template,
					overlay_badge: family,
					base_sha256: sha256Bytes(baseBytes),
					overlay_sha256: sha256Bytes(overlayBytes),
					style_pack: manifest.style_pack ?? null,
					provenance: manifest.provenance,
					usage: { type: "generations", generations: 0 },
					generated_at: now().toISOString(),
					source_manifest: relative(repoRoot, absManifest),
					sha256: digest,
					target_attachment_ref: item.entry.target_attachment_ref,
					kind: item.entry.kind,
					entry_id: item.entry.id,
				},
			});
			previous.entries[item.entry.id] = { status: "completed", output_sha256: digest };
			await writeJson(statePath, previous);
			await emit({
				kind: "compose_completed",
				entry_id: item.entry.id,
				output: { path: targetRel, sha256: digest },
			});
			results.push({
				id: item.entry.id,
				status: "completed",
				reason: "compose",
				output_path: targetRel,
				sha256: digest,
			});
			continue;
		}

		const provider = providerFor(item.provider, options);
		const request = provider.validate(item.blueprint);
		const plan = provider.plan(request, { repoRoot, blueprintPath: item.blueprint_relpath });
		const paidPaletteRel = reduceColorsPaletteRel(manifest, item.provider);
		await emit({
			...plan,
			kind: "cost_preview",
			entry_id: item.entry.id,
			provider: item.provider,
			post_pass: paidPaletteRel
				? {
						route: "/reduce-colors",
						palette: paidPaletteRel,
						estimated_usage: { type: "generations", generations: 0.1 },
					}
				: null,
		});

		const targetRel = item.entry.output_path;
		const targetPath = resolveInsideRepo(repoRoot, targetRel, "output_path");
		const prior = previous.entries[item.entry.id];

		if (prior?.status === "completed") {
			if (!(await fileExists(targetPath))) {
				throw new Error(`hash mismatch: completed entry ${item.entry.id} is missing ${targetRel}`);
			}
			const actual = await sha256File(targetPath);
			if (!prior.output_sha256 || actual !== prior.output_sha256) {
				throw new Error(
					`hash mismatch: completed entry ${item.entry.id} output does not match batch state`,
				);
			}
			await emit({ kind: "skipped", entry_id: item.entry.id, reason: "completed" });
			results.push({
				id: item.entry.id,
				status: "skipped",
				reason: "completed",
				output_path: targetRel,
				sha256: actual,
			});
			continue;
		}

		const balance = await provider.balance({
			env: options.env,
			fetchImpl: options.fetchImpl,
			clients: options.clients,
		});
		await emit({ kind: "balance", entry_id: item.entry.id, balance });
		if (
			floor &&
			balance.remaining !== null &&
			balance.unit === floor.unit &&
			balance.remaining <= floor.amount
		) {
			stoppedOnFloor = true;
			await emit({
				kind: "balance_floor_stop",
				entry_id: item.entry.id,
				remaining: balance.remaining,
				floor: floor.amount,
				unit: floor.unit,
			});
			results.push({ id: item.entry.id, status: "stopped", reason: "balance_floor" });
			continue;
		}

		previous.entries[item.entry.id] = { status: "started" };
		await writeJson(statePath, previous);

		const candidateDir = resolveInsideRepo(
			repoRoot,
			String(item.blueprint.output_directory),
			"output_directory",
		);
		await mkdir(candidateDir, { recursive: true });
		await writeJson(join(outputRoot, `${item.entry.id}.blueprint.json`), item.blueprint);

		try {
			await emit({ kind: "generation_started", entry_id: item.entry.id });
			let generated = await provider.generate(request, {
				repoRoot,
				env: options.env,
				fetchImpl: options.fetchImpl,
				clients: options.clients,
			});
			const paletteRel = reduceColorsPaletteRel(manifest, item.provider);
			if (paletteRel) {
				const palette = await readFile(
					resolveInsideRepo(repoRoot, paletteRel, "reduce-colors palette"),
				);
				const quantized = await reduceColorsOntoPalette(generated.bytes, palette, {
					env: options.env,
					fetchImpl: options.fetchImpl,
				});
				await emit({
					kind: "post_pass",
					entry_id: item.entry.id,
					route: "/reduce-colors",
					usage: quantized.usage,
					palette: paletteRel,
				});
				generated = {
					...generated,
					bytes: quantized.bytes,
					usage: {
						type: "generations",
						generations: (generated.usage.generations ?? 0) + (quantized.usage.generations ?? 0),
					},
				};
			}
			const pngPath = join(candidateDir, String(item.blueprint.output_filename));
			await writeFile(pngPath, generated.bytes);
			const ext = extname(targetRel).toLowerCase();
			const ingestBytes =
				ext === ".png"
					? generated.bytes
					: await pngToWebpLossless(generated.bytes, options.convertPngToWebp);
			if (ext !== ".webp" && ext !== ".png") {
				throw new Error(`output_path must end in .webp or .png: ${targetRel}`);
			}
			const digest = sha256Bytes(ingestBytes);
			const generatedAt = now().toISOString();
			await ingestWebp({
				repoRoot,
				targetRel,
				bytes: ingestBytes,
				sha256: digest,
				provenance: {
					schema: PROVENANCE_SCHEMA,
					provider: item.provider,
					prompt:
						typeof item.blueprint.description === "string"
							? item.blueprint.description
							: typeof item.blueprint.prompt === "string"
								? item.blueprint.prompt
								: null,
					style_pack: manifest.style_pack ?? null,
					provenance: manifest.provenance,
					usage: generated.usage,
					generated_at: generatedAt,
					source_manifest: relative(repoRoot, absManifest),
					sha256: digest,
					target_attachment_ref: item.entry.target_attachment_ref,
					kind: item.entry.kind,
					entry_id: item.entry.id,
					provider_ids: generated.providerIds,
				},
			});
			previous.entries[item.entry.id] = {
				status: "completed",
				output_sha256: digest,
				png_sha256: sha256Bytes(generated.bytes),
			};
			await writeJson(statePath, previous);
			await emit({
				kind: "generation_completed",
				entry_id: item.entry.id,
				usage: generated.usage,
				output: { path: targetRel, sha256: digest },
			});
			results.push({
				id: item.entry.id,
				status: "completed",
				output_path: targetRel,
				sha256: digest,
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : "art-batch entry failed";
			previous.entries[item.entry.id] = { status: "failed", error: message };
			await writeJson(statePath, previous);
			await emit({ kind: "generation_failed", entry_id: item.entry.id, error: message });
			throw error;
		}
	}

	return {
		kind: "art_batch_result",
		manifest: relative(repoRoot, absManifest),
		paid_call: true,
		stopped_on_balance_floor: stoppedOnFloor,
		entries: results,
	};
}

export type { ExpandedEntry };
