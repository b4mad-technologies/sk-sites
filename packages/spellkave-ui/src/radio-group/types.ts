export interface RadioItem {
	value: string;
	label: string;
	disabled?: boolean;
}

export interface RadioGroupProps {
	items: RadioItem[];
	value?: string;
	disabled?: boolean;
	orientation?: "vertical" | "horizontal";
	name?: string;
	class?: string;
}
