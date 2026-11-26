import { describe, expect, it } from "vitest";
import { firstSentence } from "./first-sentence";

describe("firstSentence", () => {
	it("cuts at the first sentence-ending punctuation followed by whitespace", () => {
		expect(
			firstSentence("A creature's Armor Class represents how hard it is to hit. Second sentence."),
		).toBe("A creature's Armor Class represents how hard it is to hit.");
	});

	it("stops at ! or ? as well as .", () => {
		expect(firstSentence("Really? Yes! Third.")).toBe("Really?");
	});

	it("keeps the whole text when there is no sentence-ending punctuation", () => {
		expect(firstSentence("No terminal punctuation here")).toBe("No terminal punctuation here");
	});

	it("does not cut on a decimal point, only on punctuation followed by whitespace", () => {
		expect(firstSentence("The DC is 15.5 for this check. Next sentence.")).toBe(
			"The DC is 15.5 for this check.",
		);
	});

	it("strips Markdown emphasis markers", () => {
		expect(firstSentence("*Bold* and _italic_ text end here.")).toBe(
			"Bold and italic text end here.",
		);
	});

	it("caps long sentences with an ellipsis under the max length", () => {
		const long = `${"word ".repeat(40).trim()}.`;
		const result = firstSentence(long, 160);
		expect(result.length).toBeLessThanOrEqual(160);
		expect(result.endsWith("…")).toBe(true);
	});

	it("keeps an underscore inside a word, so a placeholder survives", () => {
		// Outcome descriptions are authored with `{target_name}`-style
		// placeholders (sk-jay0.7.96). Stripping every underscore turned those
		// into `{targetname}` in every inline summary.
		expect(firstSentence("You strike {target_name}.")).toBe("You strike {target_name}.");
		expect(firstSentence("Reads srd/proficiency_bonus first.")).toBe(
			"Reads srd/proficiency_bonus first.",
		);
	});

	it("still strips emphasis markers at a word boundary", () => {
		expect(firstSentence("This is _emphasised_ text.")).toBe("This is emphasised text.");
		expect(firstSentence("This is *starred* text.")).toBe("This is starred text.");
	});
});
