<script lang="ts">
	import { RadioGroup as BitsRadioGroup } from "bits-ui";
	import { loomFocus } from "../lib/loom";
	import { cn } from "../lib/utils";
	import type { RadioGroupProps } from "./types";

	let {
		items,
		value = $bindable(""),
		disabled = false,
		orientation = "vertical",
		name,
		class: className,
	}: RadioGroupProps = $props();
</script>

<BitsRadioGroup.Root
	bind:value
	{disabled}
	{orientation}
	{name}
	data-slot="radio-group"
	class={cn(orientation === "horizontal" ? "flex flex-wrap gap-4" : "grid gap-3", className)}
>
	{#each items as item (item.value)}
		<label class="flex min-h-11 items-center gap-3 text-sm">
			<BitsRadioGroup.Item
				value={item.value}
				disabled={item.disabled || disabled}
				class={cn(
					loomFocus,
					"inline-flex size-5 shrink-0 items-center justify-center rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--primary)] disabled:opacity-40",
					"data-[state=checked]:bg-[color:var(--primary)] data-[state=checked]:text-[color:var(--primary-foreground)]",
				)}
			>
				{#snippet children({ checked })}
					{#if checked}
						<span class="size-2 rounded-[1px] bg-current"></span>
					{/if}
				{/snippet}
			</BitsRadioGroup.Item>
			<span class={(item.disabled || disabled) ? "opacity-60" : ""}>{item.label}</span>
		</label>
	{/each}
</BitsRadioGroup.Root>
