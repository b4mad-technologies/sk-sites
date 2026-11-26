<script lang="ts">
	import { cn } from "../lib/utils";
	import type { CardFooterProps } from "./types";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: CardFooterProps = $props();
</script>

<div
	bind:this={ref}
	data-slot="card-footer"
	class={cn("flex items-center border-t border-border pt-4", className)}
	{...restProps}
>
	{@render children?.()}
</div>
