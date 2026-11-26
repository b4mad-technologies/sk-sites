import { DEFAULT_THEME_ID, setTheme, THEME_COOKIE_NAME } from "@spellkave/ui/theme";
import { render, screen } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import SiteFooter from "./SiteFooter.svelte";

function clearTheme(): void {
	setTheme(DEFAULT_THEME_ID);
	document.cookie = `${THEME_COOKIE_NAME}=; Path=/; Max-Age=0`;
	document.documentElement.removeAttribute("data-theme");
	document.documentElement.style.colorScheme = "";
}

describe("SiteFooter", () => {
	afterEach(() => {
		clearTheme();
	});

	it("renders the theme switcher after the tagline", () => {
		render(SiteFooter);
		expect(document.querySelector('[data-slot="theme-switcher"]')).not.toBeNull();
		expect(screen.getByText("Spellkave")).toBeTruthy();
		expect(screen.getByText("The kave where spells never end.")).toBeTruthy();
		expect(screen.getByRole("link", { name: "Attribution" })).toBeTruthy();
		expect(screen.getByRole("link", { name: "Impressum" })).toBeTruthy();
	});

	it("setTheme writes data-theme and the default unsets it", () => {
		render(SiteFooter);
		setTheme("loom-paper");
		expect(document.documentElement.dataset.theme).toBe("loom-paper");
		setTheme(DEFAULT_THEME_ID);
		expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
		expect(document.documentElement.dataset.theme).toBeUndefined();
	});
});
