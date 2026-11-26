import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Speech from "./Speech.svelte";

describe("Speech", () => {
	const dialog = {
		speaker: "Mira",
		prompt: "She wipes a mug behind the bar counter.",
		choices: [{ slot: 1, text: "Any news from the road?" }],
		sayEnabled: true,
		nameField: false,
	};

	it("renders the speaker, prompt, and answer choices", () => {
		render(Speech, { label: "Mira answers", dialog });
		expect(document.querySelector('[data-slot="play-speech"]')).not.toBeNull();
		expect(screen.getByRole("heading", { name: "Mira" })).toBeTruthy();
		expect(screen.getByRole("button", { name: "1. Any news from the road?" })).toBeTruthy();
	});

	it("renders strip density as a glyph, speaker label, and speaker datum", () => {
		render(Speech, { label: "Mira answers", dialog, density: "strip" });
		expect(document.querySelector('[data-slot="play-speech"]')?.getAttribute("data-density")).toBe(
			"strip",
		);
		expect(screen.getByRole("heading", { name: "Mira" })).toBeTruthy();
		expect(screen.queryByRole("button", { name: "1. Any news from the road?" })).toBeNull();
	});

	it("renders card and stage density with the answer choices reachable", () => {
		const card = render(Speech, { label: "Mira answers", dialog, density: "card" });
		expect(card.getByRole("button", { name: "1. Any news from the road?" })).toBeTruthy();
		card.unmount();

		const stage = render(Speech, { label: "Mira answers", dialog, density: "stage" });
		expect(stage.getByRole("button", { name: "1. Any news from the road?" })).toBeTruthy();
	});

	it("renders bare chrome with no border, the speaker still shown as content on its own paper quote", () => {
		render(Speech, { label: "Mira answers", dialog, density: "stage", chrome: "bare" });
		const el = document.querySelector('[data-slot="play-speech"]');
		expect(el?.tagName).toBe("DIV");
		expect(el?.hasAttribute("data-play-frame")).toBe(false);
		expect(screen.getByRole("heading", { name: "Mira" })).toBeTruthy();
		expect(document.querySelector(".sk-play-quote")).not.toBeNull();
		expect(screen.getByRole("button", { name: "1. Any news from the road?" })).toBeTruthy();
	});
});
