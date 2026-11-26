import type { Snippet } from "svelte";

export interface DialogProps {
	open?: boolean;
	title: string;
	description?: string;
	/**
	 * Omit the trigger for a dialog controlled by another surface. The caller
	 * remains responsible for changing `open`; this avoids an orphaned default
	 * "Open" button entering the document.
	 */
	triggerLabel?: string | null;
	/** Accessible name for a trigger whose visible label alone is not enough
	 * (e.g. "Goblin Warrior 1, details" for a visible label that is just the
	 * name) — mirrors `PopoverProps.triggerAriaLabel`. */
	triggerAriaLabel?: string;
	/** Custom trigger contents, inside the shared accessible button. */
	trigger?: Snippet;
	/** Reading content, separate from the action row. */
	content?: Snippet;
	closeLabel?: string;
	/** Fires on every open/close transition, mirroring `PopoverProps.onOpenChange`
	 * — a caller that needs to react to the dialog opening (e.g. an on-demand
	 * read) does not need to duplicate `bind:open`'s own state. */
	onOpenChange?: (open: boolean) => void;
	disabled?: boolean;
	/**
	 * Lock body scroll while the dialog is open. Defaults to off under jsdom —
	 * the lock is meaningless without a layout engine and its 24ms
	 * destroy-timer outlives test teardown (sk-jay0.7.144).
	 */
	preventScroll?: boolean;
	class?: string;
	children?: Snippet;
}
