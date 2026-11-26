// Build and pack the design system packages for npm, modelled on sk-sdk
// scripts/pack-sdk-npm.mjs. The workspace manifests stay private and point at
// source for the apps; this script writes the published manifest into a
// staging copy, so a plain `pnpm publish` of a workspace package cannot
// release raw source by mistake.
//
// Usage: node scripts/pack-npm.mjs VERSION OUTPUT_DIRECTORY
// Prints the tarball file names as a JSON array.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { prepareEsmDirectory } from "./lib/npm-esm.mjs";
import { npmPackages } from "./lib/npm-packages.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const [version, destination] = process.argv.slice(2);
const stableVersion = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
if (!version || (!stableVersion.test(version) && !["0.0.0-ci", "0.0.0-bootstrap"].includes(version)) || !destination) {
	throw new Error("Usage: node scripts/pack-npm.mjs VERSION OUTPUT_DIRECTORY");
}

const published = new Set(npmPackages.map(({ name }) => `@spellkave/${name}`));
const sveltePackage = join(root, "node_modules", ".bin", "svelte-package");
const output = resolve(destination);
mkdirSync(output, { recursive: true });

const stagingRoot = mkdtempSync(join(tmpdir(), "sk-sites-npm-"));
const tarballs = [];
try {
	for (const { name, art } of npmPackages) {
		const directory = `packages/spellkave-${name}`;
		const source = join(root, directory);
		const staged = join(stagingRoot, name);
		const manifest = JSON.parse(readFileSync(join(source, "package.json"), "utf8"));

		manifest.version = version;
		delete manifest.private;
		delete manifest.devDependencies;
		delete manifest.scripts;
		manifest.repository = {
			type: "git",
			url: "git+https://github.com/b4mad-technologies/sk-sites.git",
			directory,
		};
		manifest.publishConfig = { access: "public", registry: "https://registry.npmjs.org/" };

		for (const field of ["dependencies", "optionalDependencies", "peerDependencies"]) {
			for (const [dependency, range] of Object.entries(manifest[field] ?? {})) {
				if (!range.startsWith("workspace:")) continue;
				if (!published.has(dependency)) {
					throw new Error(`${manifest.name} needs unpublished workspace package ${dependency}`);
				}
				manifest[field][dependency] = version;
			}
		}

		mkdirSync(staged);
		const dist = join(staged, "dist");
		execFileSync(sveltePackage, ["-i", "src", "-o", dist, "-t", "tsconfig.json"], {
			cwd: source,
			stdio: ["ignore", "ignore", "inherit"],
		});
		removeTestFiles(dist);
		prepareEsmDirectory(dist, manifest);

		for (const field of ["main", "types", "svelte"]) {
			if (manifest[field]) manifest[field] = emitted(manifest[field], field === "types" ? "types" : "default");
		}
		manifest.exports = Object.fromEntries(Object.entries(manifest.exports).map(([entry, value]) => {
			if (typeof value === "string" && value.endsWith(".css")) return [entry, emitted(value)];
			const conditions = typeof value !== "string" ? value
				: value.endsWith(".svelte") ? { types: value, svelte: value } : { types: value, default: value };
			return [entry, Object.fromEntries(Object.entries(conditions).map(([condition, path]) => [
				condition, emitted(path, condition),
			]))];
		}));
		for (const path of exportPaths(manifest)) {
			if (!existsSync(join(staged, path))) throw new Error(`Missing ${manifest.name} build output ${path}`);
		}

		manifest.files = ["dist", "NOTICE", ...(art ? ["ART.md"] : [])];
		for (const file of ["LICENSE", "NOTICE", ...(art ? ["ART.md"] : [])]) {
			cpSync(join(root, file), join(staged, file));
		}
		if (existsSync(join(source, "README.md"))) {
			cpSync(join(source, "README.md"), join(staged, "README.md"));
		}

		writeFileSync(join(staged, "package.json"), `${JSON.stringify(manifest, null, "\t")}\n`);
		const result = execFileSync("npm", ["pack", "--ignore-scripts", "--json", "--pack-destination", output], {
			cwd: staged,
			encoding: "utf8",
		});
		const [packed] = JSON.parse(result);
		tarballs.push(packed.filename);
	}
} finally {
	rmSync(stagingRoot, { recursive: true, force: true });
}

process.stdout.write(`${JSON.stringify(tarballs)}\n`);

// Source path -> svelte-package output path for one export condition.
function emitted(path, condition = "default") {
	if (!path.startsWith("./src/")) throw new Error(`Expected a ./src export, found ${path}`);
	const out = path.replace("./src/", "./dist/");
	if (out.endsWith(".svelte")) return condition === "types" ? `${out}.d.ts` : out;
	if (out.endsWith(".ts")) return out.slice(0, -3) + (condition === "types" ? ".d.ts" : ".js");
	return out;
}

function exportPaths(manifest) {
	return Object.values(manifest.exports).flatMap((value) => typeof value === "string" ? [value] : Object.values(value));
}

// Tests, test fixtures and source maps are not part of the published API.
function removeTestFiles(directory) {
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) {
			if (["fixtures", "__tests__", "test"].includes(entry.name)) rmSync(path, { recursive: true });
			else removeTestFiles(path);
		} else if (/\.(test|spec)\.|^test-setup\.|\.map$/.test(entry.name)) {
			rmSync(path);
		}
	}
}
