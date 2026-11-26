import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";

export type CodeBlockProps = HTMLAttributes<HTMLPreElement> & {
	children?: Snippet;
	ref?: HTMLPreElement | null;
};
