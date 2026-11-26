import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import DocsPageHeaderHost from "./DocsPageHeader.host.svelte";
import DocsPageHeader from "./DocsPageHeader.svelte";
import {
	journeyHeroPartyUrl,
	journeyLivingWorldUrl,
	journeyShapeWorldUrl,
	wovenWorldHeroUrl,
} from "./index";
import JourneyBand from "./JourneyBand.svelte";
import NarrativeHero from "./NarrativeHero.svelte";
import ProductMastheadHost from "./ProductMasthead.host.svelte";
import ProductMasthead from "./ProductMasthead.svelte";

describe("DocsPageHeader", () => {
	it("uses the shared handbook hierarchy for a plain-text introduction", () => {
		const { container } = render(DocsPageHeader, {
			title: "Introduction",
			description: "A calm guide to the system.",
		});

		const heading = screen.getByRole("heading", { level: 1, name: "Introduction" });
		expect(heading.className).toContain("text-4xl");
		expect(heading.className).toContain("sm:text-5xl");
		expect(container.querySelector("p")?.textContent).toBe("A calm guide to the system.");
	});

	it("renders rich introduction blocks without adding a nested paragraph", () => {
		const { container } = render(DocsPageHeaderHost);

		expect(screen.getByRole("link", { name: "Start here" }).getAttribute("href")).toBe(
			"/docs/start",
		);
		expect(container.querySelector("p p")).toBeNull();
	});
});

describe("ProductMasthead", () => {
	it("renders the shared brand, product navigation, and sign-in treatment", () => {
		const { container } = render(ProductMasthead);

		expect(container.querySelector('[data-slot="product-masthead"]')).toBeTruthy();
		expect(screen.getByRole("link", { name: "SPELLKAVE" })).toBeTruthy();
		const brand = container.querySelector('[data-slot="product-masthead-brand"]');
		const grid = brand?.parentElement?.parentElement;
		expect(grid?.className).toContain("grid-cols-[1fr_auto]");
		expect(screen.getByRole("navigation", { name: "Spellkave product navigation" })).toBeTruthy();
		const nav = screen.getByRole("navigation", { name: "Spellkave product navigation" });
		const links = Array.from(nav.querySelectorAll("a"));
		expect(links.map((link) => link.textContent?.replaceAll("◆", "").trim())).toEqual([
			"Play",
			"Chat",
			"Account",
			"Admin",
			"Maps",
		]);
		expect(screen.getByRole("link", { name: /Sign in/ })).toBeTruthy();
		expect(screen.getByRole("link", { name: "SPELLKAVE" }).className).toContain("min-h-11");
		expect(screen.getByRole("link", { name: /Sign in/ }).className).toContain("min-h-11");
	});

	it("draws a woven glyph before a nav label when one is named", () => {
		// The glyph is decorative: it must not add a second accessible name, so
		// the link is still found by its label alone.
		const { container } = render(ProductMasthead, {
			navigation: [
				{ label: "Map", href: "/map", icon: "maps" },
				{ label: "Chronicle", href: "/chronicle" },
			],
		});

		const icons = container.querySelectorAll('[data-slot="woven-icon"]');
		expect(icons.length).toBe(1);
		expect(icons[0]?.getAttribute("aria-hidden")).toBe("true");
		expect(screen.getByRole("link", { name: /Map/ })).toBeTruthy();
		expect(screen.getByRole("link", { name: /Chronicle/ })).toBeTruthy();
	});

	it("accepts product-specific navigation without changing the shared treatment", () => {
		render(ProductMasthead, {
			brand: "WORLD ATLAS",
			brandHref: "/",
			navigation: [{ label: "Places", href: "/places", current: true }],
			signInLabel: "Account",
			signInHref: "/account",
		});

		expect(screen.getByRole("link", { name: "WORLD ATLAS" }).getAttribute("href")).toBe("/");
		const current = screen.getByRole("link", { name: /Places/ });
		expect(current.getAttribute("aria-current")).toBe("page");
		expect(current.className).toContain("text-[color:var(--primary)]");
		expect(current.querySelector("span")?.className).toContain("rotate-45");
		expect(screen.getByRole("link", { name: /Account/ }).getAttribute("href")).toBe("/account");
	});

	it("renders a signed-in account cluster instead of sign-in", async () => {
		const onSignOut = vi.fn();
		render(ProductMasthead, {
			account: { displayName: "Test Player" },
			onSignOut,
			accountLinks: [{ label: "Public site", href: "https://spellkave.com" }],
		});

		expect(screen.getByText("Test Player")).toBeTruthy();
		expect(screen.queryByRole("link", { name: /Sign in/ })).toBeNull();
		expect(screen.getByRole("link", { name: /public site/i }).getAttribute("href")).toBe(
			"https://spellkave.com",
		);
		await fireEvent.click(screen.getByRole("button", { name: /sign out/i }));
		expect(onSignOut).toHaveBeenCalledOnce();
	});

	it("puts the account group on its own row below lg when accountLinks are present", () => {
		const { container } = render(ProductMasthead, {
			brand: "Spellkave worlds",
			contextText: "admin.spellkave.com",
			account: { displayName: "owner1 machine" },
			onSignOut: vi.fn(),
			accountLinks: [
				{ label: "Your API keys", href: "https://account.spellkave.com/" },
				{ label: "Public site", href: "https://spellkave.com" },
			],
		});

		const brand = container.querySelector('[data-slot="product-masthead-brand"]');
		const account = container.querySelector('[data-slot="product-masthead-account"]');
		const context = container.querySelector('[data-slot="product-masthead-context"]');
		const grid = brand?.parentElement?.parentElement;

		expect(brand).toBeTruthy();
		expect(account).toBeTruthy();
		expect(brand?.parentElement).not.toBe(account);
		expect(grid?.className).toContain("grid-cols-1");
		expect(grid?.className).toContain("lg:grid-cols-[1fr_auto_1fr]");
		expect(brand?.className).toContain("whitespace-nowrap");
		expect(account?.className).toContain("w-full");
		expect(context?.className).toContain("hidden");
		expect(context?.className).toContain("sm:block");
	});

	it("hides sign-in and navigation when the room does not use them", () => {
		render(ProductMasthead, {
			brand: "Spellkave Account",
			brandHref: null,
			navigation: [],
			signInHref: null,
			contextText: "account.spellkave.com",
		});

		expect(screen.queryByRole("link", { name: "Spellkave Account" })).toBeNull();
		expect(screen.getByText("Spellkave Account")).toBeTruthy();
		expect(screen.getByText("account.spellkave.com")).toBeTruthy();
		expect(screen.queryByRole("navigation")).toBeNull();
		expect(screen.queryByRole("link", { name: /Sign in/ })).toBeNull();
	});

	it("renders a context snippet beside the brand", () => {
		render(ProductMastheadHost, { worldName: "The Woven Marches" });

		expect(screen.getByText("The Woven Marches")).toBeTruthy();
		expect(screen.getByText("Renn")).toBeTruthy();
		expect(screen.getByRole("link", { name: "Map" })).toBeTruthy();
	});
});

describe("NarrativeHero", () => {
	it("renders default Living Grammar headline, actions, 4 story steps, and default asset artwork", () => {
		const { container } = render(NarrativeHero);

		// Default asset backdrop
		const img = container.querySelector("img");
		expect(img).toBeTruthy();
		expect(img?.getAttribute("src")).toBe(wovenWorldHeroUrl);

		// Headline
		expect(
			screen.getByRole("heading", { name: "The world understands what you mean" }),
		).toBeTruthy();

		// Subcopy
		expect(
			screen.getByText(
				/See what is possible.*Choose what you do.*The world responds—and remembers./s,
			),
		).toBeTruthy();

		// Two Actions
		expect(screen.getByRole("link", { name: "Enter Spellkave" })).toBeTruthy();
		expect(screen.getByRole("link", { name: "Watch a world" })).toBeTruthy();

		// 4 Story Steps as nested headings (default h2 under h1 hero)
		expect(screen.getByRole("heading", { level: 2, name: "See" })).toBeTruthy();
		expect(screen.getByText("A guarded bridge")).toBeTruthy();
		expect(screen.getByRole("heading", { level: 2, name: "Choose" })).toBeTruthy();
		expect(screen.getByText("Offer safe passage")).toBeTruthy();
		expect(screen.getByRole("heading", { level: 2, name: "World responds" })).toBeTruthy();
		expect(screen.getByText("The guard lowers the spear")).toBeTruthy();
		expect(screen.getByRole("heading", { level: 2, name: "The world changes" })).toBeTruthy();
		expect(screen.getByText("The road opens and remembers your name.")).toBeTruthy();

		const threadSteps = screen.getByRole("list", { name: "Action thread steps" });
		expect(threadSteps.querySelector("li")?.className).toContain(
			"before:bg-[color:var(--primary)]/60",
		);
		expect(container.querySelector(".living-thread-base")).toBeTruthy();
		expect(container.querySelector(".living-thread-draw")?.getAttribute("pathLength")).toBe("1");
	});

	it("renders custom headline, nested step headings (h3 under h2), copy, and action handlers with target/rel", () => {
		render(NarrativeHero, {
			headline: "CUSTOM WORLD TITLE",
			copy: "Custom description copy text",
			headingLevel: "h2",
			primaryAction: { label: "START JOURNEY", href: "/start", target: "_blank", rel: "noopener" },
			secondaryAction: { label: "EXPLORE MAP", href: "/map" },
		});

		expect(screen.getByRole("heading", { level: 2, name: "CUSTOM WORLD TITLE" })).toBeTruthy();
		expect(screen.getByRole("heading", { level: 3, name: "See" })).toBeTruthy();
		expect(screen.getByText("Custom description copy text")).toBeTruthy();

		const primaryLink = screen.getByRole("link", { name: "START JOURNEY" });
		expect(primaryLink.getAttribute("target")).toBe("_blank");
		expect(primaryLink.getAttribute("rel")).toBe("noopener");
		expect(screen.getByRole("link", { name: "EXPLORE MAP" })).toBeTruthy();
	});

	it("renders custom 4 story steps when provided", () => {
		const customSteps = [
			{ step: 1, label: "STEP ONE", description: "First detail" },
			{ step: 2, label: "STEP TWO", description: "Second detail" },
			{ step: 3, label: "STEP THREE", description: "Third detail" },
			{ step: 4, label: "STEP FOUR", description: "Fourth detail" },
		];

		render(NarrativeHero, { storySteps: customSteps });

		expect(screen.getByText("STEP ONE")).toBeTruthy();
		expect(screen.getByText("First detail")).toBeTruthy();
		expect(screen.getByText("STEP FOUR")).toBeTruthy();
		expect(screen.getByText("Fourth detail")).toBeTruthy();
	});
});

describe("JourneyBand", () => {
	it("renders default 3 journey steps with shipping raster scenes and tagline", () => {
		const { container } = render(JourneyBand);

		// Heading / Section
		expect(screen.getByRole("region", { name: "Three-step journey band" })).toBeTruthy();

		// 3 Steps
		expect(screen.getByRole("heading", { name: "Enter a living world" })).toBeTruthy();
		expect(
			screen.getByText(
				"Explore a persistent world already in motion. No fixed path waits for you.",
			),
		).toBeTruthy();

		expect(screen.getByRole("heading", { name: "Claim your hero" })).toBeTruthy();
		expect(screen.getByText("Become part of its places, relationships and history.")).toBeTruthy();

		expect(screen.getByRole("heading", { name: "Shape what comes next" })).toBeTruthy();
		expect(
			screen.getByText(
				"Discover possible actions, attempt your own ideas, and leave changes others inherit.",
			),
		).toBeTruthy();

		const sceneUrls = Array.from(container.querySelectorAll("img"), (image) =>
			image.getAttribute("src"),
		);
		expect(sceneUrls).toEqual([journeyLivingWorldUrl, journeyHeroPartyUrl, journeyShapeWorldUrl]);
		expect(container.querySelector("svg")).toBeNull();

		// Tagline strip
		const tagline = screen.getByText("Open rules. Meaningful possibilities. Lasting consequences.");
		expect(tagline.className).toContain("sk-label");
	});

	it("renders custom 3 journey steps and tagline", () => {
		const customSteps = [
			{ step: 1, title: "FIRST PHASE", description: "Phase 1 info" },
			{ step: 2, title: "SECOND PHASE", description: "Phase 2 info" },
			{ step: 3, title: "THIRD PHASE", description: "Phase 3 info" },
		];

		render(JourneyBand, {
			steps: customSteps,
			tagline: "CUSTOM TAGLINE FOR LIVING WORLD",
		});

		expect(screen.getByRole("heading", { name: "FIRST PHASE" })).toBeTruthy();
		expect(screen.getByText("Phase 1 info")).toBeTruthy();
		expect(screen.getByRole("heading", { name: "THIRD PHASE" })).toBeTruthy();
		expect(screen.getByText("Phase 3 info")).toBeTruthy();
		expect(screen.getByText("CUSTOM TAGLINE FOR LIVING WORLD")).toBeTruthy();
	});
});
