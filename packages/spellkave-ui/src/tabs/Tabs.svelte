<script lang="ts">
	import { Tabs as BitsTabs } from "bits-ui";
	import { cn } from "../lib/utils";
	import type { TabItem, TabsProps } from "./types";

	let {
		items,
		defaultValue,
		ariaLabel = "Tabs",
		class: className,
	}: TabsProps = $props();

	let activeValue = $state("");

	$effect(() => {
		if (activeValue === "") {
			activeValue = defaultValue ?? items[0]?.value ?? "";
		}
	});
</script>

<BitsTabs.Root bind:value={activeValue} data-slot="tabs" class={cn("w-full", className)}>
	<BitsTabs.List
		aria-label={ariaLabel}
		class="flex flex-wrap gap-0 border-b border-[color:var(--border)]"
	>
		{#each items as item (item.value)}
			<BitsTabs.Trigger
				value={item.value}
				disabled={item.disabled}
				class={cn(
					"relative -mb-px border border-transparent border-b-0 px-4 py-2.5 text-sm font-medium tracking-[0.04em] outline-none transition-all duration-200 ease-out",
					"text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)] hover:text-[color:var(--foreground)]",
					"focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-0",
					"data-[state=active]:border-[color:var(--border)] data-[state=active]:border-b-[color:var(--card)] data-[state=active]:bg-[color:var(--card)]",
					"data-[state=active]:text-[color:var(--primary)] data-[state=active]:translate-y-px",
					"disabled:pointer-events-none disabled:opacity-40",
				)}
			>
				{item.label}
			</BitsTabs.Trigger>
		{/each}
	</BitsTabs.List>

	{#each items as item (item.value)}
		<BitsTabs.Content
			value={item.value}
			class="pt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]"
		>
			{#if typeof item.content === "string"}
				{item.content}
			{:else}
				{@render item.content()}
			{/if}
		</BitsTabs.Content>
	{/each}
</BitsTabs.Root>

<style>
	:global([data-slot="tabs"] [role="tab"][data-state="active"]) {
		background-image: var(--panel-active-image);
		background-position: center;
	}
</style>
