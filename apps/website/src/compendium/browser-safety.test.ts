import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * No module a Svelte component can reach may import a Node built-in.
 *
 * The website is a static SPA: everything under `src/` that a component pulls
 * in is bundled for the browser, where `node:fs` and friends do not exist.
 * Vite does not fail the build for it — it externalizes the module and the page
 * dies at load with "Module node:fs has been externalized for browser
 * compatibility", a blank screen and no build-time signal.
 *
 * This has now happened twice. `srd-catalogue-groups.ts`'s header records the
 * first (a blank `DocsPageOverview`), and the second was
 * `CatalogueEntryPage.svelte` reaching `srd-sections.ts`, which reads srd-cc's
 * `sections.toml` from disk, through a new grouping module (sk-jay0.3.5.86).
 * Both were caught by a human loading the page, because the unit tests run in
 * Node where the import is perfectly valid. Hence a static check instead of a
 * third discovery.
 *
 * The rule this enforces is not "never read the file": it is that a build-time
 * reader stays build-time. The projection (`project-metadata-docs.ts`, run by
 * `scripts/project-metadata-docs.mts`) reads authored files and puts what the
 * reader needs into the published artifact; components consume that projected
 * data. Type-only imports are erased before bundling and are therefore allowed.
 */

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function sourceFiles(directory: string): string[] {
	const found: string[] = [];
	for (const entry of readdirSync(directory)) {
		const path = join(directory, entry);
		if (statSync(path).isDirectory()) found.push(...sourceFiles(path));
		else if (path.endsWith(".svelte")) found.push(path);
	}
	return found;
}

/** Relative import specifiers of one module, minus the type-only ones. */
function valueImports(source: string): string[] {
	const specifiers: string[] = [];
	// `import … from "x"`, `export … from "x"` and bare `import "x"`.
	const pattern = /(?:^|\n)\s*(?:import|export)(\s+type\s|\s[\s\S]*?\sfrom\s|\s+)["']([^"']+)["']/g;
	for (const match of source.matchAll(pattern)) {
		const [, clause, specifier] = match;
		if (clause?.includes(" type ")) continue;
		if (specifier !== undefined) specifiers.push(specifier);
	}
	return specifiers;
}

function resolveRelative(from: string, specifier: string): string | undefined {
	if (!specifier.startsWith(".")) return undefined;
	const base = resolve(dirname(from), specifier);
	for (const candidate of [base, `${base}.ts`, `${base}.svelte`, join(base, "index.ts")])
		if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
	return undefined;
}

/** Every module a component reaches, with the chain that reached it. */
function reachable(entry: string): Map<string, string[]> {
	const chains = new Map<string, string[]>([[entry, [entry]]]);
	const queue = [entry];
	while (queue.length > 0) {
		const current = queue.shift();
		if (current === undefined) continue;
		const chain = chains.get(current) ?? [current];
		for (const specifier of valueImports(readFileSync(current, "utf8"))) {
			const target = resolveRelative(current, specifier);
			if (target === undefined || chains.has(target)) continue;
			chains.set(target, [...chain, target]);
			queue.push(target);
		}
	}
	return chains;
}

describe("browser safety", () => {
	it("finds the Svelte components to check", () => {
		expect(sourceFiles(SRC).length).toBeGreaterThan(20);
	});

	it("reaches no Node built-in from any Svelte component", () => {
		const offenders: string[] = [];
		for (const component of sourceFiles(SRC))
			for (const [module, chain] of reachable(component)) {
				const builtins = valueImports(readFileSync(module, "utf8")).filter((specifier) =>
					specifier.startsWith("node:"),
				);
				if (builtins.length === 0) continue;
				offenders.push(
					`${builtins.join(", ")} in ${chain.map((step) => step.slice(SRC.length + 1)).join(" -> ")}`,
				);
			}
		expect(offenders).toEqual([]);
	});
});
