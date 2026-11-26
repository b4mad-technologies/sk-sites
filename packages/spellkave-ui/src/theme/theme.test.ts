import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { applyStoredTheme, THEME_BOOT_SCRIPT, THEME_COOKIE_NAME } from "./boot";
import { initTheme, setTheme, theme } from "./theme.svelte";
import { DEFAULT_THEME_ID, THEMES } from "./themes";

const themesDir = join(dirname(fileURLToPath(import.meta.url)), "../tokens/themes");

function clearThemeCookie(): void {
	document.cookie = `${THEME_COOKIE_NAME}=; Path=/; Max-Age=0`;
	document.documentElement.removeAttribute("data-theme");
	document.documentElement.style.colorScheme = "";
	theme.id = DEFAULT_THEME_ID;
}

describe("theme registry", () => {
	it("matches additional theme file basenames plus the default id", () => {
		const files = readdirSync(themesDir)
			.filter((name) => name.endsWith(".css"))
			.map((name) => name.replace(/\.css$/, ""))
			.sort();
		const extra = THEMES.filter((entry) => entry.id !== DEFAULT_THEME_ID)
			.map((entry) => entry.id)
			.sort();
		expect(extra).toEqual(files);
		expect(THEMES.some((entry) => entry.id === DEFAULT_THEME_ID)).toBe(true);
		expect(files).not.toContain(DEFAULT_THEME_ID);
	});

	it("ships a boot snippet with no imports or top-level await", () => {
		expect(THEME_BOOT_SCRIPT).not.toMatch(/\bimport\b/);
		expect(THEME_BOOT_SCRIPT).not.toMatch(/\bawait\b/);
		expect(THEME_BOOT_SCRIPT.startsWith("(function(){")).toBe(true);
	});
});

describe("theme store", () => {
	afterEach(() => {
		clearThemeCookie();
	});

	it("setTheme writes data-theme and the sk_theme cookie", () => {
		setTheme("loom-paper");
		expect(theme.id).toBe("loom-paper");
		expect(document.documentElement.dataset.theme).toBe("loom-paper");
		expect(document.documentElement.getAttribute("data-theme")).toBe("loom-paper");
		expect(document.cookie).toContain(`${THEME_COOKIE_NAME}=loom-paper`);
		expect(document.documentElement.style.colorScheme).toBe("light");
	});

	it("the default theme removes the data-theme attribute", () => {
		setTheme("loom-paper");
		setTheme(DEFAULT_THEME_ID);
		expect(theme.id).toBe(DEFAULT_THEME_ID);
		expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
		expect(document.documentElement.dataset.theme).toBeUndefined();
		expect(document.cookie).toContain(`${THEME_COOKIE_NAME}=${DEFAULT_THEME_ID}`);
		expect(document.documentElement.style.colorScheme).toBe("dark");
	});

	it("applyStoredTheme and initTheme restore a cookie before paint semantics", () => {
		document.cookie = `${THEME_COOKIE_NAME}=worlds-in-motion; Path=/`;
		expect(applyStoredTheme()).toBe("worlds-in-motion");
		expect(document.documentElement.getAttribute("data-theme")).toBe("worlds-in-motion");
		clearThemeCookie();
		document.cookie = `${THEME_COOKIE_NAME}=loom-paper; Path=/`;
		initTheme();
		expect(theme.id).toBe("loom-paper");
		expect(document.documentElement.dataset.theme).toBe("loom-paper");
	});
});
