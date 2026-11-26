import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		include: ["src/**/*.test.ts"],
		// The behaviour suite (behaviour/, vitest.behaviour.config.ts) and the
		// guide drift test need @spellkave/behaviour, which lives in sk-sdk and
		// is not on npm yet. They stay in the tree and run again once it is.
		exclude: ["src/behaviour-docs.test.ts"],
	},
});
