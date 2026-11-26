import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const css = readFileSync(
	join(dirname(fileURLToPath(import.meta.url)), "tokens/styles.css"),
	"utf8",
);

const PLAY_ONLY_SELECTORS = [
	".world-switch",
	".world-chip",
	".hero-choices",
	".hero-taken",
	".claim-status",
	".membership-note",
];

describe("shared Living Grammar stylesheet", () => {
	it("owns the token theme and shared shell rules", () => {
		expect(css).toContain('@import "tailwindcss"');
		expect(css).toContain("@theme inline");
		expect(css).toContain("--gold: #d3a342");
		expect(css).toContain(".play-layout");
		expect(css).toContain(".threshold p");
	});

	it("sources this package rather than an app tree", () => {
		expect(css).toContain('@source "../**/*.{svelte,ts}"');
		expect(css).not.toContain("../../../packages/spellkave-ui");
		expect(css).not.toContain("apps/account");
		expect(css).not.toContain("apps/operator");
		expect(css).not.toContain("apps/play");
	});

	it("does not keep rules for a header nobody renders any more", () => {
		// .play-masthead / .session-button were Play's hand-rolled header, replaced
		// by the shared ProductMasthead (sk-jay0.5.1.8.2). A test that pinned them
		// would anchor dead CSS and make the next cleanup look risky.
		expect(css).not.toContain(".play-masthead");
		expect(css).not.toContain(".session-button");
	});

	it("ships the stream-scroll utility with real end padding and a stable gutter", () => {
		const rule = css.match(/\.sk-stream-scroll\s*\{([^}]*)\}/)?.[1] ?? "";
		expect(rule).toContain("padding-inline-end: 0.75rem");
		expect(rule).toContain("scrollbar-gutter: stable");
		// Bottom inset only (sk-jay0.1.8.110): a top padding band inside the
		// scrollport shows scrolled rows directly under the Table filter bar.
		expect(rule).toMatch(/padding-block:\s*0 0\.5rem/);
		expect(rule).not.toMatch(/padding-(block-start|top):\s*(?!0[;\s])/);
	});

	it("leaves play-only hero-choice rules out of the shared sheet", () => {
		for (const selector of PLAY_ONLY_SELECTORS) {
			expect(css).not.toContain(selector);
		}
	});
});
