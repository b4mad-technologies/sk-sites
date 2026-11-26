import type { DocTone } from "./types";

const DAY = 86_400_000;

/** Up to a month: fresh. Up to half a year: aging. Older: stale, worth a check before you trust it. */
export const FRESH_DAYS = 30;
export const STALE_DAYS = 180;

export interface Freshness {
	label: string;
	tone: DocTone;
	days: number;
}

const units: [Intl.RelativeTimeFormatUnit, number][] = [
	["year", 365],
	["month", 30],
	["week", 7],
	["day", 1],
];

/** "updated 3 days ago", with a tone by age; `null` for a missing or unreadable date. */
export function freshness(
	date: string | null | undefined,
	now: Date = new Date(),
): Freshness | null {
	if (!date) return null;
	const then = new Date(date).getTime();
	if (Number.isNaN(then)) return null;
	const days = Math.max(0, Math.floor((now.getTime() - then) / DAY));
	const format = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
	const [unit, size] = units.find(([, size]) => days >= size) ?? ["day", 1];
	const label = `updated ${format.format(-Math.floor(days / size), unit)}`;
	const tone: DocTone = days <= FRESH_DAYS ? "good" : days <= STALE_DAYS ? "neutral" : "muted";
	return { label, tone, days };
}
