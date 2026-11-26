<script lang="ts">
	import { loomFocus } from "../lib/loom";
	import { cn } from "../lib/utils";
	import type { SidebarItemProps } from "./types";

	let { label, detail, mark, trailing, active = false, onclick, class: className }: SidebarItemProps = $props();
	const markClass: Record<NonNullable<SidebarItemProps["mark"]>, string> = {
		busy: "animate-pulse bg-[color:var(--primary)]",
		ok: "bg-[color:var(--primary)]",
		failed: "bg-[color:var(--destructive)]",
		stopped: "border border-[color:var(--muted-foreground)]",
		idle: "bg-[color:var(--muted-foreground)]/50",
	};
</script>

<li data-slot="sidebar-item">
	<button
		type="button"
		{onclick}
		aria-current={active ? "page" : undefined}
		class={cn(
			loomFocus,
			"flex w-full min-w-0 items-center gap-2.5 rounded-[var(--radius)] px-2 py-1.5 text-left text-sm",
			"hover:bg-[color:var(--muted)]/15",
			active && "bg-[color:var(--secondary)] font-medium",
			className,
		)}
	>
		{#if mark}<span aria-hidden="true" class={cn("inline-block size-2 shrink-0 rounded-full", markClass[mark])}></span>{/if}
		<span class="flex min-w-0 flex-1 flex-col">
			<span class="truncate">{label}</span>
			{#if detail}<span class="truncate text-xs text-[color:var(--muted-foreground)]">{detail}</span>{/if}
		</span>
		{#if trailing}<span class="shrink-0 text-xs text-[color:var(--muted-foreground)]">{trailing}</span>{/if}
	</button>
</li>
