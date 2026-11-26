export interface SelectItem {
	value: string;
	label: string;
	disabled?: boolean;
}

export interface SelectProps {
	items: SelectItem[];
	value?: string;
	open?: boolean;
	placeholder?: string;
	disabled?: boolean;
	name?: string;
	/** Fires when the owner picks an item (not when `value` changes from outside). */
	onValueChange?: (value: string) => void;
	/** Accessible name when the visible field label lives outside the trigger. */
	accessibleLabel?: string;
	class?: string;
	/**
	 * When true (default) the option list is portalled to document.body, matching
	 * every standalone use. Set false to render the list in place: required inside
	 * a Dialog, whose bits-ui scroll-lock sets pointer-events:none on body and so
	 * makes a body-portalled list unclickable (sk-jay0.5.1.8.13).
	 */
	portal?: boolean;
}
