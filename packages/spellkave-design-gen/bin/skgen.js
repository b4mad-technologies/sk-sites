#!/usr/bin/env tsx
// Thin launcher, mirroring packages/spellkave-ops/bin/skop.js.
try {
	const { runSkgen } = await import("../src/cli.ts");
	process.exitCode = await runSkgen(process.argv.slice(2));
} catch (err) {
	if (err?.code === "ERR_MODULE_NOT_FOUND" && String(err?.message).includes("@spellkave/")) {
		process.stderr.write(
			"skgen: workspace dependency not installed. Run `pnpm install` at the repository root once, then retry.\n",
		);
		process.exitCode = 1;
	} else {
		throw err;
	}
}
