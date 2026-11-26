#!/usr/bin/env tsx
import { resolve } from "node:path";
import {
	validateMetadataDocs,
	type ValidateMetadataDocsOptions,
} from "../src/compendium/metadata-docs-validator.ts";
import { validateDocsCoverage } from "../src/compendium/docs-coverage-validator.ts";
import type { DocsProjectionRoot } from "../src/compendium/project-metadata-docs.ts";
import { DOCS_PROJECTION_ROOTS } from "./metadata-docs-registry.mts";

function defaults(): ValidateMetadataDocsOptions[] {
	return DOCS_PROJECTION_ROOTS.map(({ rootManifestPath, dependencyPaths }) => ({ rootManifestPath, dependencyPaths }));
}

function parseArgs(args: string[]): { roots: ValidateMetadataDocsOptions[]; defaults: boolean } {
	if (args.length === 0) return { roots: defaults(), defaults: true };
	if (args[0]!.startsWith("-")) throw new Error("usage: validate-metadata-docs [root.toml [--dependency bundle_id=path] ...]");
	const rootManifestPath = resolve(args[0] as string);
	const dependencyPaths: Record<string, string> = {};
	for (let index = 1; index < args.length; index += 1) {
		if (args[index] !== "--dependency" || args[index + 1] === undefined) {
			throw new Error("usage: validate-metadata-docs [root.toml [--dependency bundle_id=path] ...]");
		}
		const mapping = args[index + 1] as string;
		const equals = mapping.indexOf("=");
		if (equals <= 0 || equals === mapping.length - 1) throw new Error(`invalid dependency mapping '${mapping}'`);
		dependencyPaths[mapping.slice(0, equals)] = resolve(mapping.slice(equals + 1));
		index += 1;
	}
	return { roots: [{ rootManifestPath, dependencyPaths }], defaults: false };
}

const rawArgs = process.argv.slice(2);
while (rawArgs[0] === "--") rawArgs.shift();
const parsed = parseArgs(rawArgs);

let failed = false;
for (const options of parsed.roots) {
	const diagnostics = validateMetadataDocs(options);
	for (const diagnostic of diagnostics) console.error(`${diagnostic.path}: ${diagnostic.message}`);
	if (diagnostics.length > 0) failed = true;
}
if (!failed) {
	const projectionRoots: readonly DocsProjectionRoot[] = parsed.defaults
		? DOCS_PROJECTION_ROOTS
		: parsed.roots.map(({ rootManifestPath, dependencyPaths }) => ({ rootManifestPath, dependencyPaths }));
	const coverage = validateDocsCoverage(projectionRoots);
	for (const diagnostic of coverage.diagnostics) console.error(`${diagnostic.path}: ${diagnostic.message}`);
	if (coverage.diagnostics.length > 0) failed = true;
	else console.log(`published docs coverage: ${coverage.rich_entries} rich artifacts, ${coverage.technical_rows} runtime rows, ${coverage.technical_metadata_envelopes} metadata envelopes`);
}

if (failed) process.exitCode = 1;
else console.log("metadata docs: ok");
