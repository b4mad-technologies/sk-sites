import { describe, expect, it } from "vitest";
import {
	type CascadeRect,
	type CascadeResult,
	type CascadeSize,
	cascadePlacement,
} from "./positioning";

// Plain rects — `cascadePlacement` is DOM-free, so these are just numbers,
// not `getBoundingClientRect()` results. `right`/`bottom` are given
// explicitly rather than derived, matching what a real `DOMRect` carries.
function rect(left: number, top: number, right: number, bottom: number): CascadeRect {
	return { left, top, right, bottom };
}

function size(width: number, height: number): CascadeSize {
	return { width, height };
}

const CARD_WIDTH = 320; // InfoCard.svelte's fixed `w-[20rem]`.
const GAP = 8;
const PAD = 8;

/**
 * The one invariant `cascadePlacement` exists to guarantee, checked
 * independent of which branch fired: the resulting card, at `cardHeight`
 * (or the branch's own `maxHeight`, if it shrank one), never vertically
 * overlaps `titleRect`, and its whole box sits inside `viewport`.
 */
function assertNeverCoversTitle(
	result: CascadeResult,
	cardWidth: number,
	cardHeight: number,
	titleRect: CascadeRect,
	viewport: CascadeSize,
) {
	const height = result.maxHeight ?? cardHeight;
	const bottom = result.top + height;
	const right = result.left + cardWidth;
	const pushedDown = result.top >= titleRect.bottom;
	const pushedUp = bottom <= titleRect.top;
	const besideHorizontally = result.left >= titleRect.right || right <= titleRect.left;
	expect(pushedDown || pushedUp || besideHorizontally).toBe(true);
	expect(result.left).toBeGreaterThanOrEqual(0);
	expect(result.top).toBeGreaterThanOrEqual(0);
	expect(right).toBeLessThanOrEqual(viewport.width);
	expect(bottom).toBeLessThanOrEqual(viewport.height);
}

describe("cascadePlacement", () => {
	it("(a) goes beside the owner when the width is there", () => {
		const owner = rect(356, 361, 676, 597);
		const result = cascadePlacement(
			owner,
			rect(356, 361, 676, 444),
			size(CARD_WIDTH, 200),
			size(1312, 900),
		);
		expect(result).toEqual({ left: 684, top: 361 });
	});

	it("(a) beside placement clamps its top into the viewport, not to the owner's raw top", () => {
		const owner = rect(356, 600, 676, 900);
		const result = cascadePlacement(
			owner,
			rect(356, 600, 676, 656),
			size(CARD_WIDTH, 200),
			size(1312, 678),
		);
		// Owner top (600) + card height (200) would run off the bottom (678);
		// clamp keeps the card's bottom at the viewport padding instead.
		expect(result.top).toBe(678 - PAD - 200);
		expect(result.maxHeight).toBeUndefined();
	});

	it("(b) overlaps and pushes down when there's no room beside but room below the title", () => {
		// Owner positioned near the right edge: no width left beside it,
		// regardless of viewport height.
		const owner = rect(700, 50, 1020, 900);
		const ownerTitle = rect(700, 50, 1020, 120);
		const result = cascadePlacement(owner, ownerTitle, size(CARD_WIDTH, 200), size(1312, 900));
		expect(result).toEqual({ left: 692, top: 128 });
		assertNeverCoversTitle(result, CARD_WIDTH, 200, ownerTitle, size(1312, 900));
	});

	it("(c) overlaps and pushes up when pushing down would run off the bottom", () => {
		const owner = rect(700, 400, 1020, 650);
		const ownerTitle = rect(700, 400, 1020, 460);
		const viewport = size(1312, 678);
		// Pushed down would need to end by 678 - 8 = 670; title bottom (460)
		// + gap (8) + height (250) = 718, too tall. Pushed up instead.
		const result = cascadePlacement(owner, ownerTitle, size(CARD_WIDTH, 250), viewport);
		expect(result.left).toBe(692);
		expect(result.top).toBe(ownerTitle.top - GAP - 250);
		assertNeverCoversTitle(result, CARD_WIDTH, 250, ownerTitle, viewport);
		expect(result.maxHeight).toBeUndefined();
	});

	it("(d) shrinks the card when neither pushing down nor up fits", () => {
		// Short owner near the top of a short viewport: pushing down runs off
		// the bottom, and pushing up runs off the top too.
		const owner = rect(700, 10, 1020, 460);
		const ownerTitle = rect(700, 10, 1020, 70);
		const viewport = size(1312, 300);
		const result = cascadePlacement(owner, ownerTitle, size(CARD_WIDTH, 500), viewport);
		expect(result.left).toBe(692);
		expect(result.top).toBe(78); // titleBottom (70) + gap (8)
		expect(result.maxHeight).toBe(300 - PAD - 78); // viewportBottom - titleBottom
		assertNeverCoversTitle(result, CARD_WIDTH, 500, ownerTitle, viewport);
	});

	it("(d) never shrinks the card below the sane floor, even in a tiny viewport", () => {
		const owner = rect(0, 0, 320, 40);
		const ownerTitle = rect(0, 0, 320, 32);
		const result = cascadePlacement(owner, ownerTitle, size(CARD_WIDTH, 500), size(340, 60));
		expect(result.maxHeight).toBe(96);
	});

	it("overlap placements are always offset from the owner's own left edge — never pixel-identical", () => {
		const owner = rect(700, 50, 1020, 900);
		const result = cascadePlacement(
			owner,
			rect(700, 50, 1020, 120),
			size(CARD_WIDTH, 200),
			size(1312, 900),
		);
		expect(result.left).not.toBe(owner.left);
	});

	// Regression: reported live at 1312x678, chaining Goblin Warrior 1 →
	// Goblin Warrior → Nimble Escape → Disengage. Card 3's top landed ABOVE
	// card 2's title bottom (511 < 529), and card 4 landed at the exact same
	// top as card 3 (511), fully covering it — the old code let the
	// viewport-bottom clamp win over the title-visibility floor. Table-driven
	// over a spread of card heights, since the bug depended on exactly which
	// of (b)/(c)/(d) the height forced.
	describe("regression: short-viewport 4-level chain (1312x678), never covers the owner's title", () => {
		const viewport = size(1312, 678);
		const card2 = rect(684, 471, 1004, 670);
		const card2Title = rect(684, 489, 1004, 529); // title starts a little below the card's own top padding.

		it.each([
			120, 159, 250, 400, 600,
		])("card 3 (chained off card 2) at content height %ipx", (height) => {
			const result = cascadePlacement(card2, card2Title, size(CARD_WIDTH, height), viewport);
			assertNeverCoversTitle(result, CARD_WIDTH, height, card2Title, viewport);
			// The specific old failure: top landed strictly inside the title band.
			expect(result.top > card2Title.top && result.top < card2Title.bottom).toBe(false);
		});

		it("card 4 (chained off card 3) never lands at the same top as card 3", () => {
			// Card 3's own resolved box (any of the branches above), with a
			// plausible title band inside it.
			const card3 = rect(676, 213, 996, 463);
			const card3Title = rect(676, 231, 996, 271);
			const result = cascadePlacement(card3, card3Title, size(CARD_WIDTH, 250), viewport);
			assertNeverCoversTitle(result, CARD_WIDTH, 250, card3Title, viewport);
			expect(result.top).not.toBe(card3.top);
		});
	});
});
