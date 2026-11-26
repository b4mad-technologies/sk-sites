<script lang="ts">
	import { DropdownMenu as Menu } from "bits-ui";
	import { loomFocus, loomPanel } from "../lib/loom";
	import { cn } from "../lib/utils";
	import type { ActionMenuEntry, ActionMenuProps } from "./types";

	// A real `role="menu"` (bits-ui `DropdownMenu`, the same shared menu
	// primitive `LinkMenu` already uses) — not `dock-bar-menu`, which needs a
	// `Menubar.Root` ancestor and carries `role="menubar"` semantics meant
	// for a bar of menu triggers, not a lone icon button next to a name.
	let {
		label,
		items,
		onSelect,
		open = $bindable(false),
		onOpenChange,
		trigger: triggerContent,
		class: className,
		triggerClass,
	}: ActionMenuProps = $props();

	function hasSubmenu(
		entry: ActionMenuEntry,
	): entry is Extract<ActionMenuEntry, { submenu: ActionMenuEntry[] }> {
		return "submenu" in entry;
	}

	const itemClass =
		"flex items-center gap-4 px-3 py-1.5 rounded-[calc(var(--radius)-2px)] outline-none data-[highlighted]:bg-[color:var(--muted-surface)] data-[disabled]:opacity-40";
	const contentClass = cn(
		loomPanel,
		"z-50 min-w-[12rem] max-w-[16rem] max-h-[60vh] overflow-y-auto p-1 text-sm leading-5",
	);
</script>

{#snippet entryList(entries: ActionMenuEntry[])}
	{#each entries as entry (entry.id)}
		{#if hasSubmenu(entry)}
			<Menu.Sub>
				<Menu.SubTrigger class={itemClass}>
					<span>{entry.label}</span>
					<span aria-hidden="true" class="ms-auto">▸</span>
				</Menu.SubTrigger>
				<Menu.Portal>
					<Menu.SubContent class={contentClass}>
						{@render entryList(entry.submenu)}
					</Menu.SubContent>
				</Menu.Portal>
			</Menu.Sub>
		{:else}
			<Menu.Item
				disabled={entry.disabled}
				onSelect={() => onSelect?.(entry.id)}
				class={itemClass}
			>
				<span>{entry.label}</span>
				{#if entry.hint}
					<span class="ms-auto text-xs text-[color:var(--muted-foreground)]">{entry.hint}</span>
				{/if}
			</Menu.Item>
		{/if}
	{/each}
{/snippet}

<!-- No whitespace between the trigger and the portal: this menu sits inline
     after a name, and a text node there shows as a gap before the next
     character (a comma). -->
<Menu.Root bind:open {onOpenChange}>
	<Menu.Trigger
		aria-label={label}
		class={cn(
			loomFocus,
			"rounded-full px-1 leading-none text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted-surface)]/50 hover:text-[color:var(--foreground)] data-[state=open]:bg-[color:var(--muted-surface)]",
			triggerClass,
		)}
	>
		{#if triggerContent}
			{@render triggerContent()}
		{:else}
			<span aria-hidden="true">⋯</span>
		{/if}
	</Menu.Trigger
	><Menu.Portal>
		<Menu.Content
			data-slot="action-menu-content"
			sideOffset={4}
			align="start"
			class={cn(contentClass, className)}
		>
			{@render entryList(items)}
		</Menu.Content>
	</Menu.Portal>
</Menu.Root>
