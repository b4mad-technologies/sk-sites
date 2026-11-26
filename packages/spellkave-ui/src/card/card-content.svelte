<script lang="ts">
	import { cn } from "../lib/utils";
	import type { CardContentProps } from "./types";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: CardContentProps = $props();
</script>

<div bind:this={ref} data-slot="card-content" class={cn(className)} {...restProps}>
	{@render children?.()}
</div>
