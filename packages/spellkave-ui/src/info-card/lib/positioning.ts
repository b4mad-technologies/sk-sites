import {
	autoUpdate,
	computePosition,
	flip,
	offset,
	type Placement,
	shift,
	type VirtualElement,
} from "@floating-ui/dom";
import type { Attachment } from "svelte/attachments";

/**
 * Root-level and preview cards anchor to the link that opened them, like a
 * popover. A card opened from inside another (pinned) card anchors instead
 * to that OWNER card's edge, vertically aligned to the link — the CK3/BG3
 * "next card appears beside the current one" rule — so a link buried deep in
 * a scrolled card body cannot pop a sibling card out at some odd spot.
 */
export function referenceFor(
	anchorEl: HTMLElement,
	ownerCardEl: HTMLElement | null,
): VirtualElement {
	if (!ownerCardEl) {
		return {
			contextElement: anchorEl,
			getBoundingClientRect: () => anchorEl.getBoundingClientRect(),
		};
	}
	return {
		contextElement: ownerCardEl,
		getBoundingClientRect: () => {
			const owner = ownerCardEl.getBoundingClientRect();
			const link = anchorEl.getBoundingClientRect();
			return new DOMRect(owner.right, link.top, 0, link.height);
		},
	};
}

/** Space kept between the viewport edge and any card, matching `shift`'s own padding below. */
const VIEWPORT_PADDING_PX = 8;
/** Gap left between a cascaded card and the owner's title row (or its own left edge). */
const CASCADE_GAP_PX = 8;
/** Floor under branch (d)'s shrunk height — a sane minimum, not a spec requirement. */
const MIN_CASCADE_HEIGHT_PX = 96;
/**
 * Owner title-row height assumed when it can't be measured (jsdom, which has
 * no layout, or an owner card that hasn't rendered its header yet). Matches
 * `InfoCard.svelte`'s `p-4` padding (16px) plus the kind label + `<h2>` block
 * it usually wraps — a rough floor, not a pixel-exact figure.
 */
const CASCADE_TITLE_FALLBACK_PX = 56;
/** Selector for the title-row element inside a card, read from `InfoCard.svelte`. */
const TITLE_ROW_SELECTOR = '[data-slot="info-card-title-row"]';

/** The four corners this module reasons about — a real `DOMRect` satisfies this structurally. */
export interface CascadeRect {
	readonly left: number;
	readonly top: number;
	readonly right: number;
	readonly bottom: number;
}

export interface CascadeSize {
	readonly width: number;
	readonly height: number;
}

export interface CascadeResult {
	left: number;
	top: number;
	/** Set only in branch (d): the card must shrink its own max-height to keep the owner's title clear. `InfoCard` already scrolls its own body, so a shorter card is safe. */
	maxHeight?: number;
}

function clamp(value: number, min: number, max: number): number {
	const hi = Math.max(min, max);
	return Math.min(Math.max(value, min), hi);
}

/**
 * Decides where a card chained off `ownerRect` goes, trying each of these in
 * order and taking the first that fits:
 *  (a) beside the owner, to its right — the normal case, no overlap at all;
 *  (b) overlapping the owner, pushed DOWN clear of `ownerTitleRect`;
 *  (c) overlapping the owner, pushed UP so the card's bottom edge clears the
 *      TOP of `ownerTitleRect` instead (the card may cover the owner's body,
 *      or sit above the owner entirely, but never its title row);
 *  (d) last resort: pin below the title row anyway, and hand back a
 *      `maxHeight` that shrinks the card to whatever room is actually left.
 * Every branch clamps into `viewport`. The owner's title row is visible in
 * every branch — that is the one invariant this function exists to
 * guarantee — and two cards cascading off the same chain can never land at
 * an identical `top`, because each is measured against ITS OWN owner's
 * (already resolved) title row rather than a shared coordinate.
 *
 * Pure and DOM-free by design: `ownerRect`/`ownerTitleRect`/`cardSize`/
 * `viewport` are plain numbers, so this is table-tested directly (see
 * `positioning.test.ts`) rather than only reachable through a real layout —
 * the bug this replaced (a short-viewport cascade landing ON the owner's
 * title, and two chained cards sharing one `top`) was invisible to jsdom,
 * which has no layout at all, and only showed up live.
 */
export function cascadePlacement(
	ownerRect: CascadeRect,
	ownerTitleRect: CascadeRect,
	cardSize: CascadeSize,
	viewport: CascadeSize,
): CascadeResult {
	const viewportRight = viewport.width - VIEWPORT_PADDING_PX;
	const viewportBottom = viewport.height - VIEWPORT_PADDING_PX;

	// (a) beside the owner: no overlap at all.
	if (ownerRect.right + CASCADE_GAP_PX + cardSize.width <= viewportRight) {
		return {
			left: ownerRect.right + CASCADE_GAP_PX,
			top: clamp(ownerRect.top, VIEWPORT_PADDING_PX, viewportBottom - cardSize.height),
		};
	}

	// No room beside: overlap, offset left of the owner's own left edge so
	// the two are never pixel-identical.
	const left = clamp(
		ownerRect.left - CASCADE_GAP_PX,
		VIEWPORT_PADDING_PX,
		viewportRight - cardSize.width,
	);
	const titleBottom = ownerTitleRect.bottom + CASCADE_GAP_PX;

	// (b) pushed down, clear of the title row.
	if (titleBottom + cardSize.height <= viewportBottom) {
		return { left, top: titleBottom };
	}

	// (c) pushed up, bottom edge clear of the title row's TOP.
	const pushedUpTop = ownerTitleRect.top - CASCADE_GAP_PX - cardSize.height;
	if (pushedUpTop >= VIEWPORT_PADDING_PX) {
		return { left, top: pushedUpTop };
	}

	// (d) neither fits: pin below the title row, shrink to what's left.
	return {
		left,
		top: titleBottom,
		maxHeight: Math.max(viewportBottom - titleBottom, MIN_CASCADE_HEIGHT_PX),
	};
}

/** Used when the owner's title row can't be measured yet (see `cascadePlacement`'s caller). */
function fallbackTitleRect(ownerRect: CascadeRect): CascadeRect {
	return {
		left: ownerRect.left,
		right: ownerRect.right,
		top: ownerRect.top,
		bottom: ownerRect.top + CASCADE_TITLE_FALLBACK_PX,
	};
}

/**
 * Positions a floating card element against `getReference()`. Uses
 * `@floating-ui/dom` (already a transitive dependency of bits-ui — no new
 * package). Repositions on the card's OWN content resize/layout shift (a
 * slow-loading card growing once data arrives, say) but never on ancestor
 * scroll: `InfoCardProvider` handles ancestor scroll itself (closing an
 * unpinned preview, leaving a pinned card exactly where it is — a pinned
 * card is a detached reader, not a thing that chases a moved anchor). Window
 * resize is likewise not wired here: the provider re-clamps already-open
 * cards via `clampCardIntoViewport` instead of asking this attachment to
 * recompute against the anchor.
 *
 * When `ownerCardEl` is given (a chained, non-root card) and there truly is
 * no room beside it — `flip` falls back off `options.placement` — the card
 * necessarily stacks over its owner. That cascade is deliberate, not an
 * accident: `cascadePlacement` below decides exactly where, guaranteeing the
 * owner's title row (`TITLE_ROW_SELECTOR`) is always visible and clamping
 * into the viewport.
 */
export function floatingPosition(
	getReference: () => VirtualElement,
	options: {
		placement: "bottom-start" | "right-start";
		fallbackPlacements: Placement[];
		/** The card being stacked beside, when this is a chained (non-root) card. */
		ownerCardEl?: HTMLElement | null;
	},
): Attachment<HTMLElement> {
	return (node) => {
		function update() {
			const reference = getReference();
			void computePosition(reference, node, {
				strategy: "fixed",
				placement: options.placement,
				middleware: [
					offset(8),
					flip({ fallbackPlacements: options.fallbackPlacements }),
					shift({ padding: VIEWPORT_PADDING_PX }),
				],
			}).then(({ x, y, placement: resolved }) => {
				let left = x;
				let top = y;
				const owner = options.ownerCardEl;
				if (owner && resolved !== options.placement) {
					// No room beside the owner (flip fell back): clear any
					// earlier shrink from branch (d) below BEFORE measuring, so
					// a since-freed-up viewport lets the card grow back rather
					// than staying wedged at its last, smaller size.
					node.style.maxHeight = "";
					const ownerRect = owner.getBoundingClientRect();
					const titleRow = owner.querySelector(TITLE_ROW_SELECTOR);
					const ownerTitleRect = titleRow
						? titleRow.getBoundingClientRect()
						: fallbackTitleRect(ownerRect);
					const cardRect = node.getBoundingClientRect();
					const placement = cascadePlacement(
						ownerRect,
						ownerTitleRect,
						{ width: cardRect.width, height: cardRect.height },
						{ width: window.innerWidth, height: window.innerHeight },
					);
					left = placement.left;
					top = placement.top;
					node.style.maxHeight = placement.maxHeight != null ? `${placement.maxHeight}px` : "";
				} else if (owner) {
					// Beside the owner fits after all (e.g. the viewport grew):
					// drop any earlier cascade shrink.
					node.style.maxHeight = "";
				}
				node.style.position = "fixed";
				node.style.left = `${left}px`;
				node.style.top = `${top}px`;
			});
		}
		return autoUpdate(getReference(), node, update, {
			ancestorScroll: false,
			ancestorResize: false,
			// Guard rather than force `true`: jsdom (unit tests) has neither
			// ResizeObserver nor IntersectionObserver, and floating-ui calls
			// `new ResizeObserver(...)` unconditionally when this is `true`.
			elementResize: typeof ResizeObserver === "function",
			layoutShift: typeof IntersectionObserver === "function",
		});
	};
}

/**
 * Re-clamps an already-positioned card's fixed `left`/`top` into the current
 * viewport, without recomputing against its anchor. Used on window resize: a
 * pinned card should shrink back on screen if the viewport got smaller, but
 * must never jump to wherever its (possibly since-scrolled) anchor now is —
 * that would be the same "chasing" a resize-recompute-from-reference would
 * cause on scroll, which pinned cards are exempt from.
 */
export function clampCardIntoViewport(node: HTMLElement): void {
	const rect = node.getBoundingClientRect();
	const maxLeft = Math.max(
		window.innerWidth - rect.width - VIEWPORT_PADDING_PX,
		VIEWPORT_PADDING_PX,
	);
	const maxTop = Math.max(
		window.innerHeight - rect.height - VIEWPORT_PADDING_PX,
		VIEWPORT_PADDING_PX,
	);
	const left = Math.min(Math.max(rect.left, VIEWPORT_PADDING_PX), maxLeft);
	const top = Math.min(Math.max(rect.top, VIEWPORT_PADDING_PX), maxTop);
	node.style.position = "fixed";
	node.style.left = `${left}px`;
	node.style.top = `${top}px`;
}
