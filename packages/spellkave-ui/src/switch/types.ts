export interface SwitchProps {
	checked?: boolean;
	label: string;
	description?: string;
	disabled?: boolean;
	name?: string;
	/** Fires when the owner toggles it (not when `checked` changes from outside). */
	onCheckedChange?: (checked: boolean) => void;
	class?: string;
}
