import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
	mkdtempSync,
	mkdirSync,
	existsSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { copyProjectedModuleAssets, copyReferencedArt, projectedArt, projectedMapLayers, validateProjectedArtSources } from "./copy-compendium.mjs";

function fixture(art) {
	const root = mkdtempSync(join(tmpdir(), "spellkave-copy-compendium-"));
	const exportRoot = join(root, "export");
	const assetsRoot = join(root, "assets/srd-art");
	const destRoot = join(root, "public/srd-art");
	const entry = join(exportRoot, "entries/item/rations.json");
	mkdirSync(dirname(entry), { recursive: true });
	mkdirSync(assetsRoot, { recursive: true });
	writeFileSync(entry, JSON.stringify({ art }));
	return { root, exportRoot, assetsRoot, destRoot, art };
}

function copy(options) {
	return copyReferencedArt({ ...options, pathPrefix: "srd-art", label: "SRD", additionalArt: options.art ? [options.art] : [] });
}

test("copies a referenced SRD asset and verifies its export hash", (t) => {
	const setup = fixture({ path: "srd-art/item/rations.webp", hash: "" });
	t.after(() => rmSync(setup.root, { recursive: true, force: true }));
	const source = join(setup.assetsRoot, "item/rations.webp");
	mkdirSync(dirname(source), { recursive: true });
	const bytes = Buffer.from("rations-image");
	writeFileSync(source, bytes);
	const hash = createHash("sha256").update(bytes).digest("hex");
	setup.art.hash = hash;
	writeFileSync(
		join(setup.exportRoot, "entries/item/rations.json"),
		JSON.stringify({ art: { path: "srd-art/item/rations.webp", hash } }),
	);
	mkdirSync(setup.destRoot, { recursive: true });
	writeFileSync(join(setup.destRoot, "stale.webp"), "stale");

	assert.deepEqual(copy(setup), { copied: 1, skipped: 0 });
	assert.equal(existsSync(join(setup.destRoot, "stale.webp")), false);
	assert.deepEqual(
		createHash("sha256").update(readFileSync(join(setup.destRoot, "item/rations.webp"))).digest("hex"),
		hash,
	);
});

test("copies validated documentation art even when no legacy entry references it", (t) => {
	const setup = fixture(null);
	t.after(() => rmSync(setup.root, { recursive: true, force: true }));
	const source = join(setup.assetsRoot, "item/shield.webp");
	mkdirSync(dirname(source), { recursive: true });
	const bytes = Buffer.from("shield-image");
	writeFileSync(source, bytes);
	const hash = createHash("sha256").update(bytes).digest("hex");
	assert.deepEqual(copyReferencedArt({ ...setup, pathPrefix: "srd-art", label: "SRD", additionalArt: [{ path: "srd-art/item/shield.webp", hash }] }), { copied: 1, skipped: 0 });
	assert.equal(existsSync(join(setup.destRoot, "item/shield.webp")), true);
});

test("fails a referenced SRD asset that is missing or has the wrong hash", (t) => {
	const missing = fixture({ path: "srd-art/item/rations.webp" });
	t.after(() => rmSync(missing.root, { recursive: true, force: true }));
	assert.throws(() => copy(missing), /SRD art file missing for srd-art\/item\/rations\.webp/);
	assert.throws(
		() => copyReferencedArt({
			...missing,
			pathPrefix: "srd-art",
			label: "Elven Mini",
			onMissing: "skip",
			additionalArt: [{ path: "srd-art/item/rations.webp", hash: "a".repeat(64) }],
		}),
		/Elven Mini art file missing/,
	);

	const mismatch = fixture({ path: "srd-art/item/rations.webp", hash: "0".repeat(64) });
	t.after(() => rmSync(mismatch.root, { recursive: true, force: true }));
	const source = join(mismatch.assetsRoot, "item/rations.webp");
	mkdirSync(dirname(source), { recursive: true });
	writeFileSync(source, "rations-image");
	assert.throws(() => copy(mismatch), /SRD art hash mismatch for srd-art\/item\/rations\.webp/);
});

test("rejects conflicting authored hashes for the same asset path", (t) => {
	const setup = fixture({ path: "srd-art/item/rations.webp", hash: "a".repeat(64) });
	t.after(() => rmSync(setup.root, { recursive: true, force: true }));
	assert.throws(
		() => copyReferencedArt({
			...setup,
			pathPrefix: "srd-art",
			label: "SRD",
			additionalArt: [setup.art, { path: "srd-art/item/rations.webp", hash: "b".repeat(64) }],
		}),
		/conflicting hashes/,
	);
});

test("collects docs-only art from lazy article and catalogue artifacts", (t) => {
	const root = mkdtempSync(join(tmpdir(), "spellkave-docs-art-"));
	t.after(() => rmSync(root, { recursive: true, force: true }));
	const articles = join(root, "articles/guide/people");
	mkdirSync(articles, { recursive: true });
	writeFileSync(join(root, "index.json"), JSON.stringify({
		pages: [{ sections: [{
			pages: [{ artifact_href: "/compendium/docs/articles/guide/people/mira.json" }],
			catalogue_href: "/compendium/docs/catalogues/guide/people.json",
		}] }],
	}));
	const catalogueList = join(root, "catalogues/guide");
	mkdirSync(catalogueList, { recursive: true });
	writeFileSync(join(catalogueList, "people.json"), JSON.stringify([
		{ artifact_href: "/compendium/docs/catalogue/guide/people/shield.json" },
	]));
	writeFileSync(join(articles, "mira.json"), JSON.stringify({
		subjects: [{ attachments: [{ asset_href: "/assets/mira.webp", payload: { path: "elven-mini-art/mira.webp", hash: "a".repeat(64) } }] }],
	}));
	const catalogue = join(root, "catalogue/guide/people");
	mkdirSync(catalogue, { recursive: true });
	writeFileSync(join(catalogue, "shield.json"), JSON.stringify({
		subject: { attachments: [{ asset_href: "/assets/shield.webp", payload: { path: "srd-art/shield.webp", hash: "b".repeat(64) } }] },
		facets: [{ label: "Map layers", rows: [{ place_graph_id: "guide/inn", asset_module: "maps", asset_path: "maps/inn.jpg" }] }],
	}));
	assert.deepEqual(projectedArt(join(root, "index.json")), [
		{ path: "elven-mini-art/mira.webp", hash: "a".repeat(64) },
		{ path: "srd-art/shield.webp", hash: "b".repeat(64) },
	]);
	assert.deepEqual(projectedMapLayers(join(root, "index.json")), [
		{ place_graph_id: "guide/inn", asset_module: "maps", asset_path: "maps/inn.jpg" },
	]);
});

test("rejects traversing and symlink-escaping art references", (t) => {
	const traversal = fixture({ path: "srd-art/../outside.webp" });
	t.after(() => rmSync(traversal.root, { recursive: true, force: true }));
	assert.throws(() => copy(traversal), /SRD art path escapes asset root/);
	const absolute = fixture({ path: "srd-art//tmp/escape.webp" });
	t.after(() => rmSync(absolute.root, { recursive: true, force: true }));
	assert.throws(() => copy(absolute), /SRD art path escapes asset root/);

	const symlink = fixture({ path: "srd-art/item/rations.webp" });
	t.after(() => rmSync(symlink.root, { recursive: true, force: true }));
	const outside = join(symlink.root, "outside.webp");
	const source = join(symlink.assetsRoot, "item/rations.webp");
	mkdirSync(dirname(source), { recursive: true });
	writeFileSync(outside, "outside");
	symlinkSync(outside, source);
	assert.throws(() => copy(symlink), /SRD art path escapes asset root through symlink/);
});

test("copies an arbitrary registered asset module without bundle-specific logic", (t) => {
	const root = mkdtempSync(join(tmpdir(), "spellkave-module-assets-"));
	t.after(() => rmSync(root, { recursive: true, force: true }));
	const source = join(root, "source");
	const destination = join(root, "public");
	mkdirSync(source);
	writeFileSync(join(source, "diagram.png"), "diagram");
	const config = { module: "guide-diagrams", pathPrefix: "diagrams", label: "Guide diagrams" };
	assert.deepEqual(
		copyProjectedModuleAssets(
			[{ asset_module: "guide-diagrams", asset_path: "diagrams/diagram.png" }],
			config,
			source,
			destination,
		),
		{ copied: 1 },
	);
	assert.equal(readFileSync(join(destination, "diagram.png"), "utf8"), "diagram");
});

test("requires exactly one physical source for every projected art mount", () => {
	const art = [{ path: "guide-art/portrait.webp" }];
	assert.throws(() => validateProjectedArtSources(art, []), /exactly one source mount/);
	assert.throws(
		() => validateProjectedArtSources(art, [{ pathPrefix: "guide-art" }, { pathPrefix: "guide-art" }]),
		/exactly one source mount/,
	);
	assert.doesNotThrow(() => validateProjectedArtSources(art, [{ pathPrefix: "guide-art" }]));
});
