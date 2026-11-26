import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { extractSrdCreditFromNotice, SRD_5_2_1_CREDIT } from "../lib/attribution";
import AttributionBlock from "./AttributionBlock.svelte";

const noticePath = resolve(import.meta.dirname, "../../../../NOTICE");

describe("AttributionBlock", () => {
	it("renders the NOTICE SRD 5.2.1 credit block verbatim on /srd pages", () => {
		const notice = readFileSync(noticePath, "utf8");
		render(AttributionBlock);

		const rendered = screen.getByTestId("srd-credit").textContent ?? "";
		expect(rendered).toBe(extractSrdCreditFromNotice(notice));
		expect(rendered).toBe(SRD_5_2_1_CREDIT);
		expect(screen.getByTestId("srd-page-attribution")).toBeTruthy();
		const heading = screen.getByRole("heading", { name: "Sources & licenses" });
		expect(heading).toBeTruthy();
		expect(heading.classList.contains("text-xs")).toBe(true);
		expect(heading.classList.contains("leading-5")).toBe(true);
		expect(screen.getByTestId("srd-credit").classList.contains("break-words")).toBe(true);
		expect(
			screen.getByRole<HTMLAnchorElement>("link", { name: "System Reference Document 5.2.1" }).href,
		).toBe("https://www.dndbeyond.com/srd");
	});
});
