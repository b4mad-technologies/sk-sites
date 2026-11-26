<script lang="ts">
	import { loomFocus } from "../lib/loom";
	import { cn } from "../lib/utils";
	import type { InputProps } from "./types";

	let {
		ref = $bindable(null),
		value = $bindable(),
		type,
		files = $bindable(),
		class: className,
		"data-slot": dataSlot = "input",
		...restProps
	}: InputProps = $props();

	const controlClass = $derived(
		cn(
			loomFocus,
			"min-h-11 w-full min-w-0 rounded-[var(--radius)] border border-input bg-background px-3 text-sm font-normal tracking-normal text-foreground file:inline-flex file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive",
			className,
		),
	);
</script>

{#if type === "file"}
	<input
		bind:this={ref}
		data-slot={dataSlot}
		class={controlClass}
		type="file"
		bind:files
		bind:value
		{...restProps}
	/>
{:else}
	<input
		bind:this={ref}
		data-slot={dataSlot}
		class={controlClass}
		{type}
		bind:value
		{...restProps}
	/>
{/if}
