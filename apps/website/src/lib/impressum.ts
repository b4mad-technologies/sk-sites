/**
 * Operator-supplied Impressum values for spellkave.com.
 *
 * Do not reformat the address, invent fields, or imply that
 * "B4mad Technologies" is a separate legal person — LICENSE states it is
 * the Geschäftsbezeichnung of sole proprietor Marcel Hild.
 */

/** Path served by the static SPA (wrangler single-page-application fallback). */
export const IMPRESSUM_PATH = "/impressum";

/** Natural person / sole proprietor (verbatim). */
export const IMPRESSUM_PERSON_NAME = "Marcel Hild";

/**
 * Business name only (Geschäftsbezeichnung). Not a GmbH, Ltd, or other
 * separate legal person.
 */
export const IMPRESSUM_BUSINESS_NAME = "B4mad Technologies";

/** Postal address lines after the business name, country last (verbatim). */
export const IMPRESSUM_ADDRESS_LINES = ["Britzweg 51", "24111 Kiel", "Germany"] as const;

/** Full provider block under § 5 DDG (name, business name, address, country). */
export const IMPRESSUM_PROVIDER_LINES = [
	IMPRESSUM_PERSON_NAME,
	IMPRESSUM_BUSINESS_NAME,
	...IMPRESSUM_ADDRESS_LINES,
] as const;

export const IMPRESSUM_EMAIL = "hild@b4mad.net";

/** Operator-supplied telephone (verbatim). */
export const IMPRESSUM_TELEPHONE = "+49 431 1280939";

/**
 * Clarifies that the business name is not a separate legal entity.
 * Grounded in LICENSE; German because the Impressum page is German.
 */
export const IMPRESSUM_BUSINESS_NAME_NOTE =
	"B4mad Technologies ist die Geschäftsbezeichnung des Einzelunternehmers Marcel Hild und keine eigene juristische Person.";

export function isImpressumPath(pathname: string): boolean {
	const normalized = pathname.replace(/\/+$/, "") || "/";
	return normalized === IMPRESSUM_PATH;
}
