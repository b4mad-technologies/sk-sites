export const DEFAULT_SITE_URL = "https://spellkave.com";

/**
 * Address of the public website. Not the R2 data-feed URL.
 *
 * An UNSET repo variable reaches the build as an EMPTY STRING, not as absent:
 * the workflows pass `VITE_SPELLKAVE_SITE_URL: ${{ vars.SPELLKAVE_SITE_URL }}`
 * and GitHub Actions substitutes an unset var with "". `??` would not catch
 * that, and an empty href resolves to the current document — which is how
 * admin.spellkave.com came to link to itself. Treat blank as unset.
 */
export function readSiteUrl(env: Record<string, string | undefined>): string {
	const raw = env.VITE_SPELLKAVE_SITE_URL?.trim() ?? "";
	return raw === "" ? DEFAULT_SITE_URL : raw;
}
