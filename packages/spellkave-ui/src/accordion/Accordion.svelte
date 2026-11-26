<script lang="ts">
	import { Accordion as BitsAccordion } from "bits-ui";
	import { loomFocus } from "../lib/loom";
	import { cn } from "../lib/utils";
	import type { AccordionProps } from "./types";

	let {
		items,
		value = $bindable(""),
		disabled = false,
		class: className,
	}: AccordionProps = $props();

	$effect(() => {
		if (value === "" && items[0]?.value) {
			value = items[0].value;
		}
	});
</script>

<BitsAccordion.Root
	type="single"
	bind:value
	{disabled}
	data-slot="accordion"
	class={cn("grid gap-px", className)}
>
	{#each items as item (item.value)}
		<BitsAccordion.Item
			value={item.value}
			disabled={item.disabled}
			class="border border-[color:var(--border)] bg-[color:var(--card)] first:rounded-t-[var(--radius)] last:rounded-b-[var(--radius)]"
		>
			<BitsAccordion.Header>
				<BitsAccordion.Trigger
					class={cn(
						loomFocus,
						"flex min-h-11 w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm font-medium tracking-[0.03em] text-[color:var(--foreground)]",
						"hover:bg-[color:var(--muted)] disabled:opacity-40",
					)}
				>
					{item.title}
					<span aria-hidden="true" class="text-[color:var(--primary)]">+</span>
				</BitsAccordion.Trigger>
			</BitsAccordion.Header>
			<BitsAccordion.Content class="px-4 pb-4 text-sm leading-6 text-[color:var(--muted-foreground)]">
				{#if typeof item.content === "string"}
					{item.content}
				{:else}
					{@render item.content()}
				{/if}
			</BitsAccordion.Content>
		</BitsAccordion.Item>
	{/each}
</BitsAccordion.Root>
