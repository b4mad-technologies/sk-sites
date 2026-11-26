import type { Plugin } from "vite";
import { THEME_BOOT_SCRIPT } from "../theme/boot.ts";

/** Injects THEME_BOOT_SCRIPT into each app index.html `<head>`. */
export function spellkaveThemeBoot(): Plugin {
	return {
		name: "spellkave-theme-boot",
		transformIndexHtml() {
			return [
				{
					tag: "script",
					children: THEME_BOOT_SCRIPT,
					injectTo: "head",
				},
			];
		},
	};
}
