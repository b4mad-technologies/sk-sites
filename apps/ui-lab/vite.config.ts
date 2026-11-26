import { spellkaveThemeBoot } from "@spellkave/ui/vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { svelteTesting } from "@testing-library/svelte/vite";
import { defineConfig, type ViteUserConfig } from "vitest/config";
import { spellkaveDesignMdPlugin } from "./vite.design-md-plugin.ts";

export default defineConfig({
	plugins: [
		spellkaveThemeBoot(),
		spellkaveDesignMdPlugin(),
		tailwindcss(),
		svelte(),
		svelteTesting(),
	] as ViteUserConfig["plugins"],
	test: {
		environment: "jsdom",
		include: ["src/**/*.test.ts"],
		setupFiles: ["./src/test-setup.ts", "@spellkave/ui/vitest-jsdom-teardown"],
	},
});
