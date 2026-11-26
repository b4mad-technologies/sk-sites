import { svelte } from "@sveltejs/vite-plugin-svelte";
import { svelteTesting } from "@testing-library/svelte/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [svelte(), svelteTesting()],
	test: {
		environment: "jsdom",
		setupFiles: ["@spellkave/ui/vitest-jsdom-teardown"],
		include: ["src/**/*.test.ts"],
	},
});
