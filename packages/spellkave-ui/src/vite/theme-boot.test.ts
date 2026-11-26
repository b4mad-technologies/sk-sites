import { describe, expect, it } from "vitest";
import { THEME_BOOT_SCRIPT } from "../theme/boot.ts";
import { spellkaveThemeBoot } from "./theme-boot";

describe("spellkaveThemeBoot", () => {
	it("injects THEME_BOOT_SCRIPT as one head script", () => {
		const plugin = spellkaveThemeBoot();
		const hook = plugin.transformIndexHtml;
		expect(typeof hook).toBe("function");
		const invoke = hook as unknown as (
			html: string,
			ctx: { path: string; filename: string },
		) => Array<{ tag: string; children: string; injectTo: string }>;
		expect(invoke("", { path: "/index.html", filename: "index.html" })).toEqual([
			{
				tag: "script",
				children: THEME_BOOT_SCRIPT,
				injectTo: "head",
			},
		]);
	});
});
