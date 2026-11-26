import type { Snippet } from "svelte";

/** One label/value row in a card's compact definition grid. */
export interface InfoCardFact {
	label: string;
	value: string;
}

/** A body segment is either plain text or a link to another card. */
export type InfoRichTextSegment = string | { refId: string; text: string };

/** Ordered body content; the host decides which words are links. */
export type InfoRichText = InfoRichTextSegment[];

/**
 * The information a card shows. Presentation only — there is deliberately no
 * action/verb field. Actions live in the app's own dock, not in a card.
 */
export interface InfoCardData {
	title: string;
	kind?: string;
	image?: { src: string; alt: string };
	summary?: string;
	facts?: InfoCardFact[];
	body?: InfoRichText;
	/** Renders a "Full reference ↗" link at the foot of the card. */
	footerHref?: string;
}

/**
 * Resolves one reference id to its card content. `null` means "looked up,
 * genuinely absent" (renders the not-found state); a thrown/rejected call
 * renders the failed state — a failed read is never an empty success.
 */
export type InfoCardResolve = (refId: string) => Promise<InfoCardData | null> | InfoCardData | null;

export interface InfoCardProviderProps {
	resolve: InfoCardResolve;
	/** Hover delay before a preview opens, in ms. */
	openDelay?: number;
	/** Grace period, in ms, before an unpinned preview closes after the pointer leaves the link and the card. */
	closeDelay?: number;
	/** Dwell time, in ms, hovering inside a preview card before it auto-pins. */
	pinDwell?: number;
	/**
	 * Reactive, two-way: true whenever the stack has at least one open card
	 * (preview or pinned). Setting it to `false` closes the whole stack. This
	 * is presentation-only bookkeeping — not an action — so a host can keep
	 * this non-modal stack from coexisting with an unrelated overlay (e.g. a
	 * separate action menu on the same name) without InfoCard knowing what
	 * that overlay is.
	 */
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	children?: Snippet;
}

export interface InfoLinkProps {
	/** The reference this link opens. */
	refId: string;
	class?: string;
	/** Optional host-side selection to accompany opening this information card.
	 * The card remains presentation-only; a caller must never dispatch a
	 * world action from here. */
	onclick?: (event: MouseEvent) => void;
	children?: Snippet;
}
