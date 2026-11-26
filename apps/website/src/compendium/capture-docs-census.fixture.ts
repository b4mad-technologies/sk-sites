/**
 * Gives a capture-docs-census test file its own copy of the committed census
 * snapshots and of the Kavemouth fixture, so it can edit both freely.
 *
 * The capture tests are split across three files because each one projects
 * the whole real corpus; vitest runs files in parallel and the tests of one
 * file in sequence (sk-jay0.7.164.34).
 */
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, beforeAll } from "vitest";
import type { DocsProjectionRoot } from "./project-metadata-docs";

const websiteRoot = resolve(import.meta.dirname, "../..");
const repoRoot = resolve(websiteRoot, "../..");
const snapshotNames = ["docs-census.json", "compendium-census.json", "delivery-report.json"];

export type CaptureFixture = {
	snapshotRoot: string;
	fixturePath: string;
	originalFixture: string;
	docsRoots: readonly DocsProjectionRoot[];
	capture: (options: {
		check: boolean;
		snapshotRoot: string;
		docsRoots: readonly DocsProjectionRoot[];
	}) => void;
	snapshots: () => string[];
};

/** Registers this file's setup and teardown; read the fixture inside a test. */
export function useCaptureFixture(): CaptureFixture {
	const fixture = {} as CaptureFixture;
	let tempRoot = "";
	beforeAll(async () => {
		tempRoot = mkdtempSync(join(tmpdir(), "spellkave-capture-test-"));
		fixture.snapshotRoot = join(tempRoot, "snapshots");
		cpSync(join(websiteRoot, "src/compendium"), fixture.snapshotRoot, {
			recursive: true,
			filter: (path) =>
				path.endsWith("compendium") || snapshotNames.some((name) => path.endsWith(name)),
		});
		const fixtureRoot = join(tempRoot, "fixtures");
		cpSync(join(repoRoot, "packages/spellkave-adventure-kavemouth/fixtures"), fixtureRoot, {
			recursive: true,
			filter: (path) => !path.includes("/fixtures/story"),
		});
		fixture.fixturePath = join(fixtureRoot, "adventure.manifest.toml");
		fixture.originalFixture = readFileSync(fixture.fixturePath, "utf8");
		const registry = await import(
			pathToFileURL(join(websiteRoot, "scripts/metadata-docs-registry.mts")).href
		);
		fixture.docsRoots = (registry.DOCS_PROJECTION_ROOTS as readonly DocsProjectionRoot[]).map(
			(root) =>
				root.rootManifestPath.includes("spellkave-adventure-kavemouth")
					? { ...root, rootManifestPath: fixture.fixturePath }
					: root,
		);
		const module = await import(
			pathToFileURL(join(websiteRoot, "scripts/capture-docs-census.mjs")).href
		);
		fixture.capture = module.captureDocsCensus;
		fixture.snapshots = () =>
			snapshotNames.map((name) => readFileSync(join(fixture.snapshotRoot, name), "utf8"));
	});
	afterAll(() => {
		if (tempRoot) rmSync(tempRoot, { recursive: true, force: true });
	});
	return fixture;
}
