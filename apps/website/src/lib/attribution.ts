/**
 * Public attribution copy for spellkave.com.
 *
 * Source of truth: repository-root NOTICE (and LICENSE and ART.md for the
 * first-party licences). Do not paraphrase the SRD credit block — CC BY 4.0 requires
 * the wording carried in NOTICE.
 */

/** Path served by the static SPA (wrangler single-page-application fallback). */
export const ATTRIBUTION_PATH = "/attribution";

/**
 * Required SRD 5.2.1 credit block from NOTICE, de-indented from the list
 * marker but otherwise byte-identical in wording, URLs, and punctuation.
 */
export const SRD_5_2_1_CREDIT = [
	"This work includes material from the System Reference Document 5.2.1",
	'("SRD 5.2.1") by Wizards of the Coast LLC, available at',
	"https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the",
	"Creative Commons Attribution 4.0 International License, available at",
	"https://creativecommons.org/licenses/by/4.0/legalcode.",
].join("\n");

export interface ShippableCredit {
	/** Stable id for tests and keys. */
	id: string;
	/** Short heading shown on the page. */
	title: string;
	/** License name as NOTICE states it. */
	license: string;
	/** Credit line(s) as NOTICE / accompanying operational credit specify. */
	credit: string;
	/** Optional primary URL from NOTICE. */
	url?: string;
}

/**
 * Every NOTICE row marked Shippable. Research / private-only rows are omitted
 * on purpose — they must not appear on a public credit page.
 */
export const SHIPPABLE_CREDITS: readonly ShippableCredit[] = [
	{
		id: "srd-5-2-1",
		title: "System Reference Document 5.2.1",
		license: "Creative Commons Attribution 4.0 International (CC BY 4.0)",
		credit: SRD_5_2_1_CREDIT,
		url: "https://www.dndbeyond.com/srd",
	},
	{
		id: "elven-tower-maps",
		title: "Elven Tower Maps",
		license: "CC BY 4.0",
		credit: "Map art © Elven Tower Maps, used under CC BY 4.0.",
		url: "https://www.patreon.com/elventower/posts/creative-commons-153067169",
	},
	{
		id: "noto-sans-glyphs",
		title: "Noto Sans Regular glyph PBFs (via VersaTiles glyph set)",
		license: "SIL Open Font License 1.1",
		credit:
			"Noto Sans Regular glyph PBFs vendored from the VersaTiles glyph set, under the SIL Open Font License 1.1.",
	},
];

/** First-party licence line grounded in LICENSE / ART.md / NOTICE. */
export const LICENSE_NOTICE =
	"Copyright (c) 2026 Marcel Hild, trading as B4mad Technologies. Spellkave code is licensed under the PolyForm Shield License 1.0.0. First-party Spellkave art is licensed under CC BY 4.0.";

/**
 * Extract the required SRD 5.2.1 credit block from a NOTICE file body.
 * Used by tests to prove the site constant matches NOTICE byte-for-byte
 * (after stripping the list-indent spaces NOTICE uses).
 */
export function extractSrdCreditFromNotice(noticeText: string): string {
	const lines = noticeText.split(/\r?\n/);
	const start = lines.findIndex((line) =>
		line.includes("This work includes material from the System Reference Document 5.2.1"),
	);
	if (start < 0) {
		throw new Error("NOTICE is missing the SRD 5.2.1 credit block");
	}
	const block: string[] = [];
	for (let i = start; i < lines.length; i += 1) {
		const raw = lines[i] ?? "";
		const trimmed = raw.trimEnd();
		if (trimmed.trim() === "") break;
		// NOTICE indents the block under the list entry; strip that indent only.
		block.push(trimmed.replace(/^ {5}/, "").trimEnd());
	}
	const joined = block.join("\n").trim();
	if (!joined.endsWith("legalcode.")) {
		throw new Error("NOTICE SRD credit block looks truncated");
	}
	return joined;
}

export function isAttributionPath(pathname: string): boolean {
	const normalized = pathname.replace(/\/+$/, "") || "/";
	return normalized === ATTRIBUTION_PATH;
}
