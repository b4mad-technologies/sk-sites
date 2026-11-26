import type { Snippet } from "svelte";

export interface AccordionItem {
	value: string;
	title: string;
	content: string | Snippet;
	disabled?: boolean;
}

export interface AccordionProps {
	items: AccordionItem[];
	value?: string;
	type?: "single";
	disabled?: boolean;
	class?: string;
}
