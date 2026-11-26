<script lang="ts">
	import { cn } from "../lib/utils";
	import type { ChatEntryProps } from "./types";

	let { tone, label, meta, outcome, children, actions, class: className }: ChatEntryProps = $props();
</script>

<article
	data-slot="chat-entry"
	data-tone={tone}
	data-outcome={outcome}
	class={cn(
		"rounded-[var(--radius)] px-4 py-3",
		tone === "agent" && "bg-[color:var(--secondary)]",
		tone === "person" && "border border-[color:var(--border)]",
		tone === "host" &&
			"border-l-[3px] bg-[color:var(--muted)]/10 text-[0.9rem] " +
				(outcome === "failed" ? "border-l-[color:var(--destructive)]" : "border-l-[color:var(--primary)]"),
		tone === "failure" && "border border-[color:var(--destructive)] text-[color:var(--destructive)]",
		className,
	)}
>
	<p class="mb-1.5 text-xs font-semibold tracking-[0.1em] uppercase">
		{label}
		{#if meta}<span class="ml-1 font-normal tracking-normal text-[color:var(--muted-foreground)]">{meta}</span>{/if}
	</p>
	<div class="min-w-0">{@render children()}</div>
	{#if actions}<div class="mt-2 flex flex-wrap gap-2">{@render actions()}</div>{/if}
</article>
