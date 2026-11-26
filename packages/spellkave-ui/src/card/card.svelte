<script lang="ts">
	import { cn } from "../lib/utils";
	import type { CardProps } from "./types";

	let {
		ref = $bindable(null),
		class: className,
		children,
		size = "default",
		...restProps
	}: CardProps = $props();
</script>

<div
	bind:this={ref}
	data-slot="card"
	data-size={size}
	class={cn(
		"flex flex-col gap-4 rounded-[var(--radius)] border border-border bg-card p-6 text-sm text-card-foreground",
		size === "sm" && "gap-3 p-4",
		className,
	)}
	{...restProps}
>
	{@render children?.()}
</div>
