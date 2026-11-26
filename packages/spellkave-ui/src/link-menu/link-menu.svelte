<script lang="ts">
	import { DropdownMenu as Menu } from "bits-ui";
	import type { Snippet } from "svelte";
	import { loomFocus, loomPanel } from "../lib/loom";
	import { cn } from "../lib/utils";
	import type { LinkMenuItem, LinkMenuProps } from "./types";

	let {
		items,
		label,
		onSelect,
		class: className,
		children,
		...restProps
	}: LinkMenuProps & { children: Snippet } = $props();
</script>

<Menu.Root>
	<Menu.Trigger
		aria-label={label}
		class={cn(
			"cursor-pointer rounded-[0.25rem] px-[0.125rem] font-[inherit] text-[color:var(--primary)] underline-offset-4 hover:underline",
			loomFocus,
			className,
		)}
		{...restProps}
	>
		{@render children()}
	</Menu.Trigger>
	<Menu.Portal>
		<Menu.Content
			data-slot="link-menu-content"
			sideOffset={6}
			align="start"
			class={cn(
				loomPanel,
				"z-50 min-w-[14rem] max-w-[22rem] p-1 text-sm leading-5 text-[color:var(--foreground)]",
			)}
		>
			{#each items as item (item.href ?? item.label)}
				<Menu.Item
					onSelect={() => onSelect?.(item)}
					class="flex cursor-pointer flex-col rounded-[calc(var(--radius)-2px)] px-3 py-2 outline-none data-[highlighted]:bg-[color:var(--muted-surface)]"
				>
					<span class="font-medium">{item.label}</span>
					{#if item.kind}
						<span class="text-xs text-[color:var(--muted-foreground)]">{item.kind}</span>
					{/if}
				</Menu.Item>
			{/each}
		</Menu.Content>
	</Menu.Portal>
</Menu.Root>
