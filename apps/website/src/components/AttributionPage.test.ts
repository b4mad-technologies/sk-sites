import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import {
	extractSrdCreditFromNotice,
	LICENSE_NOTICE,
	SRD_5_2_1_CREDIT,
} from "../lib/attribution";
import AttributionPage from "./AttributionPage.svelte";

const noticePath = resolve(import.meta.dirname, "../../../../NOTICE");

describe("AttributionPage", () => {
	it("renders without a session and quotes the NOTICE SRD block exactly", () => {
		render(AttributionPage);

		expect(screen.getByRole("heading", { level: 1, name: "Attribution" })).toBeTruthy();
		expect(screen.getByTestId("license-notice").textContent).toBe(LICENSE_NOTICE);
		const pixellabNote = screen.getByTestId("pixellab-note").textContent ?? "";
		expect(pixellabNote).toContain("CC BY 4.0");
		expect(pixellabNote).toContain(
			"Some images were generated with PixelLab. PixelLab's terms restrict using its outputs to train other models; that restriction may apply to you.",
		);
		expect(pixellabNote).not.toMatch(/not an open-source grant/i);

		const srd = screen.getByTestId("srd-credit").textContent ?? "";
		const notice = readFileSync(noticePath, "utf8");
		expect(srd).toBe(SRD_5_2_1_CREDIT);
		expect(srd).toBe(extractSrdCreditFromNotice(notice));

		expect(screen.getByTestId("credit-elven-tower-maps").textContent).toMatch(
			/Map art © Elven Tower Maps, used under CC BY 4\.0\./,
		);
		expect(
			screen.getByRole("link", {
				name: "https://www.patreon.com/elventower/posts/creative-commons-153067169",
			}),
		).toBeTruthy();
		expect(screen.getByTestId("credit-noto-sans-glyphs").textContent).toMatch(
			/Noto Sans Regular glyph PBFs/,
		);
		expect(screen.getByTestId("credit-noto-sans-glyphs").textContent).toMatch(
			/SIL Open Font License 1\.1/,
		);

		// Hard legal constraint: no extra Wizards product naming.
		expect(document.body.textContent).not.toMatch(/Dungeons\s*&\s*Dragons/i);
		expect(document.body.textContent).toMatch(/5E compatible/);
	});
});
