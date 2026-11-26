import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
	extractSrdCreditFromNotice,
	isAttributionPath,
	LICENSE_NOTICE,
	SHIPPABLE_CREDITS,
	SRD_5_2_1_CREDIT,
} from "./attribution";

const noticePath = resolve(import.meta.dirname, "../../../../NOTICE");

describe("attribution constants", () => {
	it("matches the SRD 5.2.1 credit block in NOTICE byte for byte", () => {
		const notice = readFileSync(noticePath, "utf8");
		expect(SRD_5_2_1_CREDIT).toBe(extractSrdCreditFromNotice(notice));
	});

	it("lists only NOTICE shippable rows and omits research/private material", () => {
		const ids = SHIPPABLE_CREDITS.map((row) => row.id);
		expect(ids).toEqual(["srd-5-2-1", "kavemouth-maps", "noto-sans-glyphs"]);
		const joined = SHIPPABLE_CREDITS.map((row) => `${row.title}\n${row.credit}`).join("\n");
		expect(joined).not.toMatch(/Cairn/i);
		expect(joined).not.toMatch(/Erde\s*&\s*Wasser/i);
		expect(joined).not.toMatch(/Phandelver/i);
		expect(joined).not.toMatch(/Foundry/i);
		expect(joined).not.toMatch(/Dungeons\s*&\s*Dragons/i);
	});

	it("states the first-party licences without inventing addresses or company data", () => {
		expect(LICENSE_NOTICE).toContain("Marcel Hild, trading as B4mad Technologies");
		expect(LICENSE_NOTICE).toContain("PolyForm Shield License 1.0.0");
		expect(LICENSE_NOTICE).toContain("CC BY 4.0");
		expect(LICENSE_NOTICE).not.toMatch(/proprietary|all rights reserved/i);
		expect(LICENSE_NOTICE).not.toMatch(/\d{5}/);
		expect(LICENSE_NOTICE).not.toMatch(/@/);
	});

	it("recognises the public attribution path", () => {
		expect(isAttributionPath("/attribution")).toBe(true);
		expect(isAttributionPath("/attribution/")).toBe(true);
		expect(isAttributionPath("/")).toBe(false);
		expect(isAttributionPath("/auth/login")).toBe(false);
	});
});
