/**
 * Print the repo packages whose fixtures the compendium census projects, as
 * one JSON line: `{"packages":["packages/spellkave-srd-cc/", ...]}`.
 *
 * The `docs-census-pairing` gate (packages/spellkave-gates) runs this to learn
 * which adventure packages it must guard, so the root lists below stay the one
 * source of truth (sk-jay0.3.26.25).
 */
import { relative } from "node:path";
import { MANIFEST_COVERAGE_PROJECTION_ROOTS } from "../src/compendium/compendium-census.ts";
import { DOCS_PROJECTION_ROOTS, REPO_ROOT } from "./metadata-docs-registry.mts";

const manifests = [...DOCS_PROJECTION_ROOTS, ...MANIFEST_COVERAGE_PROJECTION_ROOTS].flatMap(
	(root) => [root.rootManifestPath, ...Object.values(root.dependencyPaths ?? {})],
);
const packages = new Set(
	manifests.map((path) => {
		const [top, name] = relative(REPO_ROOT, path).split("/");
		return `${top}/${name}/`;
	}),
);
console.log(JSON.stringify({ packages: [...packages].sort() }));
