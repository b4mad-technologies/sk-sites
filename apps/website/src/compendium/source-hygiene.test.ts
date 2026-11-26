import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A raw control byte in source is invisible in review. `git diff` treats the
 * whole file as binary and prints nothing, so a separator typed as a literal
 * NUL instead of `\u0000` hid in `delivery.ts` across several commits, and a
 * pair separator did the same in a test file before it. The runtime string is
 * identical either way; only the escape is reviewable. The likely source is a
 * file-writing tool that decodes escape sequences on write: this very file
 * came out of one with raw bytes in place of its escapes, and this test caught
 * it on its first run.
 */

const SRC = resolve(import.meta.dirname, "..");
const TEXT = /\.(?:ts|mts|js|mjs|svelte|json|toml|md|css)$/;

function* files(dir: string): Generator<string> {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) yield* files(path);
		else if (TEXT.test(entry.name)) yield path;
	}
}

describe("source hygiene", () => {
	it("keeps raw control bytes out of the website's source", () => {
		const offenders: string[] = [];
		for (const path of files(SRC)) {
			// Tab, line feed and carriage return are ordinary text.
			// biome-ignore lint/suspicious/noControlCharactersInRegex: finding control characters is this test's whole purpose.
			if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(readFileSync(path, "utf8")))
				offenders.push(relative(SRC, path));
		}
		expect(offenders, "write the byte as an escape such as \\u0000").toEqual([]);
	});
});
