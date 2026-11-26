/**
 * Concrete palette and face data per theme, for pages that show every world at
 * once (the lab's Themes page). CSS custom properties only describe the active
 * theme, so this is the one place besides the theme stylesheets where literal
 * colours belong. Keep in step with styles.css and themes/<id>.css.
 */
export type ThemePalette = {
	world: string;
	/** Ground, ink, primary, accent, destructive. */
	swatches: readonly [string, string, string, string, string];
	faces: { display: string; body: string };
};

export const THEME_PALETTES = {
	"living-grammar": {
		world: "The Living Grammar",
		swatches: ["#0d1830", "#efe6cf", "#d3a342", "#6e8b67", "#d46b54"],
		faces: { display: "Newsreader", body: "Aptos / system sans" },
	},
	"loom-paper": {
		world: "The Living Chronicle",
		swatches: ["#eee4c8", "#1c1a15", "#a5452d", "#6f8d61", "#8d2b1d"],
		faces: { display: "Alegreya", body: "Alegreya Sans" },
	},
	"worlds-in-motion": {
		world: "The live world board",
		swatches: ["#0f110e", "#ebe5d2", "#e7a936", "#6f7f5c", "#d8583b"],
		faces: { display: "Archivo", body: "Archivo" },
	},
} as const satisfies Record<string, ThemePalette>;
