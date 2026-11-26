// keep-file(K5): presentation contract shared by Play's two transcript renderers; layout is also checked in headless Chromium.
import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import SpeechBubble from "./SpeechBubble.svelte";

describe("SpeechBubble", () => {
	it("keeps an outgoing message and its speaker in a right-aligned fit-content bubble", () => {
		render(SpeechBubble, { speaker: "You", outgoing: true, text: "A short answer." });
		expect(screen.getByRole("heading", { name: "You" })).toBeTruthy();
		expect(
			document.querySelector('[data-slot="speech-bubble"]')?.getAttribute("data-direction"),
		).toBe("outgoing");
		expect(screen.getByText("A short answer.")).toBeTruthy();
	});
	it("omits only the heading of a structurally proven continuation", () => {
		render(SpeechBubble, { speaker: "Visitor", continued: true, text: "More words." });
		expect(screen.queryByRole("heading")).toBeNull();
		expect(screen.getByText("More words.")).toBeTruthy();
	});
});
