import { THEME_PALETTES, type ThemePalette } from "../tokens/theme-palettes.ts";

export type ThemeScheme = "dark" | "light";

export type ThemeDefinition = {
	id: string;
	label: string;
	description: string;
	scheme: ThemeScheme;
} & ThemePalette;

export const DEFAULT_THEME_ID = "living-grammar";

export const THEMES: readonly ThemeDefinition[] = [
	{
		id: DEFAULT_THEME_ID,
		label: "Living Grammar",
		...THEME_PALETTES["living-grammar"],
		description:
			"The Living Grammar — midnight jacquard, woven gold, and cream ink; the night world, default product skin.",
		scheme: "dark",
	},
	{
		id: "loom-paper",
		label: "Loom Paper",
		...THEME_PALETTES["loom-paper"],
		description:
			"The Living Chronicle — rag paper, iron-gall ink, and a rust stamp; a campaign journal written while you watch.",
		scheme: "light",
	},
	{
		id: "worlds-in-motion",
		label: "Worlds in Motion",
		...THEME_PALETTES["worlds-in-motion"],
		description:
			"The live world board — blackened enamel, amber split-flap lettering, and brass hairlines; every world visibly underway.",
		scheme: "dark",
	},
];

export function isThemeId(id: string): boolean {
	return THEMES.some((entry) => entry.id === id);
}

export function schemeForTheme(id: string): ThemeScheme {
	return THEMES.find((entry) => entry.id === id)?.scheme ?? "dark";
}
