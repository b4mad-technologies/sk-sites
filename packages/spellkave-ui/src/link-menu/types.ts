import type { HTMLAttributes } from "svelte/elements";

/** One choosable target inside a LinkMenu. */
export interface LinkMenuItem {
	/** The target's own title, e.g. "Strength". */
	label: string;
	/** What kind of subject this is, e.g. "Resources" — rendered as a hint line. */
	kind?: string;
	/** Optional href; used as the item's identity and offered to the caller on select. */
	href?: string;
}

export type LinkMenuProps = Omit<HTMLAttributes<HTMLButtonElement>, "id"> & {
	/** DOM id for the trigger button. */
	id?: string;
	/** The choosable targets. One or two is the common case. */
	items: LinkMenuItem[];
	/** Accessible name override for the trigger; omit it and the rendered token names itself. */
	label?: string;
	/** Fires with the chosen item; navigation is the caller's business, not the menu's. */
	onSelect?: (item: LinkMenuItem) => void;
};
