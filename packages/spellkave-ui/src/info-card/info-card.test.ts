import { fireEvent, render, screen, within } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import ControlledHarness from "./info-card-controlled-test-harness.svelte";
import Harness from "./info-card-test-harness.svelte";
import type { InfoCardData, InfoCardResolve } from "./types";

const OPEN_DELAY = 300;
const CLOSE_DELAY = 150;
const PIN_DWELL = 600;

const CARD_DATA: Record<string, InfoCardData> = {
	root: {
		title: "Root Card",
		kind: "Root kind",
		footerHref: "https://docs.test/root",
		facts: [{ label: "Faction", value: "Testers" }],
		body: [
			"See ",
			{ refId: "child", text: "Child Link" },
			" or ",
			{ refId: "sibling", text: "Sibling Link" },
			".",
		],
	},
	child: {
		title: "Child Card",
		facts: [{ label: "CR", value: "1" }],
		body: ["Goes deeper: ", { refId: "grandchild", text: "Grandchild Link" }, "."],
	},
	grandchild: { title: "Grandchild Card" },
	sibling: { title: "Sibling Card" },
};

function resolveFrom(
	overrides: Partial<Record<string, InfoCardData | null>> = {},
): InfoCardResolve {
	return (refId) => {
		if (refId in overrides) return overrides[refId] ?? null;
		return CARD_DATA[refId] ?? null;
	};
}

afterEach(() => {
	vi.useRealTimers();
});

describe("InfoLink hover preview", () => {
	it("opens after the delay and not before", async () => {
		vi.useFakeTimers();
		render(Harness, { resolve: resolveFrom(), openDelay: OPEN_DELAY, closeDelay: CLOSE_DELAY });
		const link = screen.getByRole("button", { name: "Root Link" });

		await fireEvent.mouseEnter(link);
		await vi.advanceTimersByTimeAsync(OPEN_DELAY - 1);
		expect(screen.queryByRole("dialog")).toBeNull();

		await vi.advanceTimersByTimeAsync(1);
		expect(await screen.findByRole("dialog", { name: "Root Card" })).toBeTruthy();
		// A hover preview has no close button — only a pinned card does.
		expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
	});

	it("leaving the link (and never entering the card) closes the preview after the grace period", async () => {
		vi.useFakeTimers();
		render(Harness, { resolve: resolveFrom(), openDelay: OPEN_DELAY, closeDelay: CLOSE_DELAY });
		const link = screen.getByRole("button", { name: "Root Link" });

		await fireEvent.mouseEnter(link);
		await vi.advanceTimersByTimeAsync(OPEN_DELAY);
		expect(await screen.findByRole("dialog", { name: "Root Card" })).toBeTruthy();

		await fireEvent.mouseLeave(link);
		await vi.advanceTimersByTimeAsync(CLOSE_DELAY - 1);
		expect(screen.queryByRole("dialog")).toBeTruthy();
		await vi.advanceTimersByTimeAsync(1);
		expect(screen.queryByRole("dialog")).toBeNull();
	});
});

describe("pinning", () => {
	it("click pins immediately, with a close button", async () => {
		render(Harness, { resolve: resolveFrom() });
		await fireEvent.click(screen.getByRole("button", { name: "Root Link" }));
		expect(await screen.findByRole("dialog", { name: "Root Card" })).toBeTruthy();
		expect(screen.getByRole("button", { name: "Close" })).toBeTruthy();
		expect(screen.getByRole("link", { name: /Full reference/ }).getAttribute("target")).toBe(
			"spellkave-reference",
		);
	});

	it("a link inside a pinned card opens a second card beside it, keeping the first", async () => {
		render(Harness, { resolve: resolveFrom() });
		await fireEvent.click(screen.getByRole("button", { name: "Root Link" }));
		const rootCard = await screen.findByRole("dialog", { name: "Root Card" });

		await fireEvent.click(within(rootCard).getByRole("button", { name: "Child Link" }));
		const childCard = await screen.findByRole("dialog", { name: "Child Card" });

		expect(screen.getByRole("dialog", { name: "Root Card" })).toBeTruthy();
		expect(childCard).toBeTruthy();
	});

	it("opening a different link from card 1 replaces card 2", async () => {
		render(Harness, { resolve: resolveFrom() });
		await fireEvent.click(screen.getByRole("button", { name: "Root Link" }));
		const rootCard = await screen.findByRole("dialog", { name: "Root Card" });
		await fireEvent.click(within(rootCard).getByRole("button", { name: "Child Link" }));
		await screen.findByRole("dialog", { name: "Child Card" });

		await fireEvent.click(within(rootCard).getByRole("button", { name: "Sibling Link" }));
		expect(await screen.findByRole("dialog", { name: "Sibling Card" })).toBeTruthy();
		expect(screen.queryByRole("dialog", { name: "Child Card" })).toBeNull();
		expect(screen.getByRole("dialog", { name: "Root Card" })).toBeTruthy();
	});

	it("hovering a link that would close a pinned deeper card does nothing — no preview, no collapse", async () => {
		vi.useFakeTimers();
		render(Harness, { resolve: resolveFrom(), openDelay: OPEN_DELAY });
		await fireEvent.click(screen.getByRole("button", { name: "Root Link" }));
		const rootCard = await screen.findByRole("dialog", { name: "Root Card" });
		await fireEvent.click(within(rootCard).getByRole("button", { name: "Child Link" }));
		await screen.findByRole("dialog", { name: "Child Card" });

		// Sibling Link, also in card 1, would displace the pinned Child Card
		// if it opened — so hovering it must not even preview.
		await fireEvent.mouseEnter(within(rootCard).getByRole("button", { name: "Sibling Link" }));
		await vi.advanceTimersByTimeAsync(OPEN_DELAY * 2);
		expect(screen.queryByRole("dialog", { name: "Sibling Card" })).toBeNull();
		expect(screen.getByRole("dialog", { name: "Child Card" })).toBeTruthy();
		expect(screen.getByRole("dialog", { name: "Root Card" })).toBeTruthy();
	});

	it("clicking inside card 2 keeps card 1 and card 2 open", async () => {
		render(Harness, { resolve: resolveFrom() });
		await fireEvent.click(screen.getByRole("button", { name: "Root Link" }));
		const rootCard = await screen.findByRole("dialog", { name: "Root Card" });
		await fireEvent.click(within(rootCard).getByRole("button", { name: "Child Link" }));
		const childCard = await screen.findByRole("dialog", { name: "Child Card" });

		// mousedown, not click: that's the event the outside-close guard
		// actually listens for (see InfoCardProvider's onMouseDown).
		await fireEvent.mouseDown(within(childCard).getByText("CR"));
		expect(screen.getByRole("dialog", { name: "Root Card" })).toBeTruthy();
		expect(screen.getByRole("dialog", { name: "Child Card" })).toBeTruthy();
	});
});

describe("closing", () => {
	it("Esc closes only the deepest card and restores focus to the link that opened it", async () => {
		render(Harness, { resolve: resolveFrom() });
		await fireEvent.click(screen.getByRole("button", { name: "Root Link" }));
		const rootCard = await screen.findByRole("dialog", { name: "Root Card" });
		const childLink = within(rootCard).getByRole("button", { name: "Child Link" });
		await fireEvent.click(childLink);
		await screen.findByRole("dialog", { name: "Child Card" });

		await fireEvent.keyDown(window, { key: "Escape" });
		expect(screen.queryByRole("dialog", { name: "Child Card" })).toBeNull();
		expect(screen.getByRole("dialog", { name: "Root Card" })).toBeTruthy();
		expect(document.activeElement).toBe(childLink);
	});

	it("a click outside every card closes the whole stack", async () => {
		render(Harness, { resolve: resolveFrom() });
		await fireEvent.click(screen.getByRole("button", { name: "Root Link" }));
		const rootCard = await screen.findByRole("dialog", { name: "Root Card" });
		await fireEvent.click(within(rootCard).getByRole("button", { name: "Child Link" }));
		await screen.findByRole("dialog", { name: "Child Card" });

		await fireEvent.mouseDown(screen.getByRole("button", { name: "Outside" }));
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("scrolling a card's own body never closes anything", async () => {
		render(Harness, { resolve: resolveFrom() });
		await fireEvent.click(screen.getByRole("button", { name: "Root Link" }));
		const rootCard = await screen.findByRole("dialog", { name: "Root Card" });

		await fireEvent.scroll(rootCard);
		expect(screen.getByRole("dialog", { name: "Root Card" })).toBeTruthy();
	});

	it("scrolling an ancestor leaves a pinned card in place but closes an unpinned preview", async () => {
		vi.useFakeTimers();
		render(Harness, { resolve: resolveFrom(), openDelay: OPEN_DELAY });
		await fireEvent.click(screen.getByRole("button", { name: "Root Link" }));
		const rootCard = await screen.findByRole("dialog", { name: "Root Card" });

		await fireEvent.mouseEnter(within(rootCard).getByRole("button", { name: "Child Link" }));
		await vi.advanceTimersByTimeAsync(OPEN_DELAY);
		expect(await screen.findByRole("dialog", { name: "Child Card" })).toBeTruthy();

		await fireEvent.scroll(window);
		// Root Card is pinned (a detached reader) and stays; Child Card was
		// only ever a preview riding on the link staying under the pointer.
		expect(screen.getByRole("dialog", { name: "Root Card" })).toBeTruthy();
		expect(screen.queryByRole("dialog", { name: "Child Card" })).toBeNull();
	});

	it("window resize re-clamps open cards rather than closing them", async () => {
		render(Harness, { resolve: resolveFrom() });
		await fireEvent.click(screen.getByRole("button", { name: "Root Link" }));
		const rootCard = await screen.findByRole("dialog", { name: "Root Card" });
		await fireEvent.click(within(rootCard).getByRole("button", { name: "Child Link" }));
		await screen.findByRole("dialog", { name: "Child Card" });

		await fireEvent.resize(window);
		expect(screen.getByRole("dialog", { name: "Root Card" })).toBeTruthy();
		expect(screen.getByRole("dialog", { name: "Child Card" })).toBeTruthy();
	});

	it("keeps a pinned card open, with Esc still closing it, once its opening link is removed from the DOM", async () => {
		const { rerender } = render(Harness, { resolve: resolveFrom() });
		await fireEvent.click(screen.getByRole("button", { name: "Root Link" }));
		await screen.findByRole("dialog", { name: "Root Card" });

		// Simulates a stream list re-render dropping the link that opened this card.
		await rerender({ resolve: resolveFrom(), hideRootLink: true });
		expect(screen.queryByRole("button", { name: "Root Link" })).toBeNull();
		expect(screen.getByRole("dialog", { name: "Root Card" })).toBeTruthy();

		await fireEvent.keyDown(window, { key: "Escape" });
		expect(screen.queryByRole("dialog")).toBeNull();
	});
});

describe("card states", () => {
	it("shows loading, then the resolved card", async () => {
		vi.useFakeTimers();
		const resolve: InfoCardResolve = () =>
			new Promise((resolvePromise) => {
				setTimeout(() => resolvePromise(CARD_DATA.root ?? null), 500);
			});
		render(Harness, { resolve });
		await fireEvent.click(screen.getByRole("button", { name: "Root Link" }));

		const card = await screen.findByRole("dialog");
		expect(within(card).getByText("Loading…")).toBeTruthy();

		await vi.advanceTimersByTimeAsync(500);
		expect(within(card).getByText("Root Card")).toBeTruthy();
	});

	it("shows a not-found state when resolve returns null", async () => {
		render(Harness, { resolve: resolveFrom({ root: null }) });
		await fireEvent.click(screen.getByRole("button", { name: "Root Link" }));
		const card = await screen.findByRole("dialog");
		expect(within(card).getByText("Not found.")).toBeTruthy();
	});

	it("shows a failed state when resolve rejects — never an empty success", async () => {
		const resolve: InfoCardResolve = () => Promise.reject(new Error("boom"));
		render(Harness, { resolve });
		await fireEvent.click(screen.getByRole("button", { name: "Root Link" }));
		const card = await screen.findByRole("dialog");
		expect(await within(card).findByText("Couldn't load this reference.")).toBeTruthy();
	});
});

describe("pin-on-dwell", () => {
	it("hovering inside a preview card for the dwell time pins it", async () => {
		vi.useFakeTimers();
		render(Harness, { resolve: resolveFrom(), openDelay: OPEN_DELAY, pinDwell: PIN_DWELL });
		await fireEvent.mouseEnter(screen.getByRole("button", { name: "Root Link" }));
		await vi.advanceTimersByTimeAsync(OPEN_DELAY);
		const card = await screen.findByRole("dialog", { name: "Root Card" });
		expect(screen.queryByRole("button", { name: "Close" })).toBeNull();

		await fireEvent.mouseEnter(card);
		await vi.advanceTimersByTimeAsync(PIN_DWELL);
		expect(screen.getByRole("button", { name: "Close" })).toBeTruthy();

		// Pinned now: leaving no longer closes it.
		await fireEvent.mouseLeave(card);
		await vi.advanceTimersByTimeAsync(CLOSE_DELAY * 10);
		expect(screen.getByRole("dialog", { name: "Root Card" })).toBeTruthy();
	});
});

describe("controlled `open` (one-way, matching the ui-lab demo's wiring)", () => {
	it("a click opens a card when the host wires open one-way through onOpenChange", async () => {
		render(ControlledHarness, { resolve: resolveFrom() });
		await fireEvent.click(screen.getByRole("button", { name: "Root Link" }));
		expect(await screen.findByRole("dialog", { name: "Root Card" })).toBeTruthy();
	});

	it("the host driving open to false while a card is open closes the stack", async () => {
		const { rerender } = render(ControlledHarness, { resolve: resolveFrom() });
		await fireEvent.click(screen.getByRole("button", { name: "Root Link" }));
		await screen.findByRole("dialog", { name: "Root Card" });

		await rerender({ resolve: resolveFrom(), hostClosed: true });
		expect(screen.queryByRole("dialog")).toBeNull();
	});
});

it("InfoCardData is presentation-only: no action-button field exists", () => {
	const data: InfoCardData = {
		title: "No actions here",
		// @ts-expect-error actions/verbs are deliberately not part of InfoCardData — actions live in the app's own dock.
		actions: [{ label: "Attack" }],
	};
	expect(data.title).toBe("No actions here");
});
