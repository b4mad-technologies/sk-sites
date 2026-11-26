import { describe, expect, it } from "vitest";
import {
	IMPRESSUM_ADDRESS_LINES,
	IMPRESSUM_BUSINESS_NAME,
	IMPRESSUM_BUSINESS_NAME_NOTE,
	IMPRESSUM_EMAIL,
	IMPRESSUM_PATH,
	IMPRESSUM_PERSON_NAME,
	IMPRESSUM_PROVIDER_LINES,
	IMPRESSUM_TELEPHONE,
	isImpressumPath,
} from "./impressum";

describe("impressum constants", () => {
	it("keeps operator-supplied identity and address verbatim", () => {
		expect(IMPRESSUM_PERSON_NAME).toBe("Marcel Hild");
		expect(IMPRESSUM_BUSINESS_NAME).toBe("B4mad Technologies");
		expect([...IMPRESSUM_ADDRESS_LINES]).toEqual(["Britzweg 51", "24111 Kiel", "Germany"]);
		expect([...IMPRESSUM_PROVIDER_LINES]).toEqual([
			"Marcel Hild",
			"B4mad Technologies",
			"Britzweg 51",
			"24111 Kiel",
			"Germany",
		]);
		expect(IMPRESSUM_EMAIL).toBe("hild@b4mad.net");
		expect(IMPRESSUM_TELEPHONE).toBe("+49 431 1280939");
	});

	it("does not treat the business name as a separate legal person", () => {
		expect(IMPRESSUM_BUSINESS_NAME_NOTE).toMatch(/Geschäftsbezeichnung/);
		expect(IMPRESSUM_BUSINESS_NAME_NOTE).toMatch(/keine eigene juristische Person/);
		expect(IMPRESSUM_BUSINESS_NAME_NOTE).not.toMatch(/GmbH|Ltd|UG|AG/i);
	});

	it("recognises the public impressum path", () => {
		expect(IMPRESSUM_PATH).toBe("/impressum");
		expect(isImpressumPath("/impressum")).toBe(true);
		expect(isImpressumPath("/impressum/")).toBe(true);
		expect(isImpressumPath("/")).toBe(false);
		expect(isImpressumPath("/attribution")).toBe(false);
	});
});
