<script lang="ts">
	import { cn } from "../lib/utils";
	import type { CardDescriptionProps } from "./types";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: CardDescriptionProps = $props();
</script>

<p
	bind:this={ref}
	data-slot="card-description"
	class={cn("text-sm text-muted-foreground", className)}
	{...restProps}
>
	{@render children?.()}
</p>
