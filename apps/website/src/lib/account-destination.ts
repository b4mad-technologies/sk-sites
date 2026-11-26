import type { AccountGetResponse, AccountWorldSummary } from "./account-api";

export const DEFAULT_PLAY_APP_URL = "https://play.spellkave.com/";
export const DEFAULT_OPERATOR_APP_URL = "https://admin.spellkave.com/";
export const DEFAULT_ACCOUNT_APP_URL = "https://account.spellkave.com/";

export type AccountDestination =
	| { kind: "system"; href: string }
	| { kind: "play"; href: string; worldSlug?: string };

function canPlay(world: AccountWorldSummary): boolean {
	return world.capabilities.includes("world.play") || world.capabilities.includes("world.oversee");
}

/**
 * Choose useful work from additive Account API capabilities. These strings
 * select navigation only; the destination still performs authorization.
 *
 * The public entrance never keeps a private hub. Sign-in hands off to the
 * operator console or Play (with a claimed/playable world when there is one).
 */
export function accountDestination(
	account: AccountGetResponse,
	options: {
		playAppUrl?: string;
		operatorAppUrl?: string;
	} = {},
): AccountDestination {
	const playAppUrl = options.playAppUrl ?? DEFAULT_PLAY_APP_URL;
	const operatorAppUrl = options.operatorAppUrl ?? DEFAULT_OPERATOR_APP_URL;

	if (account.capabilities.includes("system.manage")) {
		return { kind: "system", href: operatorAppUrl };
	}

	const playableWorlds = account.worlds.filter(canPlay);
	const world =
		playableWorlds.find((candidate) => candidate.slug === account.seat?.slug) ?? playableWorlds[0];
	if (world !== undefined) {
		const url = new URL(playAppUrl);
		url.searchParams.set("world", world.slug);
		return { kind: "play", href: url.toString(), worldSlug: world.slug };
	}

	return { kind: "play", href: playAppUrl };
}

interface BrowserLocation {
	assign(url: string): void;
}

/**
 * Returns true when navigation leaves the website for a specialized room.
 *
 * Both Play and the operator console are their own origins now (ADR-0110), so
 * the public site always hands off rather than rendering a private hub.
 */
export function openAccountDestination(
	destination: AccountDestination,
	location: BrowserLocation,
): boolean {
	location.assign(destination.href);
	return true;
}
