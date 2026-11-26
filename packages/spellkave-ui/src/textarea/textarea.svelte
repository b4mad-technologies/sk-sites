<script lang="ts">
	import { loomFocus } from "../lib/loom";
	import { cn } from "../lib/utils";
	import type { TextareaProps } from "./types";

	let {
		ref = $bindable(null),
		value = $bindable(),
		class: className,
		"data-slot": dataSlot = "textarea",
		...restProps
	}: TextareaProps = $props();
</script>

<textarea
	bind:this={ref}
	data-slot={dataSlot}
	class={cn(
		loomFocus,
		"field-sizing-content flex min-h-16 w-full rounded-[var(--radius)] border border-input bg-background px-3 py-2 text-sm font-normal tracking-normal text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive",
		className,
	)}
	bind:value
	{...restProps}
></textarea>
