import type { Snippet } from "svelte";

/** One choosable action. */
export interface ActionMenuLeafEntry {
	id: string;
	label: string;
	disabled?: boolean;
	/** Shown muted and right-aligned — typically why a disabled entry is disabled. */
	hint?: string;
}

/** A nested list, opening on hover/click like any bits-ui submenu. */
export interface ActionMenuSubmenuEntry {
	id: string;
	label: string;
	submenu: ActionMenuEntry[];
}

export type ActionMenuEntry = ActionMenuLeafEntry | ActionMenuSubmenuEntry;

export interface ActionMenuProps {
	/** Accessible name for the icon trigger, e.g. "Actions for Goblin Warrior 1" — the glyph alone names nothing. */
	label: string;
	items: ActionMenuEntry[];
	/** Fires with the chosen leaf entry's id. Never called for a submenu entry itself. */
	onSelect?: (id: string) => void;
	/** Reactive, two-way, same shape as bits-ui's own `open`/`onOpenChange` — lets a host close this menu from outside (e.g. because an unrelated InfoCard stack just opened). */
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	/** Replaces the default "⋯" glyph entirely. The accessible name still comes from `label`. */
	trigger?: Snippet;
	class?: string;
	triggerClass?: string;
}
