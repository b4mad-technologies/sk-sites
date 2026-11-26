import { render, screen, within } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Hero from "./Hero.svelte";

describe("Hero", () => {
	it("uses labelled condition info links on cards without colouring HP", () => {
		render(Hero, {
			self: {
				name: "Pilot",
				hp: 7,
				conditions: ["custom/raw"],
				conditionDetails: [{ id: "custom/raw", label: "Drafting" }],
			},
			infoCards: true,
		});
		expect(screen.getByRole("button", { name: "Drafting" })).toBeTruthy();
		expect(document.querySelector('[data-slot="play-vital-value"]')?.className).not.toContain(
			"destructive",
		);
	});
	it("uses standard info-card links for full-sheet fields", () => {
		render(Hero, {
			density: "stage",
			self: {
				name: "Pilot",
				conditions: ["other/fatigue"],
				conditionDetails: [
					{
						id: "other/fatigue",
						label: "Fatigue",
						description: "Condition explanation.",
						stackCount: 3,
						expiresAtTick: 1200,
					},
				],
			},
			infoCards: true,
		});
		for (const label of ["Fatigue"]) {
			const link = screen.getByRole("button", { name: label });
			expect(link.getAttribute("aria-haspopup")).toBe("dialog");
			expect(link.className).toContain("info-link");
		}
	});
	it("marks supplied full-sheet explanations as standard card links", () => {
		const self = {
			name: "Pilot",
			conditions: [],
			sheetVitals: [
				{ id: "other/stress", label: "Stress", value: "0", description: "<b>Stress prose</b>" },
			],
			abilities: [
				{ id: "other/focus", label: "Focus", score: 12, modifier: 1, description: "Focus prose" },
			],
			identityDetails: [{ id: "other/origin", label: "Origin", description: "Origin prose" }],
		};
		const card = render(Hero, { self, density: "card" });
		expect(document.querySelector('[data-slot="play-description"]')).toBeNull();
		card.unmount();
		render(Hero, { self, density: "stage", infoCards: true });
		for (const label of ["Stress", "Focus", "Origin"]) {
			expect(screen.getByRole("button", { name: label })).toBeTruthy();
		}
		expect(screen.getByRole("button", { name: "Stress" }).className).toContain("info-link");
	});
	it("renders configured sheet values in order, including text and zero values", () => {
		render(Hero, {
			self: {
				name: "Pilot",
				conditions: [],
				sheetVitals: [
					{ id: "other/stress", label: "Stress", value: "0" },
					{ id: "other/rank", label: "Clearance", value: "Amber" },
				],
			},
			density: "stage",
		});
		expect(
			Array.from(document.querySelectorAll("dl dt"), (node) => node.textContent?.trim()),
		).toEqual(["Stress", "Clearance"]);
		expect(screen.getByText("0")).toBeTruthy();
		expect(screen.getByText("Amber")).toBeTruthy();
	});

	const self = {
		name: "Renn the Roadwarden",
		level: 1,
		hp: 4,
		ac: 12,
		xp: 175,
		conditions: ["Bloodied"],
	};

	it("renders the self sheet from world-shaped props", () => {
		render(Hero, { self });
		expect(document.querySelector('[data-slot="play-hero"]')).not.toBeNull();
		expect(screen.getByRole("heading", { name: "Renn the Roadwarden" })).toBeTruthy();
		expect(screen.getByText("Bloodied")).toBeTruthy();
	});

	it("renders strip density as a glyph, name, and HP datum only", () => {
		render(Hero, { self, density: "strip" });
		const frame = document.querySelector('[data-slot="play-hero"]');
		expect(frame?.getAttribute("data-density")).toBe("strip");
		expect(screen.getByRole("heading", { name: "Renn the Roadwarden" })).toBeTruthy();
		expect(screen.getByText("HP 4")).toBeTruthy();
		expect(document.querySelector("dl")).toBeNull();
	});

	it("renders card density as today's tighter summary", () => {
		render(Hero, { self, density: "card" });
		expect(document.querySelector('[data-slot="play-hero"]')?.getAttribute("data-density")).toBe(
			"card",
		);
		expect(document.querySelector("dl")).not.toBeNull();
		expect(screen.getByText("Bloodied")).toBeTruthy();
	});

	it("renders stage density with the full figures grid", () => {
		render(Hero, { self, density: "stage" });
		expect(document.querySelector('[data-slot="play-hero"]')?.getAttribute("data-density")).toBe(
			"stage",
		);
		expect(document.querySelector("dl")).not.toBeNull();
		expect(screen.getByText("Bloodied")).toBeTruthy();
	});

	it("renders card density with the short HP/AC/XP terms, not the full words (sk-jay0.1.8.5 finding 2)", () => {
		render(Hero, { self, density: "card" });
		expect(screen.getByText("HP")).toBeTruthy();
		expect(screen.queryByText("Hit points")).toBeNull();
	});

	it("drops the appearance subtitle at card density so the stats grid fits the rest height, keeping it at stage", () => {
		const withSubtitle = { ...self, subtitle: "Human fighter, a soldier's bearing" };
		const card = render(Hero, { self: withSubtitle, density: "card" });
		expect(screen.queryByText(withSubtitle.subtitle)).toBeNull();
		card.unmount();

		render(Hero, { self: withSubtitle, density: "stage" });
		expect(screen.getByText(withSubtitle.subtitle)).toBeTruthy();
	});

	it("renders bare chrome with no border, keeping the name and level line as content", () => {
		render(Hero, { self, density: "card", chrome: "bare" });
		const el = document.querySelector('[data-slot="play-hero"]');
		expect(el?.tagName).toBe("DIV");
		expect(el?.hasAttribute("data-play-frame")).toBe(false);
		expect(screen.getByRole("heading", { name: "Renn the Roadwarden" })).toBeTruthy();
		expect(screen.getByText("Level 1")).toBeTruthy();
	});

	// sk-jay0.1.8.19: the bare-chrome name shared `.tile-body`'s plain
	// `overflow: hidden` at rest with every other card tile — a stage-sized
	// two-line wrap of the name alone (64px, live-measured) pushed the
	// conditions row below the fold on the fight beat (scrollHeight 211 vs
	// clientHeight 167, apps/play at 1280x720). Card clamps the name to one
	// line at a smaller size instead of wrapping it; stage keeps the full
	// size and wrap, since stage scrolls and has no fixed budget to protect.
	it("clamps the bare-chrome name to one line at card density, keeping the full wrap at stage", () => {
		const card = render(Hero, { self, density: "card", chrome: "bare" });
		const cardHeading = screen.getByRole("heading", { name: "Renn the Roadwarden" });
		expect(cardHeading.className).toContain("truncate");
		expect(cardHeading.className).not.toContain("text-2xl");
		// Verifier follow-up: `truncate` can cut a longer name to an ellipsis
		// with no other surface naming the hero — the card's own `title`
		// attribute is the fallback (hover/long-press) for exactly that case.
		// Stage never truncates, so it carries no such attribute.
		expect(cardHeading.getAttribute("title")).toBe("Renn the Roadwarden");
		card.unmount();

		render(Hero, { self, density: "stage", chrome: "bare" });
		const stageHeading = screen.getByRole("heading", { name: "Renn the Roadwarden" });
		expect(stageHeading.className).not.toContain("truncate");
		expect(stageHeading.className).toContain("text-2xl");
		expect(stageHeading.hasAttribute("title")).toBe(false);
	});

	describe("the full sheet at stage (sk-jay0.1.8.6)", () => {
		const sheet = {
			...self,
			species: "Human",
			className: "Fighter",
			background: "Soldier",
			proficiency: 2,
			abilities: [
				{ id: "srd/str", label: "STR", score: 16, modifier: 3 },
				{ id: "srd/dex", label: "DEX", score: 12, modifier: 1 },
				{ id: "srd/con", label: "CON", score: 14, modifier: 2 },
				{ id: "srd/int", label: "INT", score: 10, modifier: 0 },
				{ id: "srd/wis", label: "WIS", score: 11, modifier: 0 },
				{ id: "srd/cha", label: "CHA", score: 9, modifier: -1 },
			],
			skills: [{ id: "srd/skill/athletics", label: "Athletics" }],
			masteries: [],
			appearance: "A soldier's bearing, a scar over one brow.",
			backstory: "Six years on the King's highways out of the Ashwold garrison.",
		};

		it("shows the origin line, the six abilities with modifiers, skills, appearance and backstory", () => {
			render(Hero, { self: sheet, density: "stage" });
			for (const name of ["Human", "Fighter", "Soldier"]) {
				expect(screen.getByRole("button", { name })).toBeTruthy();
			}
			const abilities = document.querySelector('[data-testid="hero-abilities"]');
			expect(abilities).not.toBeNull();
			expect(within(abilities as HTMLElement).getByText("STR")).toBeTruthy();
			expect(within(abilities as HTMLElement).getByText("+3")).toBeTruthy();
			expect(within(abilities as HTMLElement).getByText("CHA")).toBeTruthy();
			expect(within(abilities as HTMLElement).getByText("-1")).toBeTruthy();
			expect(screen.getByText("Athletics")).toBeTruthy();
			expect(screen.getByText(sheet.appearance)).toBeTruthy();
			expect(screen.getByText(sheet.backstory)).toBeTruthy();
		});

		it("shows Proficiency alongside HP/AC/Level/XP in the stage vitals row, without disturbing card's own three", () => {
			const stage = render(Hero, { self: sheet, density: "stage" });
			expect(screen.getByText("Proficiency")).toBeTruthy();
			stage.unmount();

			render(Hero, { self: sheet, density: "card" });
			expect(screen.queryByText("Proficiency")).toBeNull();
			expect(screen.getByText("HP")).toBeTruthy();
		});

		it("says None for skills/masteries/abilities the world has not reported yet", () => {
			render(Hero, { self, density: "stage" });
			expect(document.querySelector('[data-testid="hero-abilities"]')).toBeNull();
			expect(screen.getAllByText("None").length).toBeGreaterThanOrEqual(2);
		});

		it("keeps abilities/skills/masteries/appearance/backstory out of card and strip density", () => {
			render(Hero, { self: sheet, density: "card" });
			expect(document.querySelector('[data-testid="hero-abilities"]')).toBeNull();
			expect(screen.queryByText("Athletics")).toBeNull();
			expect(screen.queryByText(sheet.appearance)).toBeNull();
		});
	});
});
