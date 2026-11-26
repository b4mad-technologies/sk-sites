<script lang="ts">
	import { DropdownMenu as Menu } from "bits-ui";
	import { loomFocus, loomPanel } from "../lib/loom";
	import { cn } from "../lib/utils";
	import type { DockBarEntry, DockBarMenuProps } from "./types";

	let {
		label,
		accessibleLabel,
		trigger: triggerContent,
		header,
		sections,
		onSelect,
		side = "top",
		align = "start",
		disabled,
		class: className,
		...restProps
	}: DockBarMenuProps = $props();

	function hasSubmenu(entry: DockBarEntry): entry is Extract<DockBarEntry, { submenu: DockBarEntry[] }> {
		return "submenu" in entry;
	}

	const itemClass =
		"flex items-center gap-4 px-3 py-1.5 rounded-[calc(var(--radius)-2px)] outline-none data-[highlighted]:bg-[color:var(--muted-surface)] data-[disabled]:opacity-40";
	const separatorClass = "my-1 h-px bg-[color:var(--border)]";
</script>

{#snippet entryList(entries: DockBarEntry[])}
	{#each entries as entry (entry.id)}
		{#if hasSubmenu(entry)}
			<Menu.Sub>
				<Menu.SubTrigger disabled={entry.disabled} class={itemClass}>
					<span>{entry.label}</span>
					<span aria-hidden="true" class="ms-auto">▸</span>
				</Menu.SubTrigger>
				<Menu.Portal>
					<Menu.SubContent
						class={cn(
							loomPanel,
							"z-50 min-w-[12rem] max-w-[22rem] max-h-[50vh] overflow-y-auto p-1 text-sm leading-5",
						)}
					>
						{@render entryList(entry.submenu)}
					</Menu.SubContent>
				</Menu.Portal>
			</Menu.Sub>
		{:else}
			<Menu.Item disabled={entry.disabled} onSelect={() => onSelect?.(entry.id)} class={itemClass}>
				<span>{entry.label}</span>
				{#if entry.hint}
					<span class="ms-auto text-xs text-[color:var(--muted-foreground)]">{entry.hint}</span>
				{/if}
			</Menu.Item>
		{/if}
	{/each}
{/snippet}

<Menu.Root>
	<Menu.Trigger
		aria-label={accessibleLabel ?? label}
		{disabled}
		class={cn(
			"cursor-pointer rounded-full bg-transparent px-2 py-0.5 font-[inherit] text-[color:var(--foreground)] hover:bg-[color:var(--muted-surface)]/50 data-[state=open]:bg-[color:var(--muted-surface)] disabled:pointer-events-none disabled:opacity-40",
			loomFocus,
			className,
		)}
		{...restProps}
	>
		{#if triggerContent}
			{@render triggerContent()}
		{:else}
			<span>{label}</span>
			<span aria-hidden="true" class="ms-0.5 text-[0.6rem]">▴</span>
		{/if}
	</Menu.Trigger>
	<Menu.Portal>
		<Menu.Content
			data-slot="dock-bar-content"
			{side}
			{align}
			sideOffset={4}
			class={cn(
				loomPanel,
				"z-50 min-w-[12rem] max-w-[22rem] max-h-[50vh] overflow-y-auto p-1 text-sm leading-5",
			)}
		>
			{#if header}
				{@render header()}
				{#if sections.length > 0}<Menu.Separator data-slot="dock-bar-separator" class={separatorClass} />{/if}
			{/if}
			{#each sections as section, index (index)}
				{#if index > 0}<Menu.Separator data-slot="dock-bar-separator" class={separatorClass} />{/if}
				{@render entryList(section.entries)}
			{/each}
		</Menu.Content>
	</Menu.Portal>
</Menu.Root>
