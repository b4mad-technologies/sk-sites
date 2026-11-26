import type { Snippet } from "svelte";

export interface ScrollAreaProps {
	class?: string;
	type?: "hover" | "scroll" | "auto" | "always";
	children?: Snippet;
}
