import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const GITHUB_HREF = /https?:\/\/github\.com/i;

function walkFiles(dir: string, suffix: string): string[] {
	if (!existsSync(dir)) return [];
	const out: string[] = [];
	for (const name of readdirSync(dir)) {
		const abs = join(dir, name);
		if (statSync(abs).isDirectory()) out.push(...walkFiles(abs, suffix));
		else if (name.endsWith(suffix)) out.push(abs);
	}
	return out;
}

describe("compendium stays on-site", () => {
	it("has no GitHub href under src/compendium", () => {
		const files = walkFiles(join(import.meta.dirname), ".ts").concat(
			walkFiles(join(import.meta.dirname), ".svelte"),
		);
		expect(files.length).toBeGreaterThan(5);
		const hits: string[] = [];
		for (const file of files) {
			const text = readFileSync(file, "utf8");
			if (GITHUB_HREF.test(text)) hits.push(file);
		}
		expect(hits).toEqual([]);
	});

	it("keeps projected navigation and asset href fields on-site", () => {
		const files = walkFiles(join(import.meta.dirname, "../../public/compendium/docs"), ".json");
		const hits: string[] = [];
		for (const file of files) {
			const visit = (value: unknown, key = "") => {
				if (typeof value === "string") {
					if (["href", "artifact_href", "asset_href"].includes(key) && GITHUB_HREF.test(value))
						hits.push(`${file}:${key}`);
					return;
				}
				if (Array.isArray(value))
					value.forEach((item) => {
						visit(item);
					});
				else if (value && typeof value === "object")
					Object.entries(value).forEach(([childKey, item]) => {
						visit(item, childKey);
					});
			};
			visit(JSON.parse(readFileSync(file, "utf8")));
		}
		expect(hits).toEqual([]);
	});
});
