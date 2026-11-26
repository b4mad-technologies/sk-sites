// Check the tarballs from scripts/pack-npm.mjs, modelled on sk-sdk
// scripts/check-packed-sdk-npm.mjs: tarball content first, then a clean npm
// install of all packages from a local registry and a plain Node import of
// every Node-safe entry point.
//
// Usage: node scripts/check-packed-npm.mjs ARTIFACT_DIRECTORY [--content-only]
import { execFile, execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { npmPackages } from "./lib/npm-packages.mjs";
import { startPackedRegistry } from "./lib/packed-registry.mjs";

const [artifactDirectory, flag] = process.argv.slice(2);
if (!artifactDirectory) throw new Error("Usage: node scripts/check-packed-npm.mjs ARTIFACT_DIRECTORY [--content-only]");
const artifacts = resolve(artifactDirectory);
const tarballs = readdirSync(artifacts).filter((name) => name.endsWith(".tgz")).map((name) => join(artifacts, name));
const expected = new Map(npmPackages.map((entry) => [`@spellkave/${entry.name}`, entry]));
const failures = [];
const fail = (message) => failures.push(message);

const manifests = [];
for (const tarball of tarballs) {
	const files = execFileSync("tar", ["-tzf", tarball], { encoding: "utf8" }).trim().split("\n")
		.map((path) => path.replace(/^package\//, ""));
	const manifest = JSON.parse(execFileSync("tar", ["-xOzf", tarball, "package/package.json"], { encoding: "utf8" }));
	manifests.push(manifest);
	const entry = expected.get(manifest.name);
	const name = manifest.name;
	if (!entry) {
		fail(`${tarball}: ${name} is not in scripts/lib/npm-packages.mjs`);
		continue;
	}

	for (const file of ["package.json", "LICENSE", "NOTICE", ...(entry.art ? ["ART.md"] : [])]) {
		if (!files.includes(file)) fail(`${name}: missing ${file}`);
	}
	for (const file of files) {
		if (!file.startsWith("dist/") && !["package.json", "LICENSE", "NOTICE", "ART.md", "README.md"].includes(file)) {
			fail(`${name}: unexpected file ${file}`);
		}
		if (/\.(test|spec)\.|(^|\/)(fixtures|__tests__)\/|\.map$|(^|\/)test-setup\./.test(file)) {
			fail(`${name}: test or source map file ${file}`);
		}
		if (/\.ts$/.test(file) && !file.endsWith(".d.ts")) fail(`${name}: TypeScript source ${file}`);
	}

	if (manifest.private) fail(`${name}: private`);
	if (manifest.publishConfig?.access !== "public") fail(`${name}: publishConfig.access is not public`);
	if (!manifest.license) fail(`${name}: no license`);
	if (manifest.scripts || manifest.devDependencies) fail(`${name}: scripts or devDependencies left in`);
	for (const field of ["dependencies", "optionalDependencies", "peerDependencies"]) {
		for (const [dependency, range] of Object.entries(manifest[field] ?? {})) {
			if (range.startsWith("workspace:")) fail(`${name}: ${dependency} still uses ${range}`);
			if (expected.has(dependency) && range !== manifest.version) {
				fail(`${name}: ${dependency}@${range} does not match ${manifest.version}`);
			}
		}
	}
	const targets = Object.values(manifest.exports).flatMap((value) => typeof value === "string" ? [value] : Object.values(value));
	for (const target of [...targets, manifest.main, manifest.types, manifest.svelte].filter(Boolean)) {
		if (!files.includes(target.replace(/^\.\//, ""))) fail(`${name}: export target ${target} not in tarball`);
	}
	console.log(`${name}: ${files.length} files, ${targets.length} export targets checked`);
}
for (const name of expected.keys()) {
	if (!manifests.some((manifest) => manifest.name === name)) fail(`missing tarball for ${name}`);
}
if (new Set(manifests.map(({ version }) => version)).size > 1) fail("tarballs carry different versions");
report();
if (flag === "--content-only") process.exit(0);

const run = promisify(execFile);
const consumer = mkdtempSync(join(tmpdir(), "sk-sites-npm-consumer-"));
let registry;
try {
	registry = await startPackedRegistry(tarballs);
	writeFileSync(join(consumer, ".npmrc"), `registry=https://registry.npmjs.org/\n@spellkave:registry=${registry.url}\n`);
	writeFileSync(join(consumer, "package.json"), `${JSON.stringify({ name: "consumer", private: true, type: "module" })}\n`);
	// npm installs required peers (svelte, tailwindcss) itself.
	await run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund",
		...manifests.map(({ name, version }) => `${name}@${version}`)], { cwd: consumer });
	const specifiers = npmPackages.flatMap(({ name, nodeEntries }) =>
		nodeEntries.map((entry) => `@spellkave/${name}${entry.slice(1)}`));
	const code = specifiers.map((specifier) => `import ${JSON.stringify(specifier)};\n`).join("");
	try {
		execFileSync(process.execPath, ["--no-experimental-strip-types", "--input-type=module", "--eval", code], {
			cwd: consumer,
			stdio: "inherit",
		});
		console.log(`isolated npm install and plain Node import passed for ${specifiers.length} entry points`);
	} catch {
		fail("plain Node import of the Node-safe entry points failed (see above)");
	}
	// Every shipped component must compile with the consumer's Svelte, without
	// a TypeScript preprocessor.
	const compileAll = `
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { compile } from "svelte/compiler";
let count = 0;
for (const name of ${JSON.stringify(npmPackages.map(({ name }) => name))}) {
	const dist = join("node_modules/@spellkave", name, "dist");
	for (const file of readdirSync(dist, { recursive: true })) {
		if (!String(file).endsWith(".svelte")) continue;
		compile(readFileSync(join(dist, file), "utf8"), { filename: file, generate: "client" });
		count++;
	}
}
console.log("compiled " + count + " Svelte components without a preprocessor");
`;
	try {
		execFileSync(process.execPath, ["--input-type=module", "--eval", compileAll], { cwd: consumer, stdio: "inherit" });
	} catch {
		fail("a shipped Svelte component does not compile (see above)");
	}
} finally {
	registry?.server.close();
	rmSync(consumer, { recursive: true, force: true });
}
report();

function report() {
	if (failures.length === 0) return;
	for (const message of failures) console.error(`::error::${message}`);
	process.exit(1);
}
