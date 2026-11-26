<script lang="ts">
	import { Collapsible as BitsCollapsible } from "bits-ui";
	import { loomFocus } from "../lib/loom";
	import { cn } from "../lib/utils";
	import type { CollapsibleProps } from "./types";

	let {
		title,
		content,
		open = $bindable(false),
		disabled = false,
		onOpenChange,
		class: className,
	}: CollapsibleProps = $props();

	function handleOpenChange(next: boolean) {
		open = next;
		onOpenChange?.(next);
	}
</script>

<BitsCollapsible.Root
	{open}
	{disabled}
	onOpenChange={handleOpenChange}
	data-slot="collapsible"
	class={cn(
		"rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--card)]",
		className,
	)}
>
	<BitsCollapsible.Trigger
		class={cn(
			loomFocus,
			"flex min-h-11 w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm font-medium tracking-[0.03em] text-[color:var(--foreground)]",
			"hover:bg-[color:var(--muted)]/15 disabled:opacity-40",
		)}
	>
		{#if typeof title === "string"}
			{title}
		{:else}
			{@render title()}
		{/if}
		<span aria-hidden="true" class="text-[color:var(--primary)]">{open ? "−" : "+"}</span>
	</BitsCollapsible.Trigger>
	<BitsCollapsible.Content
		hiddenUntilFound={false}
		class="px-4 pb-4 text-sm leading-6 text-[color:var(--muted-foreground)]"
	>
		{#if typeof content === "string"}
			{content}
		{:else}
			{@render content()}
		{/if}
	</BitsCollapsible.Content>
</BitsCollapsible.Root>
