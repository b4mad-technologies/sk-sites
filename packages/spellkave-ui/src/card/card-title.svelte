<script lang="ts">
	import { cn } from "../lib/utils";
	import type { CardTitleProps } from "./types";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: CardTitleProps = $props();
</script>

<div
	bind:this={ref}
	data-slot="card-title"
	class={cn("text-base leading-snug font-medium text-foreground", className)}
	{...restProps}
>
	{@render children?.()}
</div>
