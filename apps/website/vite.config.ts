import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { requireLoginOrigin } from "@spellkave/authkit/vite";
import { spellkaveThemeBoot } from "@spellkave/ui/vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { svelteTesting } from "@testing-library/svelte/vite";
import { loadEnv, type Plugin } from "vite";
import { defineConfig, type ViteUserConfig } from "vitest/config";

// Same svelte + tailwind + component-test preset the archived browser apps used
// (`@spellkave/web/vite#defineSpellkaveApp`). Kept local so this site does not
// revive the observer/map/SDK package.

const REAL_DOCS_PROJECTION_TESTS = [
	"article-catalogue-list",
	"article-embed-attachments",
	"basin-guard",
	"bundle-info",
	"capability-grants",
	"catalogue-attachments",
	"cross-map-place-edges",
	"delivery",
	"docs-census",
	"hosted-definition-attachments",
	"link-rows-both-ends",
	"project-metadata-docs",
	"project-authoring-docs",
	"portable-guidance",
].map((name) => `src/compendium/${name}.test.ts`);

function readDevTokenFromFile(mode: string): string {
	// loadEnv only pulls VITE_* from .env files; the operator may also export
	// VITE_SPELLKAVE_DEV_TOKEN_FILE in the shell for live proof.
	const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
	const file = env.VITE_SPELLKAVE_DEV_TOKEN_FILE?.trim() ?? "";
	if (file === "") return env.VITE_SPELLKAVE_DEV_TOKEN?.trim() ?? "";
	const abs = resolve(file);
	if (!existsSync(abs)) {
		console.warn(`[website] VITE_SPELLKAVE_DEV_TOKEN_FILE not found: ${abs}`);
		return "";
	}
	return readFileSync(abs, "utf8").trim();
}

function copyCompendiumPlugin(): Plugin {
	return {
		name: "spellkave-copy-compendium",
		async buildStart() {
			const { ensureCompendiumExport } = await import("./scripts/copy-compendium.mjs");
			ensureCompendiumExport();
		},
	};
}

export default defineConfig(({ mode }) => {
	const devToken = mode === "production" ? "" : readDevTokenFromFile(mode);
	const vitest = process.env.VITEST === "true";
	const plugins: ViteUserConfig["plugins"] = [
		requireLoginOrigin(),
		spellkaveThemeBoot(),
		tailwindcss(),
		svelte(),
		svelteTesting(),
	];
	if (!vitest) {
		// Package builds delegate docs preparation and validated asset copying
		// here, before Vite copies public/ into dist/. Bare Vite also uses this hook.
		plugins.push(copyCompendiumPlugin());
	}
	return {
		plugins,
		// Inject file-backed token only outside production so production bundles
		// never embed a local play-stage credential.
		envPrefix: ["VITE_"],
		define:
			devToken === ""
				? undefined
				: {
						"import.meta.env.VITE_SPELLKAVE_DEV_TOKEN": JSON.stringify(devToken),
					},
		test: {
			environment: "jsdom",
			setupFiles: ["@spellkave/ui/vitest-jsdom-teardown"],
			// Files that only read the real docs corpus projection share one
			// projection per run (real-docs-projection.global-setup.ts); a file
			// listed here reads it through realDocsProjection(). `include` stays per
			// project: `extends: true` concatenates arrays with the root config.
			projects: [
				{
					extends: true,
					test: {
						name: "website",
						include: ["src/**/*.test.ts"],
						exclude: REAL_DOCS_PROJECTION_TESTS,
					},
				},
				{
					extends: true,
					test: {
						name: "compendium-corpus",
						include: REAL_DOCS_PROJECTION_TESTS,
						globalSetup: ["src/compendium/real-docs-projection.global-setup.ts"],
					},
				},
			],
		},
	};
});
