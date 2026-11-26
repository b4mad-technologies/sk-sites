/**
 * Spellkave design tokens — DEFAULT theme (Living Grammar) only.
 *
 * Hex values here mirror `tokens/styles.css` `:root` for non-DOM contexts
 * (docs, snapshots, tests without a stylesheet). Runtime UI must read CSS
 * variables (`var(--background)`, `bg-background`, …) so additional themes
 * in `tokens/themes/` can restyle the same components.
 */

// ---------------------------------------------------------------------------
// Semantic colours
// ---------------------------------------------------------------------------

export const colors = {
	/** Midnight woven navy — page ground. */
	background: "#0d1830",
	/** Warm loom-card cream — primary readable text on dark grounds. */
	foreground: "#efe6cf",
	/** Slightly elevated dark card ground. */
	card: "#111d35",
	cardForeground: "#efe6cf",
	/** Woven gold — primary brand accent, CTAs, gold thread. */
	primary: "#d3a342",
	/** Dark navy text that sits on gold buttons. */
	primaryForeground: "#0d1830",
	/** Muted deep navy for secondary surfaces. */
	secondary: "#1a2943",
	secondaryForeground: "#efe6cf",
	/** Slightly lighter navy for hover / muted zones. */
	muted: "#17243c",
	/** Muted cream for secondary text. */
	mutedForeground: "#c9c2ad",
	/** Muted sage green — accent for secondary signals. */
	accent: "#6e8b67",
	accentForeground: "#f8f1df",
	/** Warm terracotta for error and destructive actions. */
	destructive: "#d46b54",
	/** Warm gold for borders on dark grounds. */
	border: "#8e713d",
	/** Slightly deeper gold for input edges. */
	input: "#6f6146",
	/** Bright gold for focus rings — 3:1+ contrast on dark. */
	ring: "#e6bb5a",
} as const;

// ---------------------------------------------------------------------------
// Spacing scale (8-pt base)
// ---------------------------------------------------------------------------

/**
 * Spacing primitives. Maps directly to Tailwind's default spacing scale;
 * provided here for programmatic use.
 */
export const space = {
	/** 4px */
	xs: "0.25rem",
	/** 8px */
	sm: "0.5rem",
	/** 12px */
	md: "0.75rem",
	/** 16px */
	base: "1rem",
	/** 24px */
	lg: "1.5rem",
	/** 32px */
	xl: "2rem",
	/** 48px */
	"2xl": "3rem",
	/** 64px */
	"3xl": "4rem",
} as const;

// ---------------------------------------------------------------------------
// Border-radius
// ---------------------------------------------------------------------------

export const radius = {
	/** 0.18rem — squared loom-card edge (world default). */
	base: "0.18rem",
	/** calc(base - 4px) */
	sm: "calc(0.18rem - 4px)",
	/** calc(base - 2px) */
	md: "calc(0.18rem - 2px)",
	/** 0.18rem — alias for base */
	lg: "0.18rem",
	/** calc(base + 4px) */
	xl: "calc(0.18rem + 4px)",
} as const;

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

export const typography = {
	families: {
		/** Embedded editorial serif — headlines, wordmark, pull-quotes. */
		serif: '"Newsreader Variable", Newsreader, serif',
		/** System sans-serif — body text, UI labels. */
		sans: 'Aptos, "Segoe UI", ui-sans-serif, system-ui, sans-serif',
	},
	sizes: {
		xs: "0.75rem",
		sm: "0.875rem",
		base: "1rem",
		lg: "1.125rem",
		xl: "1.25rem",
		"2xl": "1.5rem",
		"3xl": "1.875rem",
		"4xl": "2.25rem",
		"5xl": "3rem",
		"6xl": "4.5rem",
	},
	weights: {
		normal: "400",
		medium: "500",
		semibold: "600",
		bold: "700",
	},
	leading: {
		tight: "1",
		snug: "1.25",
		normal: "1.5",
		relaxed: "1.625",
		loose: "2",
	},
} as const;

// ---------------------------------------------------------------------------
// Material tokens (Living Grammar)
// ---------------------------------------------------------------------------

/**
 * Named material swatches from the approved Living Grammar direction.
 * Use these names in prose and code comments — they carry intent.
 */
export const materials = {
	/** Deep midnight navy — the canvas of the woven world. */
	ground: colors.background,
	/** Gold pixel-weave — the action thread and primary signal. */
	goldThread: colors.primary,
	/** Warm loom-card cream — readable surface for copy. */
	loomPaper: colors.foreground,
	/** Muted sage — secondary actions and success signals. */
	mutedSage: colors.accent,
	/** Warm terracotta — error and destructive. */
	terracotta: colors.destructive,
} as const;

export type ColorToken = keyof typeof colors;
export type SpaceToken = keyof typeof space;
export type RadiusToken = keyof typeof radius;
export type MaterialToken = keyof typeof materials;
