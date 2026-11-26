import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import {
	IMPRESSUM_EMAIL,
	IMPRESSUM_PERSON_NAME,
	IMPRESSUM_PROVIDER_LINES,
	IMPRESSUM_TELEPHONE,
} from "../lib/impressum";
import ImpressumPage from "./ImpressumPage.svelte";

describe("ImpressumPage", () => {
	it("renders without a session and carries only the supplied legal fields", () => {
		render(ImpressumPage);

		expect(screen.getByRole("heading", { level: 1, name: "Impressum" })).toBeTruthy();
		expect(screen.getByRole("heading", { name: "Angaben gemäß § 5 DDG" })).toBeTruthy();
		expect(
			screen.getByRole("heading", { name: "Verantwortlich i. S. d. § 18 Abs. 2 MStV" }),
		).toBeTruthy();

		const address = screen.getByTestId("impressum-address").textContent ?? "";
		for (const line of IMPRESSUM_PROVIDER_LINES) {
			expect(address).toContain(line);
		}
		// Address lines must appear in order; <br> may surface as newlines in jsdom.
		expect(address).toMatch(
			/Marcel Hild\s*B4mad Technologies\s*Britzweg 51\s*24111 Kiel\s*Germany/,
		);

		expect(screen.getByTestId("impressum-email").textContent).toBe(IMPRESSUM_EMAIL);
		expect(screen.getByTestId("impressum-email").getAttribute("href")).toBe(
			`mailto:${IMPRESSUM_EMAIL}`,
		);
		const telephone = screen.getByTestId("impressum-telephone");
		expect(telephone.textContent).toContain("Telefon");
		expect(telephone.textContent).toContain(IMPRESSUM_TELEPHONE);
		expect(telephone.querySelector("a")?.getAttribute("href")).toBe(
			`tel:${IMPRESSUM_TELEPHONE.replace(/\s+/g, "")}`,
		);

		const responsible = screen.getByTestId("impressum-responsible").textContent ?? "";
		expect(responsible).toContain(IMPRESSUM_PERSON_NAME);
		expect(responsible).toContain("Britzweg 51");
		expect(responsible).toContain("24111 Kiel");
		expect(responsible).toContain("Germany");

		const body = document.body.textContent ?? "";
		expect(body).not.toMatch(/USt-IdNr/i);
		expect(body).not.toMatch(/Umsatzsteuer/i);
		expect(body).not.toMatch(/VAT/i);
		expect(body).toMatch(/Telefon/);
		expect(body).toContain(IMPRESSUM_TELEPHONE);
		expect(body).not.toMatch(/Handelsregister|HRB|Amtsgericht/i);
		expect(body).not.toMatch(/Aufsichtsbeh[oö]rde/i);
		expect(body).not.toMatch(/Datenschutz|privacy policy/i);
		expect(body).not.toMatch(/Online-Streitbeilegung|\bODR\b|ec\.europa\.eu\/consumers\/odr/i);
		expect(body).not.toMatch(/\bGmbH\b|\bLtd\b/);
	});
});
