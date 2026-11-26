import type { Snippet } from "svelte";

export interface TooltipProps {
	content: string;
	triggerLabel?: string;
	/** Accessible name for the trigger when its visible text is a bare glyph. */
	triggerAriaLabel?: string;
	/** Replaces the default chip look of the trigger entirely (an inline glyph, say). */
	triggerClass?: string;
	open?: boolean;
	delayDuration?: number;
	disabled?: boolean;
	class?: string;
	children?: Snippet;
}
