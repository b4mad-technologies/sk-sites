import type { Snippet } from "svelte";

export interface TabItem {
	value: string;
	label: string;
	content: string | Snippet;
	disabled?: boolean;
}

export interface TabsProps {
	items: TabItem[];
	defaultValue?: string;
	ariaLabel?: string;
	class?: string;
}
