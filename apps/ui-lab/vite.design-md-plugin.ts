import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Plugin } from "vite";

const VIRTUAL_ID = "virtual:spellkave-design-md";
const RESOLVED_ID = `\0${VIRTUAL_ID}`;

const PARSER_REL = "vendor/impeccable/design-parser.mjs";

function findRepoRoot(startDir: string): string {
	let dir = startDir;
	for (;;) {
		const designMdPath = path.join(dir, "DESIGN.md");
		const parserPath = path.join(dir, PARSER_REL);
		if (fs.existsSync(designMdPath) && fs.existsSync(parserPath)) {
			return dir;
		}
		const parent = path.dirname(dir);
		if (parent === dir) {
			throw new Error(
				`Could not resolve repo root (DESIGN.md + ${PARSER_REL}) walking up from ${startDir}`,
			);
		}
		dir = parent;
	}
}

async function loadParseDesignMd(parserPath: string): Promise<(md: string) => unknown> {
	if (!fs.existsSync(parserPath)) {
		throw new Error(
			`DESIGN.md parser missing at ${parserPath}. ui-lab refuses to ship an empty rule set.`,
		);
	}
	const mod = (await import(pathToFileURL(parserPath).href)) as {
		parseDesignMd?: (md: string) => unknown;
	};
	if (typeof mod.parseDesignMd !== "function") {
		throw new Error(`parseDesignMd export missing from ${parserPath}`);
	}
	return mod.parseDesignMd;
}

export function spellkaveDesignMdPlugin(): Plugin {
	const pluginDir = path.dirname(fileURLToPath(import.meta.url));
	const repoRoot = findRepoRoot(pluginDir);
	const designMdPath = path.join(repoRoot, "DESIGN.md");
	const parserPath = path.join(repoRoot, PARSER_REL);

	return {
		name: "spellkave-design-md",
		async configResolved() {
			await loadParseDesignMd(parserPath);
			if (!fs.existsSync(designMdPath)) {
				throw new Error(`DESIGN.md missing at ${designMdPath}`);
			}
		},
		resolveId(id) {
			if (id === VIRTUAL_ID) return RESOLVED_ID;
			return undefined;
		},
		async load(id) {
			if (id !== RESOLVED_ID) return null;
			this.addWatchFile(designMdPath);
			this.addWatchFile(parserPath);
			const parseDesignMd = await loadParseDesignMd(parserPath);
			const source = fs.readFileSync(designMdPath, "utf8");
			const model = parseDesignMd(source);
			if (model == null || typeof model !== "object") {
				throw new Error(`parseDesignMd returned no model from ${designMdPath}`);
			}
			return `export default ${JSON.stringify(model)};\n`;
		},
	};
}
