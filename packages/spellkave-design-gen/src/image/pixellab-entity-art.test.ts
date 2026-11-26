// A content author auditing PixelLab's entity-art routes relies on skgen to
// list the right routes, measure each call's cost from the balance, and write
// valid probe images. The free audit plan is a scenario in behaviour/image.feature.
import { mkdir, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
	PROBE_SUBJECTS,
	proposalBlueprint,
	remainingGenerations,
	runEntityArtAudit,
	subjectPrompt,
	THEME_DIRECTIONS,
	writeStyleProposalScaffold,
} from "./pixellab-entity-art.ts";
import { ENTITY_ART_ROUTE_PATHS, extractEntityArtOpenApi } from "./pixellab-openapi.ts";
import { paletteStripPng, pngSize } from "./pixellab-png.ts";

describe("PixelLab entity-art audit helpers", () => {
	let root = "";
	afterEach(async () => {
		root = "";
	});

	// keep(K1): OpenAPI extract over a pure function
	it("extracts the ten entity-art POST operations", () => {
		const paths = Object.fromEntries(
			ENTITY_ART_ROUTE_PATHS.map((path) => [
				path,
				{
					post: {
						summary: path,
						requestBody: {
							content: { "application/json": { schema: { $ref: `#/components/schemas/${path}` } } },
						},
					},
				},
			]),
		);
		const spec = {
			openapi: "3.1.0",
			info: { title: "Pixel Lab API", version: "dev" },
			paths,
			components: {
				schemas: Object.fromEntries(
					ENTITY_ART_ROUTE_PATHS.map((path) => [path, { type: "object" }]),
				),
			},
		};
		const extract = extractEntityArtOpenApi(spec);
		expect(Object.keys(extract.paths as object)).toEqual([...ENTITY_ART_ROUTE_PATHS]);
	});

	// keep(K1): balance shapes over a pure function
	it("measures generation delta from balance objects", () => {
		expect(remainingGenerations({ type: "generations", generations: 40 })).toBe(40);
		expect(remainingGenerations({ subscription: { generations: 1918.85 } })).toBe(1918.85);
		expect(remainingGenerations({ usd: 12 })).toBe(12);
	});

	// keep(K1): PNG encoder cases
	it("encodes a palette PNG with an IHDR size", () => {
		const png = paletteStripPng(["#0d1830", "#d3a342"], 8);
		expect(pngSize(png)).toEqual({ width: 16, height: 8 });
	});

	// open: `skgen image pixellab proposal-scaffold` scenario not written yet
	it("writes four direction scaffolds", async () => {
		root = await mkdtemp(join(tmpdir(), "spellkave-proposals-"));
		const result = await writeStyleProposalScaffold(root);
		expect((result.files as string[]).some((file) => file.includes("living-grammar-woven"))).toBe(
			true,
		);
		const manifest = JSON.parse(
			await readFile(
				join(root, ".impeccable/mocks/pixellab/style-proposals/theme-neutral/manifest.json"),
				"utf8",
			),
		);
		expect(manifest.subjects).toHaveLength(6);
		expect(THEME_DIRECTIONS).toHaveLength(4);
		expect(subjectPrompt(THEME_DIRECTIONS[0], PROBE_SUBJECTS[0])).toContain("jacquard");
	});

	// open: needs a fake provider API and a base-URL override (sk-jay0.7.229.54)
	it("records measured cost for a fake sync route", async () => {
		root = await mkdtemp(join(tmpdir(), "spellkave-audit-"));
		await mkdir(join(root, "pixellab-generations"), { recursive: true });
		let remaining = 20;
		const png = paletteStripPng(["#112233"], 16);
		const fetchImpl: typeof fetch = async (input, init) => {
			const href = String(input);
			if (href.endsWith("/balance")) {
				return new Response(JSON.stringify({ type: "generations", generations: remaining }));
			}
			if (init?.method === "POST") {
				remaining -= href.includes("enhance-pixen-prompt") ? 0 : 1;
				if (href.endsWith("/enhance-pixen-prompt")) {
					return new Response(JSON.stringify({ description: "enhanced goblin" }));
				}
				return new Response(
					JSON.stringify({
						image: { type: "base64", base64: png.toString("base64"), format: "png" },
						usage: { type: "generations", generations: 1 },
					}),
				);
			}
			throw new Error(href);
		};
		const result = await runEntityArtAudit({
			repoRoot: root,
			confirmPaid: true,
			env: { PIXELLAB_SECRET: "test-only" },
			fetchImpl,
			sleep: async () => undefined,
		});
		expect(result.kind).toBe("pixellab_entity_art_audit");
		expect(result.measured_cost_generations_total).toBe(9);
	});
});

describe("generated art provenance", () => {
	// First-party art is CC BY 4.0 (owner decision 2026-11-26, ART.md).
	it("licenses proposal blueprints under CC BY 4.0", () => {
		const blueprint = proposalBlueprint(THEME_DIRECTIONS[0].id, PROBE_SUBJECTS[0].id, "pixen") as {
			provenance: { license: string };
		};
		expect(blueprint.provenance.license).toBe("CC-BY-4.0");
	});
});
