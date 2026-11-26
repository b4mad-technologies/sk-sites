<script lang="ts">
	import { Select as BitsSelect } from "bits-ui";
	import { loomFocus, loomFrame, loomPanel, loomTrigger } from "../lib/loom";
	import { cn } from "../lib/utils";
	import type { SelectProps } from "./types";

	let {
		items,
		value = $bindable(""),
		open = $bindable(false),
		placeholder = "Choose",
		disabled = false,
		name,
		accessibleLabel,
		onValueChange,
		class: className,
		portal = true,
	}: SelectProps = $props();
</script>

<BitsSelect.Root type="single" bind:value bind:open {disabled} {name} {items} {onValueChange}>
	<BitsSelect.Trigger
		data-slot="select-trigger"
		aria-label={accessibleLabel}
		class={cn(loomTrigger, "min-w-[12rem] justify-between gap-3 normal-case tracking-[0.03em]", className)}
	>
		<BitsSelect.Value {placeholder} />
		<span aria-hidden="true" class="text-[color:var(--primary)]">▾</span>
	</BitsSelect.Trigger>
	<BitsSelect.Portal disabled={!portal}>
		<BitsSelect.Content
			data-slot="select-content"
			class={cn(loomPanel, loomFocus, "z-50 min-w-[var(--bits-select-anchor-width)] p-1")}
		>
			<BitsSelect.Viewport class="max-h-60 overflow-y-auto">
				{#each items as item (item.value)}
					<BitsSelect.Item
						value={item.value}
						label={item.label}
						disabled={item.disabled}
						class={cn(
							loomFocus,
							loomFrame,
							"flex min-h-11 cursor-pointer items-center px-3 text-sm data-highlighted:bg-[color:var(--muted)] data-[state=checked]:text-[color:var(--primary)]",
							"border-transparent data-[disabled]:opacity-40",
						)}
					>
						{item.label}
					</BitsSelect.Item>
				{/each}
			</BitsSelect.Viewport>
		</BitsSelect.Content>
	</BitsSelect.Portal>
</BitsSelect.Root>
