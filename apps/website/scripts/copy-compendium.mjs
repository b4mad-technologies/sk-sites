#!/usr/bin/env node
/** Project manifest documentation and copy only its referenced static assets. */
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
	cpSync,
	existsSync,
	mkdirSync,
	readFileSync,
	realpathSync,
	rmSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DOCS_ART_ASSETS, DOCS_MODULE_ASSETS } from "./metadata-docs-assets.mjs";

const websiteRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = join(websiteRoot, "../..");

function projectMetadataDocs() {
	const result = spawnSync("pnpm", ["exec", "tsx", "apps/website/scripts/project-metadata-docs.mts"], {
		cwd: repoRoot,
		stdio: "inherit",
	});
	if (result.status !== 0) throw new Error("metadata docs projection failed");
}

export function copyReferencedArt({ destRoot, assetsRoot, pathPrefix, label, additionalArt = [] }) {
	const resolvedAssetsRoot = resolve(assetsRoot);
	const realAssetsRoot = existsSync(resolvedAssetsRoot) ? realpathSync(resolvedAssetsRoot) : null;
	const artDest = resolve(destRoot);
	rmSync(artDest, { recursive: true, force: true });
	mkdirSync(artDest, { recursive: true });
	let copied = 0;
	const candidates = additionalArt.map((art) => ({ art, required: true }));
	const byPath = new Map();
	for (const candidate of candidates) {
		const { art } = candidate;
		if (!art || typeof art.path !== "string" || art.path.length === 0) continue;
		if (!art.path.startsWith(`${pathPrefix}/`)) continue;
		const prior = byPath.get(art.path);
		if (prior) {
			if (
				typeof prior.art.hash === "string" &&
				typeof art.hash === "string" &&
				prior.art.hash !== art.hash
			) {
				throw new Error(`${label} art path has conflicting hashes: ${art.path}`);
			}
			prior.required ||= candidate.required;
			if (typeof prior.art.hash !== "string" && typeof art.hash === "string") prior.art = art;
			continue;
		}
		byPath.set(art.path, candidate);
	}
	for (const { art, required } of byPath.values()) {
		const rel = art.path.slice(pathPrefix.length + 1);
		const sourceFile = resolve(resolvedAssetsRoot, rel);
		if (rel === "" || !sourceFile.startsWith(`${resolvedAssetsRoot}/`)) {
			throw new Error(`${label} art path escapes asset root: ${art.path}`);
		}
		if (!existsSync(sourceFile)) {
			throw new Error(`${label} art file missing for ${art.path}: ${sourceFile}`);
		}
		const realSourceFile = realpathSync(sourceFile);
		if (realAssetsRoot === null || !realSourceFile.startsWith(`${realAssetsRoot}/`)) {
			throw new Error(`${label} art path escapes asset root through symlink: ${art.path}`);
		}
		if (typeof art.hash === "string" && art.hash.length === 64) {
			const digest = createHash("sha256").update(readFileSync(realSourceFile)).digest("hex");
			if (digest !== art.hash) {
				throw new Error(`${label} art hash mismatch for ${art.path}: ${digest} !== ${art.hash}`);
			}
		}
		const target = resolve(artDest, rel);
		if (!target.startsWith(`${artDest}/`)) {
			throw new Error(`${label} art destination escapes public root: ${art.path}`);
		}
		mkdirSync(dirname(target), { recursive: true });
		cpSync(realSourceFile, target);
		copied += 1;
	}
	return { copied, skipped: 0 };
}

function projectedArtifacts(indexPath) {
	if (!existsSync(indexPath)) return [];
	const docsRoot = resolve(dirname(indexPath));
	const index = JSON.parse(readFileSync(indexPath, "utf8"));
	const artifacts = [];
	for (const page of index.pages ?? []) {
		for (const section of page.sections ?? []) {
			let catalogue = section.catalogue ?? [];
			if (typeof section.catalogue_href === "string") {
				const prefix = "/compendium/docs/";
				if (!section.catalogue_href.startsWith(prefix))
					throw new Error(`documentation catalogue artifact has an unsafe path: ${section.catalogue_href}`);
				const cataloguePath = resolve(docsRoot, section.catalogue_href.slice(prefix.length));
				if (!cataloguePath.startsWith(`${docsRoot}/`) || !existsSync(cataloguePath))
					throw new Error(`documentation catalogue artifact is missing or escapes its root: ${section.catalogue_href}`);
				catalogue = JSON.parse(readFileSync(cataloguePath, "utf8"));
			}
			for (const summary of [
				...(section.pages ?? []),
				...catalogue,
				...(section.documents ?? []),
			]) {
				if (typeof summary.artifact_href !== "string") {
					throw new Error("documentation summary is missing artifact_href");
				}
				const prefix = "/compendium/docs/";
				if (!summary.artifact_href.startsWith(prefix)) {
					throw new Error(`documentation article artifact has an unsafe path: ${summary.artifact_href}`);
				}
				const artifactPath = resolve(docsRoot, summary.artifact_href.slice(prefix.length));
				if (!artifactPath.startsWith(`${docsRoot}/`) || !existsSync(artifactPath)) {
					throw new Error(`documentation article artifact is missing or escapes its root: ${summary.artifact_href}`);
				}
				artifacts.push(JSON.parse(readFileSync(artifactPath, "utf8")));
			}
		}
	}
	return artifacts;
}

export function projectedArt(indexPath = join(websiteRoot, "public/compendium/docs/index.json")) {
	return projectedArtifacts(indexPath).flatMap((artifact) => [
		...(artifact.subjects ?? []),
		...(artifact.resources ?? []),
		...(artifact.subject ? [artifact.subject] : []),
		...(artifact.resource ? [artifact.resource] : []),
	].flatMap(
		(subject) => (subject.attachments ?? [])
			.filter((attachment) => attachment.asset_href)
			.map((attachment) => attachment.payload),
	));
}

export function projectedMapLayers(indexPath = join(websiteRoot, "public/compendium/docs/index.json")) {
	return projectedArtifacts(indexPath).flatMap((artifact) =>
		(artifact.facets ?? [])
			.filter((facet) => facet.label === "Map layers")
			.flatMap((facet) => facet.rows ?? []),
	);
}

export function validateProjectedArtSources(candidates, configs) {
	for (const candidate of candidates) {
		if (!candidate || typeof candidate.path !== "string") continue;
		const matches = configs.filter((config) => candidate.path.startsWith(`${config.pathPrefix}/`));
		if (matches.length !== 1)
			throw new Error(`projected art path must have exactly one source mount: ${candidate.path}`);
	}
}

export function copyProjectedModuleAssets(layers, config, assetsRoot, destRoot) {
	const sourceRoot = realpathSync(resolve(assetsRoot));
	const destinationRoot = resolve(destRoot);
	rmSync(destinationRoot, { recursive: true, force: true });
	mkdirSync(destinationRoot, { recursive: true });
	const seen = new Set();
	for (const layer of layers) {
		if (layer.asset_module !== config.module || typeof layer.asset_path !== "string") continue;
		if (!layer.asset_path.startsWith(`${config.pathPrefix}/`)) throw new Error(`${config.label} asset path is outside ${config.pathPrefix}/: ${layer.asset_path}`);
		const relative = layer.asset_path.slice(config.pathPrefix.length + 1);
		if (seen.has(relative)) continue;
		seen.add(relative);
		const source = resolve(sourceRoot, relative);
		if (!source.startsWith(`${sourceRoot}/`) || !existsSync(source) || !realpathSync(source).startsWith(`${sourceRoot}/`))
			throw new Error(`map asset is missing or escapes its root: ${layer.asset_path}`);
		const target = resolve(destinationRoot, relative);
		if (!target.startsWith(`${destinationRoot}/`)) throw new Error(`map asset destination escapes its root: ${relative}`);
		mkdirSync(dirname(target), { recursive: true });
		cpSync(source, target);
	}
	return { copied: seen.size };
}

export function ensureCompendiumExport() {
	projectMetadataDocs();
	const docsArt = projectedArt();
	validateProjectedArtSources(docsArt, DOCS_ART_ASSETS);
	const staleSrd = join(websiteRoot, "public/compendium/srd");
	rmSync(staleSrd, { recursive: true, force: true });
	const miniDest = join(websiteRoot, "public/compendium/adventures/kavemouth");
	for (const name of ["index.json", "search.json", "maps.json", "chapters", "entries"])
		rmSync(join(miniDest, name), { recursive: true, force: true });
	const art = DOCS_ART_ASSETS.map((config) => copyReferencedArt({
		destRoot: join(websiteRoot, "public", config.publicMount),
		assetsRoot: join(repoRoot, config.source),
		pathPrefix: config.pathPrefix,
		label: config.label,
		additionalArt: docsArt,
	}));
	const layers = projectedMapLayers();
	const modules = DOCS_MODULE_ASSETS.map((config) => copyProjectedModuleAssets(
		layers,
		config,
		join(repoRoot, config.source),
		join(websiteRoot, "public", config.publicMount),
	));
	const knownModules = new Set(DOCS_MODULE_ASSETS.map((asset) => asset.module));
	const missingModule = layers.find((layer) => !knownModules.has(layer.asset_module));
	if (missingModule) throw new Error(`projected asset module has no source mount: ${missingModule.asset_module}`);
	return { art, modules };
}

const isCli =
	process.argv[1] !== undefined &&
	import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isCli) {
	const copied = ensureCompendiumExport();
	console.log(`[website] projected manifest documentation and copied ${copied.art.reduce((sum, item) => sum + item.copied, 0)} art + ${copied.modules.reduce((sum, item) => sum + item.copied, 0)} module asset(s)`);
}
