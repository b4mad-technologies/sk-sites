import { getContext, hasContext, setContext } from "svelte";
import type { InfoCardData, InfoCardResolve } from "./types";

export type InfoCardStatus = "loading" | "ready" | "not-found" | "error";

/**
 * One open card. The stack is a PATH, not a tree (see `open` below): index
 * `k`'s `ownerIndex` is always `k - 1` or `null`, never a sibling branch.
 */
export interface InfoCardEntry {
	readonly id: number;
	readonly refId: string;
	/** Index of the card whose body hosts the link that opened this one; `null` for a link in ordinary page content. */
	readonly ownerIndex: number | null;
	/** The `InfoLink` button that opened this card — also where focus returns when it (and anything deeper) closes. */
	readonly anchorEl: HTMLElement;
	/** Set once, at open: focus the card root as soon as it mounts (a keyboard-driven open). */
	readonly focusOnMount: boolean;
	pinned: boolean;
	/** True while hovering inside this (unpinned) card, driving the pin-dwell progress indicator. */
	dwelling: boolean;
	status: InfoCardStatus;
	data: InfoCardData | null;
	/** Set by InfoCard.svelte once its root element mounts; read for chained positioning and outside-interaction checks. */
	cardEl: HTMLElement | null;
}

export interface InfoCardStackOptions {
	resolve: InfoCardResolve;
	openDelay?: number;
	closeDelay?: number;
	pinDwell?: number;
}

let nextEntryId = 0;

/**
 * Owns the open-card path and every timing decision around it. Deliberately
 * NOT built from nested bits-ui `Popover.Root`s: a click inside a nested
 * Popover's content is reported as "outside" to its ancestor Popover, which
 * would close the whole chain on the very interaction meant to grow it. This
 * class manages the stack itself; each card is a plain positioned element
 * (see `lib/positioning.ts`), and `InfoCardProvider` does its own
 * outside-click/Esc/scroll/resize handling once for the whole stack.
 */
export class InfoCardStack {
	resolve: InfoCardResolve;
	openDelay: number;
	closeDelay: number;
	pinDwell: number;

	entries = $state<InfoCardEntry[]>([]);

	private hoverCounts = new Map<number, number>();
	private closeTimers = new Map<number, ReturnType<typeof setTimeout>>();
	private dwellTimers = new Map<number, ReturnType<typeof setTimeout>>();

	constructor(options: InfoCardStackOptions) {
		this.resolve = options.resolve;
		this.openDelay = options.openDelay ?? 300;
		this.closeDelay = options.closeDelay ?? 150;
		this.pinDwell = options.pinDwell ?? 600;
	}

	/** The card element hosting the link at `ownerIndex`, or `null` at the root. */
	ownerCardEl(ownerIndex: number | null): HTMLElement | null {
		if (ownerIndex === null) return null;
		return this.entries[ownerIndex]?.cardEl ?? null;
	}

	indexOf(id: number): number {
		return this.entries.findIndex((entry) => entry.id === id);
	}

	/**
	 * Opens (or replaces) the card a link points to. A root link
	 * (`ownerIndex === null`) replaces the WHOLE stack — a fresh path. A
	 * link inside card N replaces everything after N: "opening a link from
	 * card N closes any cards deeper than N" — but only a CLICK (`pinned ===
	 * true`) may do that closing. A hover preview (`pinned === false`) may
	 * only ever ADD a card at the end of the current path: it is a no-op
	 * (returns `-1`, no entry created, nothing else changes) whenever the
	 * cards it would displace include a pinned one. This is the "only a
	 * click replaces pinned cards" rule — a preview must never be the thing
	 * that collapses a card the reader deliberately pinned.
	 */
	open(
		refId: string,
		ownerIndex: number | null,
		anchorEl: HTMLElement,
		pinned: boolean,
		focusOnMount: boolean,
	): number {
		const keep = ownerIndex === null ? 0 : ownerIndex + 1;
		const displaced = this.entries.slice(keep);
		if (!pinned && displaced.some((entry) => entry.pinned)) return -1;
		const id = nextEntryId++;
		const entry: InfoCardEntry = {
			id,
			refId,
			ownerIndex,
			anchorEl,
			focusOnMount,
			pinned,
			dwelling: false,
			status: "loading",
			data: null,
			cardEl: null,
		};
		this.discard(displaced);
		this.entries = [...this.entries.slice(0, keep), entry];
		void this.load(entry);
		return id;
	}

	private async load(entry: InfoCardEntry): Promise<void> {
		try {
			const data = await this.resolve(entry.refId);
			this.mutate(entry.id, (live) => {
				live.data = data;
				live.status = data === null ? "not-found" : "ready";
			});
		} catch {
			this.mutate(entry.id, (live) => {
				live.status = "error";
			});
		}
	}

	private mutate(id: number, fn: (entry: InfoCardEntry) => void): void {
		const entry = this.entries.find((candidate) => candidate.id === id);
		if (entry) fn(entry); // no-op once closed — a stale resolve writes nowhere
	}

	pin(id: number): void {
		this.mutate(id, (entry) => {
			entry.pinned = true;
			entry.dwelling = false;
		});
	}

	focusCard(id: number): void {
		this.entries.find((entry) => entry.id === id)?.cardEl?.focus();
	}

	setCardEl(id: number, el: HTMLElement | null): void {
		this.mutate(id, (entry) => {
			entry.cardEl = el;
		});
	}

	/** Removes everything from `index` on (inclusive), cleaning up their timers. */
	closeFrom(index: number): void {
		if (index < 0 || index >= this.entries.length) return;
		this.discard(this.entries.slice(index));
		this.entries = this.entries.slice(0, index);
		this.rearmDeepest();
	}

	/** Closes the deepest card, returning its anchor so the caller can restore focus. */
	closeDeepest(): HTMLElement | null {
		const deepest = this.entries.at(-1);
		if (!deepest) return null;
		this.closeFrom(this.entries.length - 1);
		return deepest.anchorEl;
	}

	closeAll(): void {
		this.closeFrom(0);
	}

	/**
	 * Closes the trailing run of unpinned cards, keeping every pinned card
	 * (and, ahead of the last pinned one, any unpinned card that still hosts
	 * a pinned descendant — the path can't drop an interior card while
	 * keeping one deeper). Used when scrolling moves an anchor out from
	 * under a hover preview: the preview is no longer over anything real and
	 * closes, but a pinned card is a detached reader and stays exactly where
	 * it is (see `lib/positioning.ts` — pinned cards never reposition on
	 * ancestor scroll either).
	 */
	closeUnpinnedTail(): void {
		let lastPinned = -1;
		for (let i = this.entries.length - 1; i >= 0; i--) {
			if (this.entries[i]?.pinned) {
				lastPinned = i;
				break;
			}
		}
		this.closeFrom(lastPinned + 1);
	}

	private discard(removed: InfoCardEntry[]): void {
		for (const entry of removed) {
			this.hoverCounts.delete(entry.id);
			const closeTimer = this.closeTimers.get(entry.id);
			if (closeTimer) clearTimeout(closeTimer);
			this.closeTimers.delete(entry.id);
			const dwellTimer = this.dwellTimers.get(entry.id);
			if (dwellTimer) clearTimeout(dwellTimer);
			this.dwellTimers.delete(entry.id);
		}
	}

	/**
	 * A card that grew a deeper child stops managing its own hover-out
	 * timer while that child exists (see `hoverLeave`). Once the child goes
	 * away, re-evaluate the new deepest entry from its CURRENT hover state.
	 */
	private rearmDeepest(): void {
		const deepest = this.entries.at(-1);
		if (!deepest || deepest.pinned) return;
		if ((this.hoverCounts.get(deepest.id) ?? 0) > 0) return;
		if (this.closeTimers.has(deepest.id)) return;
		this.armCloseTimer(deepest.id);
	}

	private armCloseTimer(id: number): void {
		const timer = setTimeout(() => {
			this.closeTimers.delete(id);
			if ((this.hoverCounts.get(id) ?? 0) > 0) return;
			// Only the deepest card auto-closes on hover-out: an ancestor
			// that grew a child is being read, not abandoned.
			if (this.entries.at(-1)?.id !== id) return;
			this.closeFrom(this.indexOf(id));
		}, this.closeDelay);
		this.closeTimers.set(id, timer);
	}

	/** The link (or card) for `id` gained pointer focus: cancel any pending close. */
	hoverEnter(id: number): void {
		this.hoverCounts.set(id, (this.hoverCounts.get(id) ?? 0) + 1);
		const timer = this.closeTimers.get(id);
		if (timer) {
			clearTimeout(timer);
			this.closeTimers.delete(id);
		}
	}

	/** The link (or card) for `id` lost pointer focus: arm a grace-close if nothing else is holding it open. */
	hoverLeave(id: number): void {
		const next = (this.hoverCounts.get(id) ?? 1) - 1;
		if (next > 0) {
			this.hoverCounts.set(id, next);
			return;
		}
		this.hoverCounts.delete(id);
		const entry = this.entries.find((candidate) => candidate.id === id);
		if (!entry || entry.pinned) return;
		this.armCloseTimer(id);
	}

	/** Hovering INTO an unpinned card (not just its link) starts the pin-on-dwell countdown, CK3-style. */
	cardHoverEnter(id: number): void {
		this.hoverEnter(id);
		const entry = this.entries.find((candidate) => candidate.id === id);
		if (!entry || entry.pinned) return;
		entry.dwelling = true;
		const timer = setTimeout(() => {
			this.dwellTimers.delete(id);
			this.mutate(id, (live) => {
				live.pinned = true;
				live.dwelling = false;
			});
		}, this.pinDwell);
		this.dwellTimers.set(id, timer);
	}

	cardHoverLeave(id: number): void {
		this.hoverLeave(id);
		const timer = this.dwellTimers.get(id);
		if (timer) {
			clearTimeout(timer);
			this.dwellTimers.delete(id);
		}
		this.mutate(id, (entry) => {
			entry.dwelling = false;
		});
	}
}

const STACK_KEY = Symbol("spellkave-info-card-stack");
const OWNER_KEY = Symbol("spellkave-info-card-owner-index");

export function setInfoCardStack(stack: InfoCardStack): void {
	setContext(STACK_KEY, stack);
}

export function useInfoCardStack(): InfoCardStack | null {
	return hasContext(STACK_KEY) ? getContext<InfoCardStack>(STACK_KEY) : null;
}

export function setInfoCardOwnerIndex(index: number): void {
	setContext(OWNER_KEY, index);
}

/** `null` at the root: an `InfoLink` in ordinary page content, not inside a card. */
export function useInfoCardOwnerIndex(): number | null {
	return hasContext(OWNER_KEY) ? getContext<number>(OWNER_KEY) : null;
}
