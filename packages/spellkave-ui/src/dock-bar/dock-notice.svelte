<script lang="ts">
	import { loomFocus } from "../lib/loom";
	import { cn } from "../lib/utils";
	import type { DockNoticeProps } from "./types";

	let { text, tone = "info", onDismiss, action, class: className }: DockNoticeProps = $props();
</script>

<!-- Out of the host's flow (`position: absolute; bottom: 100%`): a pending or
     rejected notice must not grow the dock, or the mosaic above it reflows
     for the notice's duration. The host stays the positioning context — it
     is already `position: fixed` in `PlayDock`, which is a positioned
     ancestor too. -->
<div
	role="status"
	data-slot="dock-notice"
	class={cn(
		"absolute bottom-full [inset-inline:0.75rem] flex w-max max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-t-[var(--radius)] border border-b-0 border-[color:var(--border)] bg-[color:var(--card)] px-2.5 py-[0.2rem] text-xs text-[color:var(--muted-foreground)]",
		tone === "warn" && "border-[color:var(--destructive)]",
		className,
	)}
>
	<span class="min-w-0 break-words">{text}</span>
	{#if action}
		<button
			type="button"
			data-slot="dock-notice-action"
			onclick={action.onSelect}
			class={cn(
				"shrink-0 rounded-[0.25rem] border border-[color:var(--border)] px-1.5 py-px leading-tight text-[color:var(--foreground)] hover:bg-[color:var(--accent)]",
				loomFocus,
			)}
		>
			{action.label}
		</button>
	{/if}
	{#if onDismiss}
		<button
			type="button"
			aria-label="Dismiss"
			onclick={onDismiss}
			class={cn(
				"shrink-0 rounded-[0.25rem] px-1 leading-none text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]",
				loomFocus,
			)}
		>
			×
		</button>
	{/if}
</div>
