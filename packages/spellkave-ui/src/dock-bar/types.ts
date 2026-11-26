import type { Snippet } from "svelte";

/** Presentation state selected by the caller, never inferred from prose. */
export type DockStatusState = "disconnected" | "reconnecting" | "waiting" | "running";

import type { HTMLAttributes } from "svelte/elements";

/** A leaf entry inside a `DockBarMenu` section — one choosable action. */
export interface DockBarLeafEntry {
	/** Stable identity for the entry, handed to `onSelect` when chosen. */
	id: string;
	/** The entry's own title, e.g. "north Village Square". */
	label: string;
	/** Extra context rendered right-aligned and muted, e.g. a compass word. */
	hint?: string;
	disabled?: boolean;
}

/** A submenu entry: its own title, opening a nested list on hover/click. */
export interface DockBarSubmenuEntry {
	id: string;
	label: string;
	submenu: DockBarEntry[];
	disabled?: boolean;
}

export type DockBarEntry = DockBarLeafEntry | DockBarSubmenuEntry;

/** A labeled-by-position cluster of entries, separated from its neighbors by
 * a thin rule. Sections carry no heading — only the separator marks the
 * boundary. */
export interface DockBarSection {
	entries: DockBarEntry[];
}

export interface DockBarProps {
	class?: string;
	/** Individual `DockBarMenu`s, static text, and buttons may sit alongside
	 * one another. Each menu owns its own accessible dropdown interaction. */
	children: Snippet;
}

export interface DockBarActionProps {
	label: string;
	/** A key badge rendered in front of the label, e.g. "1". Also becomes part
	 * of the accessible name ("1 Fighter") so keyboard hints stay visible. */
	key?: string | number;
	/**
	 * Overrides `label` in the accessible name only ("1 Melee Attack —
	 * Cellar Rat 1") — the visible text stays the short `label`. For a host
	 * whose several pills can share one short label (a selection row's
	 * per-subject verb buttons) but must still each announce unambiguously.
	 */
	accessibleLabel?: string;
	disabled?: boolean;
	/** True while this one action's own call is in flight. Renders "pressed"
	 * (muted surface, `aria-busy`) at the same size — no dimming, no spinner —
	 * because the dock's contract is that the world answers within a few
	 * hundred ms, so a visible lock would be more motion than information. */
	pending?: boolean;
	/** A known action the current target does not offer right now: stays in
	 * place at its usual width (muscle memory), renders muted, `aria-disabled`
	 * rather than a native `disabled`, and ignores clicks. */
	dimmed?: boolean;
	/** Shown as the `title` (and folded into the accessible description) when
	 * `dimmed` — why this slot is not offered right now. */
	dimmedReason?: string;
	/** This slot's own toggled state (e.g. it set the composer's mode).
	 * Renders `aria-pressed="true"`; omitted (not "false") otherwise, since
	 * most `DockBarAction`s are not toggles at all. */
	active?: boolean;
	onclick: () => void;
	class?: string;
}

export interface DockBarTextProps {
	children: Snippet;
	/** "muted" is plain status text; "chip" is a small bordered pill, e.g. a
	 * condition. */
	tone?: "muted" | "chip";
	class?: string;
}

export interface DockBarDividerProps {
	class?: string;
}

export interface DockBarZoneProps {
	children: Snippet;
	/** Pushes this zone to the end of the row via `margin-inline-start: auto`. */
	end?: boolean;
	class?: string;
}

/** The one notice surface above a `DockBar` host — reconnecting, a slow
 * pending act, or a refusal the current scene has no other place to show
 * (Talk/Fight/Reaction, where the Explore stream is not mounted). */
export interface DockNoticeProps {
	text: string;
	/** "info" is plain; "warn" tints the border toward `--destructive`
	 * (a refusal), never a color-only signal since the text itself always
	 * says what happened. */
	tone?: "info" | "warn";
	/** Renders a small × button when given. */
	onDismiss?: () => void;
	/** One offer the notice makes (e.g. a layout hint's "Map view"). The
	 * notice never acts on its own; the player takes the offer or not. */
	action?: { label: string; onSelect: () => void };
	class?: string;
}

export type DockBarMenuProps = Omit<HTMLAttributes<HTMLButtonElement>, "id"> & {
	/** DOM id for the trigger button. */
	id?: string;
	/** Visible trigger text, e.g. "Ways out". Plain text — no "▾" affordance. */
	label?: string;
	/** Accessible name override for the trigger; omit it and the visible label names itself. */
	accessibleLabel?: string;
	/** Custom trigger content, replacing the plain label — e.g. the seat
	 * seal's own round initial. The accessible name still comes from
	 * `accessibleLabel` (or `label`). */
	trigger?: Snippet;
	/** Optional header rendered above the sections (e.g. the seat menu's
	 * name/world block). */
	header?: Snippet;
	sections: DockBarSection[];
	onSelect?: (id: string) => void;
	/** bits-ui `Menubar.Content` side; default "top" — the dock sits at the
	 * viewport bottom and opens upward. */
	side?: "top" | "bottom";
	align?: "start" | "center" | "end";
	disabled?: boolean;
};

/** One stable action slot inside a `DockHotbar` group. Identity is `id`, not
 * position — the caller keeps the same id across targets so the digit and
 * width stay put (`play-interaction-axioms.md` "Decided details" #2). */
export interface DockHotbarSlot {
	id: string;
	/** Short visible verb, e.g. "Attack". */
	label: string;
	/** Full name for the accessible name, e.g. "Melee Attack — Cellar Rat 1". */
	accessibleLabel?: string;
	/** Key badge text ("1"); `null`/`undefined` renders no badge. */
	key?: string | null;
	/** A known action the current target does not offer right now: rendered
	 * muted, `aria-disabled`, not clickable, and stays in place. */
	dimmed?: boolean;
	/** Becomes the title/aria-description when `dimmed`. */
	dimmedReason?: string;
	/** This slot's own call is in flight (same look as `DockBarAction` pending). */
	pending?: boolean;
	/** E.g. the composer mode this slot set; renders `aria-pressed="true"`. */
	active?: boolean;
}

/** One niche-provider cluster in a `DockHotbar` row — the SELECTION/HERE/ME
 * groups of the selection model (`play-interaction-axioms.md` "Selection
 * model"), or any other caller-defined cluster. */
export interface DockHotbarGroup {
	/** Stable identity, e.g. `"selection" | "here" | "me" | "answers"`. */
	id: string;
	/** Small caps group label, e.g. "ALDWIN", "HERE", "ME". */
	label: string;
	slots: DockHotbarSlot[];
	/** Overflow menu for this group, reusing `DockBarMenu`; trigger label "…",
	 * accessible name `More for ${label}`. Omitted or empty renders nothing. */
	more?: DockBarSection[];
	/** An honest sentence rendered after the label when the group has nothing
	 * to offer (small, muted text) — e.g. "Nothing is offered from here." */
	note?: string;
}

/** One resource-strip indicator (an action economy channel, a spell slot
 * tier, …) rendered leading the first `DockHotbar` row. */
export interface DockHotbarPip {
	id: string;
	label: string;
	/** The state is always carried in the accessible text and the shape, never
	 * color alone. */
	state: "available" | "partial" | "spent" | "pending" | "unknown";
	/** 0..1 remaining, read only when `state` is `"partial"`. */
	fraction: number | null;
}

/** The resource strip on its own (`DockPips`). */
export interface DockPipsProps {
	pips: DockHotbarPip[];
	class?: string;
}

/** Something the world holds open for an answer (a reaction window). While
 * set it REPLACES every action row: the digits the player sees are the
 * digits that answer, and nothing else in the hotbar can fire
 * (`play-interaction-axioms.md` A7, "Decisions of 2026-09-19" #5). */
export interface DockHotbarUrgent {
	/** What is happening, e.g. "Cellar Rat 1 attacks". */
	text: string;
	/** Sr-only lead-in announced with `text`, e.g. "A moment to react". */
	title?: string;
	/** Time left when this value was read; `null` renders no countdown. */
	remainingMs: number | null;
	/** The window's full length, for the draining bar's start width. Omitted
	 * or smaller than `remainingMs`: the bar starts full. */
	totalMs?: number | null;
	/** The answers, in digit order; each fires `onSelect(slot.id)`. */
	answers: DockHotbarSlot[];
}

export interface DockHotbarProps {
	/** Outer array = visual rows, top first; the caller decides what goes
	 * where (compact: one row; pulled taller: all rows, selection on top). */
	rows: DockHotbarGroup[][];
	/** An open reaction window; replaces `rows` while set. */
	urgent?: DockHotbarUrgent | null;
	/** Resource strip, rendered leading the first row. */
	pips?: DockHotbarPip[];
	/** Whether the caller currently passes more than one row — drives the
	 * toggle button's glyph, label and `aria-expanded`. */
	expanded?: boolean;
	/** Renders a small ▴/▾ toggle button when given. */
	onToggleExpanded?: () => void;
	/** Whole bar inert (busy) — every slot stops firing, but stays styled like
	 * a normal (non-dimmed) slot: busy is not "these actions don't exist". */
	disabled?: boolean;
	onSelect: (slotId: string) => void;
	/** E.g. an "End turn" button, right-aligned on the first row. */
	trailing?: Snippet;
	class?: string;
}
