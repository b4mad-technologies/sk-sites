<script lang="ts">
	import { cn } from "../lib/utils";
	import type { ThoughtRowProps } from "./types";

	let { text, live = false, open = $bindable(false), class: className }: ThoughtRowProps = $props();
	const firstLine = $derived(text.trim().split("\n")[0] ?? "");
</script>

<details
	data-slot="thought-row"
	bind:open
	class={cn("group text-sm text-[color:var(--muted-foreground)]", className)}
>
	<summary class="flex cursor-pointer list-none items-baseline gap-2 py-1 hover:text-[color:var(--foreground)]">
		<span aria-hidden="true" class="text-[color:var(--primary)]">{open ? "−" : "+"}</span>
		<span class="font-medium">{live ? "Thinking…" : "Thought"}</span>
		{#if !open}<span class="min-w-0 truncate italic">{firstLine}</span>{/if}
	</summary>
	<p class="mt-1 ml-5 whitespace-pre-wrap italic">{text}</p>
</details>
