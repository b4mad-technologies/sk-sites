// A content author or agent reading docs/guide.md must find what skgen does
// today: the guide and its evidence page are generated from the current
// .feature files, and every @code tag in them names a file and symbol that
// exists, so a code link never lands on nothing. Reads repository files only;
// no network. The guide itself needs a full behaviour run to regenerate
// (`pnpm guide`).
import { resolve } from "node:path";

import { danglingCodeTags, guideDrift, loadDocsConfig } from "@spellkave/behaviour/docs";
import { expect, it } from "vitest";

const PKG = resolve(import.meta.dirname, "..");

// keep(K4): guide drift gate and dangling @code links, one check
it("docs/guide.md matches the .feature files and every @code tag names existing code", async () => {
	const config = await loadDocsConfig(PKG);
	expect(guideDrift(PKG, config)).toEqual([]);
	expect(danglingCodeTags(PKG, config)).toEqual([]);
});
