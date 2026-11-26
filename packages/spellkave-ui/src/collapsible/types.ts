import type { Snippet } from "svelte";

export interface CollapsibleProps {
	/** Trigger label. Plain string or a snippet for richer markup. */
	title: string | Snippet;
	/** Panel body, revealed when open. Plain string or a snippet. */
	content: string | Snippet;
	open?: boolean;
	disabled?: boolean;
	onOpenChange?: (open: boolean) => void;
	class?: string;
}
