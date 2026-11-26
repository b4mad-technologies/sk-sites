// Vitest globalSetup, after @spellkave/behaviour's built-in one (which clears
// the results): records the run (commit, dirty) with this package and the
// behaviour tooling as watched paths, then bundles bin/skgen.js once into
// behaviour/.bin/skgen.mjs, which the scenarios run with plain node instead
// of starting tsx for each run.
//
// Two facts of skgen's source shape where the bundle goes:
// - src/text/prompts.ts finds templates/ two folders above its own file. In
//   the bundle its "own file" is behaviour/.bin/skgen.mjs, and two folders up
//   is this package again, so the bundle stays at that depth.
// - src/image/*-cli.ts each run their `main` when `import.meta.url` is the
//   started script. In one bundle every module shares the bundle's URL, so
//   starting the bundle itself would run all three. The scenarios start
//   behaviour/.bin/skgen-start.mjs instead, which only imports the bundle.
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { bundleCli, startRun } from "@spellkave/behaviour/setup";

import docs from "../docs.config.ts";

const PKG = resolve(import.meta.dirname, "../..");
const REPO = resolve(PKG, "../..");
const BIN = resolve(PKG, "behaviour/.bin");

export function setup(): void {
	startRun(resolve(PKG, "behaviour/.results"), REPO, docs.watched);
	bundleCli(resolve(PKG, "bin/skgen.js"), resolve(BIN, "skgen.mjs"));
	writeFileSync(resolve(BIN, "skgen-start.mjs"), 'await import("./skgen.mjs");\n');
}
