<script lang="ts">
	import { cn } from "../lib/utils";
	import type { DockHotbarPip, DockPipsProps } from "./types";

	let { pips, class: className }: DockPipsProps = $props();

	// `${label}: ${state}` per pip, `partial` folding in the remaining
	// percent — the state lives in this text and in the pip's shape, never in
	// color alone.
	function pipAccessibleText(pip: DockHotbarPip): string {
		if (pip.state === "partial") return `${pip.label}: partial ${Math.round((pip.fraction ?? 0) * 100)}%`;
		return `${pip.label}: ${pip.state}`;
	}
</script>

<!-- The resource strip on its own, so a host can put it where it has room:
     `DockHotbar` leads its first row with it; Play's compact dock sets it
     beside the composer instead. -->
<ul role="list" aria-label="Resources" class={cn("flex shrink-0 flex-wrap items-center gap-2.5 px-0.5", className)}>
	{#each pips as pip (pip.id)}
		<li
			role="listitem"
			aria-label={pipAccessibleText(pip)}
			class="flex items-center gap-1 text-[0.7rem] text-[color:var(--muted-foreground)]"
		>
			{#if pip.state === "available"}<span
					aria-hidden="true"
					class="h-2 w-2 shrink-0 rounded-full bg-[color:var(--foreground)]"
				></span>{:else if pip.state === "spent"}<span
					aria-hidden="true"
					class="h-2 w-2 shrink-0 rounded-full border border-[color:var(--muted-foreground)]"
				></span>{:else if pip.state === "partial"}<span
					aria-hidden="true"
					class="relative h-2 w-4 shrink-0 overflow-hidden rounded-[0.15rem] border border-[color:var(--border)]"
					><span
						class="absolute inset-y-0 left-0 bg-[color:var(--foreground)]"
						style:width="{Math.round((pip.fraction ?? 0) * 100)}%"
					></span></span
				>{:else}<span
					aria-hidden="true"
					class="h-2 w-2 shrink-0 rounded-full border border-dashed border-[color:var(--muted-foreground)]"
				></span>{/if}<span class={cn(pip.state === "spent" && "line-through")}>{pip.label}</span>
		</li>
	{/each}
</ul>
