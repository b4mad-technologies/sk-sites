<script lang="ts">
	import { loomFocus } from "../lib/loom";
	import { cn } from "../lib/utils";
	import type { DockBarActionProps } from "./types";

	let {
		label,
		key,
		accessibleLabel,
		disabled,
		pending,
		dimmed,
		dimmedReason,
		active,
		onclick,
		class: className,
	}: DockBarActionProps = $props();
</script>

<button
	type="button"
	disabled={disabled && !dimmed}
	aria-disabled={dimmed ? "true" : undefined}
	aria-busy={pending ? "true" : undefined}
	aria-pressed={active ? "true" : undefined}
	title={dimmed ? dimmedReason : label}
	aria-label={key !== undefined ? `${key} ${accessibleLabel ?? label}` : accessibleLabel}
	onclick={() => {
		if (!disabled && !pending && !dimmed) onclick();
	}}
	class={cn(
		"inline-flex items-center gap-1 rounded-[0.375rem] border border-[color:var(--border)] bg-[color:var(--background)] px-2 text-xs leading-5 text-[color:var(--foreground)] hover:bg-[color:var(--muted-surface)] disabled:pointer-events-none",
		pending && "bg-[color:var(--muted-surface)] text-[color:var(--muted-foreground)]",
		dimmed && "pointer-events-none text-[color:var(--muted-foreground)] hover:bg-transparent",
		active && "bg-[color:var(--accent)]",
		loomFocus,
		className,
	)}
>
	{#if key !== undefined}
		<span
			aria-hidden="true"
			class="rounded-[0.25rem] border border-[color:var(--border)] px-1 text-[0.65rem] text-[color:var(--muted-foreground)]"
			>{key}</span
		>
	{/if}
	<span class="max-w-[11rem] truncate">{label}</span>
</button>
