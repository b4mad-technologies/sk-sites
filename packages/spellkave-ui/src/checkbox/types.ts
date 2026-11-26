export interface CheckboxProps {
	class?: string;
	id?: string;
	label: string;
	description?: string;
	error?: string;
	checked?: boolean;
	indeterminate?: boolean;
	disabled?: boolean;
	required?: boolean;
	name?: string;
	value?: string;
	form?: string;
	ref?: HTMLButtonElement | null;
}
