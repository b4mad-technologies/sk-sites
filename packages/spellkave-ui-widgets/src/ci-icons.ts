/**
 * One-stroke icons for CI facts (20×20, stroke only), so a fact such as
 * "no live node" reads as a small picture plus a word instead of a sentence.
 */
export const CI_ICONS = {
	live: "M4 4h12v5H4zM4 11h12v5H4zM7 6.5h.01M7 13.5h.01M12 6.5h2M12 13.5h2",
	offline: "M4 4h12v5H4zM4 11h12v5H4zM7 6.5h.01M7 13.5h.01M3 3l14 14",
	clock: "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM10 6v4l3 2",
	calendar: "M4 5h12v11H4zM4 8h12M7 3v4M13 3v4",
	nodata: "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM7 10h6",
	commit: "M10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM3 10h4M13 10h4",
	edit: "M4 16l1-4 8-8 3 3-8 8zM12 5l3 3",
	check: "M4 10.5l4 4 8-9",
	alert: "M10 3l8 14H2zM10 8v4M10 14.5h.01",
	manual:
		"M7 11V5a1.5 1.5 0 0 1 3 0v4M10 9V4a1.5 1.5 0 0 1 3 0v5M13 9V6a1.5 1.5 0 0 1 3 0v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-4-2l-2.4-3.4a1.4 1.4 0 0 1 2.2-1.8L7 11",
	runner: "M3 4h14v9H3zM7 17h6M10 13v4",
	package: "M4 7l6-3 6 3v7l-6 3-6-3zM10 10l6-3M10 10 4 7M10 10v7",
	workflow:
		"M5 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM15 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM5 8v2a2 2 0 0 0 2 2h6",
	job: "M4 5h12M4 10h12M4 15h8",
} as const;

export type CiIcon = keyof typeof CI_ICONS;
