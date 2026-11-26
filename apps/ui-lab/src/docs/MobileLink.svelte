<script lang="ts">
	import type { Snippet } from "svelte";
	import { cn } from "./cn";

	let {
		href,
		onClose,
		class: className,
		children,
		...restProps
	}: {
		href: string;
		onClose?: () => void;
		class?: string;
		children: Snippet;
		[key: string]: unknown;
	} = $props();
</script>

<a {href} onclick={onClose} class={cn(className)} {...restProps}>
	{@render children()}
</a>
