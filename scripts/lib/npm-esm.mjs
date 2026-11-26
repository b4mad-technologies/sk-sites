// Adapted from sk-sdk scripts/lib/npm-esm.mjs.
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { isBuiltin } from "node:module";
import { dirname, join } from "node:path";
import ts from "typescript";

// Workspace tooling resolves extensionless and `.ts` imports. Node ESM and
// NodeNext declaration consumers need the emitted file name instead. Every
// bare import must be a declared dependency, or the package breaks for
// consumers who do not happen to have it installed.
export function prepareEsmDirectory(directory, manifest) {
	const declared = new Set([manifest.name, ...Object.keys({
		...manifest.dependencies,
		...manifest.optionalDependencies,
		...manifest.peerDependencies,
	})]);
	walk(directory, declared);
}

function walk(directory, declared) {
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) {
			walk(path, declared);
		} else if (/\.(js|d\.ts|svelte)$/.test(path)) {
			rewriteImports(path, declared);
		}
	}
}

function rewriteImports(path, declared) {
	let code = readFileSync(path, "utf8");
	const runtime = !path.endsWith(".d.ts");
	const imports = ts.preProcessFile(code, true, true).importedFiles;
	for (const { fileName, pos, end } of imports.reverse()) {
		if (!/^\.\.?\//.test(fileName)) {
			if (runtime && !fileName.startsWith("#") && !isBuiltin(fileName)) {
				const dependency = fileName.split("/").slice(0, fileName.startsWith("@") ? 2 : 1).join("/");
				if (!declared.has(dependency)) {
					throw new Error(`Undeclared runtime dependency ${dependency} imported from ${path}`);
				}
			}
			continue;
		}
		const directory = dirname(path);
		const stem = fileName.replace(/\.ts$/, "");
		// A `.ts` import was compiled to `.js`; only keep it when no `.js` exists.
		if (stem === fileName && fileExists(join(directory, fileName))) continue;
		const alternatives = [`${stem}.js`, `${stem}/index.js`];
		const replacement = alternatives.find((candidate) => fileExists(join(directory, candidate)));
		if (!replacement) throw new Error(`No emitted module for ${fileName} in ${path}`);
		code = code.slice(0, pos + 1) + replacement + code.slice(end + 1);
	}

	// The maps describe the svelte-package output and its workspace sources.
	writeFileSync(path, code.replace(/\n\/\/# sourceMappingURL=[^\n]+\s*$/, "\n"));
}

function fileExists(path) {
	return statSync(path, { throwIfNoEntry: false })?.isFile();
}
