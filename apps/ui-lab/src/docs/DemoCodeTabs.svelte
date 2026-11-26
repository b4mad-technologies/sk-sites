<script lang="ts">
	import type { Snippet } from "svelte";
	import { cn } from "./cn";
	import { useCopyToClipboard } from "./copy-to-clipboard.svelte";
	import Icon from "./Icon.svelte";

	let {
		fileName,
		open = $bindable(false),
		children,
	}: {
		fileName: string;
		open: boolean;
		children: Snippet;
	} = $props();

	const copyToClipboard = useCopyToClipboard();
</script>

{#if open}
	<div class="flex items-center justify-between border-x border-[color:var(--border)] pb-1 pt-1">
		<div class="flex items-center" data-slot="code-tabs">
			<span
				class="border-b-2 border-[color:var(--foreground)] px-4 py-2 text-sm text-[color:var(--foreground)]"
			>
				{fileName}
			</span>
		</div>
		<div class="flex items-center gap-2 pr-2 text-sm">
			<button
				type="button"
				class={cn(
					"hidden select-none items-center justify-center rounded-[var(--radius)] px-2.5 py-1.5 text-sm text-[color:var(--foreground)] transition-colors sm:inline-flex",
					"hover:bg-[color:var(--muted-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--foreground)]",
				)}
				aria-label="Toggle code expansion"
				onclick={() => (open = !open)}
			>
				{open ? "Collapse" : "Expand"} Code
			</button>
			<button
				type="button"
				class={cn(
					"relative inline-flex items-center justify-center rounded-[var(--radius)] px-2 py-1.5 text-sm text-[color:var(--muted-foreground)] transition-colors",
					"hover:bg-[color:var(--muted-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--foreground)]",
				)}
				aria-label="Copy"
				onclick={() => copyToClipboard?.copyToClipboard()}
			>
				{#if !copyToClipboard?.isCopied}
					<Icon name="copy" class="size-4" />
				{:else}
					<Icon name="check" class="size-4" />
				{/if}
			</button>
		</div>
	</div>
	{@render children()}
{:else}
	<button
		type="button"
		class="flex w-full items-center justify-center rounded-b-[var(--radius)] border border-t-0 border-[color:var(--border)] bg-[color:var(--background)] py-3 text-sm font-medium text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:var(--muted-surface)] hover:text-[color:var(--foreground)]"
		onclick={() => (open = true)}
	>
		Expand Code
	</button>
	<div class="hidden">
		{@render children()}
	</div>
{/if}
