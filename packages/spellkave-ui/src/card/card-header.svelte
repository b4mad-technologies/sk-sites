<script lang="ts">
	import { cn } from "../lib/utils";
	import type { CardHeaderProps } from "./types";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: CardHeaderProps = $props();
</script>

<div
	bind:this={ref}
	data-slot="card-header"
	class={cn(
		"grid auto-rows-min items-start gap-1 has-data-[slot=card-action]:grid-cols-[1fr_auto]",
		className,
	)}
	{...restProps}
>
	{@render children?.()}
</div>
