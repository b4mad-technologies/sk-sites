import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import InfoHint from "./InfoHint.svelte";

describe("InfoHint", () => {
	it("names itself by the whole reason and opens it as a tooltip on focus", async () => {
		render(InfoHint, { props: { label: "Why: predicate_rejected" } });
		const glyph = screen.getByRole("button", { name: "Why: predicate_rejected" });
		expect(glyph.textContent?.trim()).toBe("ⓘ");
		await fireEvent.focus(glyph);
		// jsdom cannot place the floating content, so bits leaves it
		// `visibility: hidden`; query the slot, not a visible role.
		await waitFor(() => {
			const tip = document.querySelector('[data-slot="tooltip-content"]');
			expect(tip?.textContent).toContain("Why: predicate_rejected");
		});
	});
});
