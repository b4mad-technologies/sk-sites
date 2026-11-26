import type { Snippet } from "svelte";
import type { ButtonSize, ButtonVariant } from "../button/variants";
import type { WovenIconName } from "../woven/assets";

export type DocsPageHeaderProps = {
	title: string;
	/** Plain-text introduction used by simple documentation pages. */
	description?: string;
	/** Rich introduction content. Rendered directly so callers control its block semantics. */
	intro?: Snippet;
};

export type HeroAction = {
	label: string;
	href?: string;
	target?: string;
	rel?: string;
	onclick?: (e: MouseEvent) => void;
	variant?: ButtonVariant;
	size?: ButtonSize;
	disabled?: boolean;
	ariaLabel?: string;
};

export type HeroStoryStep = {
	step: number | string;
	label: string;
	description: string;
	icon?: "see" | "choose" | "respond" | "change" | (string & {});
	iconSnippet?: Snippet;
};

export type ProductNavItem = {
	label: string;
	href: string;
	current?: boolean;
	/**
	 * Woven glyph shown before the label. Optional so a room can stay plain,
	 * but the same set is available to every room — the icon is part of the
	 * shared language, not a per-app decoration (sk-jay0.5.1.8.2).
	 */
	icon?: WovenIconName;
};

export type ProductMastheadAccount = {
	/** Presentation only. Authorization stays on the server. */
	displayName: string;
};

export type ProductMastheadProps = {
	class?: string;
	brand?: string;
	/** Omit a href (`null`) to render the brand as text, not a link. */
	brandHref?: string | null;
	navigation?: ProductNavItem[];
	navSnippet?: Snippet;
	/** World name, hostname, or other non-link context beside the brand. */
	contextText?: string;
	contextSnippet?: Snippet;
	signInLabel?: string;
	/** Signed-out sign-in target. Pass `null` to hide the control. */
	signInHref?: string | null;
	onSignIn?: () => void;
	account?: ProductMastheadAccount | null;
	signOutLabel?: string;
	onSignOut?: () => void;
	/** Always-visible links in the account cluster (API keys, public site). */
	accountLinks?: ProductNavItem[];
	/** Replaces the built-in account cluster (dev token UI, future site switcher). */
	accountSnippet?: Snippet;
	ariaLabel?: string;
};

export type NarrativeHeroProps = {
	class?: string;
	headline?: string;
	headlineSnippet?: Snippet;
	copy?: string;
	copySnippet?: Snippet;
	imageUrl?: string;
	imageAlt?: string;
	imageSnippet?: Snippet;
	primaryAction?: HeroAction;
	primaryActionSnippet?: Snippet;
	secondaryAction?: HeroAction;
	secondaryActionSnippet?: Snippet;
	storySteps?: HeroStoryStep[];
	storyStepSnippet?: Snippet<[HeroStoryStep, number]>;
	headingLevel?: "h1" | "h2" | "h3";
	ariaLabel?: string;
};

export type JourneyStep = {
	step: number | string;
	title: string;
	description: string;
	imageUrl?: string;
	imageAlt?: string;
	imageSnippet?: Snippet;
};

export type JourneyBandProps = {
	class?: string;
	steps?: JourneyStep[];
	stepSnippet?: Snippet<[JourneyStep, number]>;
	tagline?: string;
	taglineSnippet?: Snippet;
	ariaLabel?: string;
};

export type SeatBoardSeat = {
	/** Stable id of the seat, e.g. `<world-slug>/<actor_id>`. */
	key: string;
	hero: string;
	world: string;
	/** Short extra state, e.g. "world paused". */
	note?: string;
};

export type SeatBoardProps = {
	seats: SeatBoardSeat[];
	/** The seat this app acts for; null when none is selected. */
	activeKey?: string | null;
	onSelect: (key: string) => void;
	title?: string;
	/** Label of the row control; its accessible name adds hero and world. */
	selectLabel?: string;
	emptyText?: string;
	busy?: boolean;
	class?: string;
};

export type ConnectorListItem = {
	/** WorkOS client id. */
	id: string;
	name: string;
};

export type ConnectorListProps = {
	connectors: ConnectorListItem[];
	/** One client id, or null for "disconnect all". */
	onDisconnect: (id: string | null) => void;
	busy?: boolean;
	status?: string | null;
	title?: string;
	class?: string;
};
