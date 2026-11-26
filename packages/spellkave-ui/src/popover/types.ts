import type { Snippet } from "svelte";

export interface PopoverProps {
	open?: boolean;
	triggerLabel?: string;
	/** Custom visual content while retaining the primitive's native button. */
	trigger?: Snippet;
	onTriggerKeydown?: (event: KeyboardEvent) => void;
	/** Accessible name for a trigger whose visible label is an icon or other compact cue. */
	triggerAriaLabel?: string;
	/** Additional class on the trigger itself, distinct from the content panel's class. */
	triggerClass?: string;
	/** Inline reading aid instead of a toolbar-style trigger. */
	inline?: boolean;
	openOnHover?: boolean;
	openDelay?: number;
	closeDelay?: number;
	onOpenChange?: (open: boolean) => void;
	accessibleLabel?: string;
	disabled?: boolean;
	class?: string;
	children?: Snippet;
}
