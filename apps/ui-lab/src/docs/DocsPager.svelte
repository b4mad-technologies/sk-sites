<script lang="ts">
	import { cn } from "./cn";
	import { FLAT_PAGES } from "./pages";
	import { href, router } from "./router.svelte";

	const index = $derived(FLAT_PAGES.findIndex((item) => item.path === router.path));
	const previous = $derived(index > 0 ? FLAT_PAGES[index - 1] : undefined);
	const next = $derived(index >= 0 && index < FLAT_PAGES.length - 1 ? FLAT_PAGES[index + 1] : undefined);
</script>

<hr class="my-6 h-px border-0 bg-[color:var(--border)]" />
<div class="flex flex-col gap-4 pt-1">
	<div class="grid grid-cols-2 gap-4">
		{#if previous}
			<a
				href={href(previous.path)}
				class={cn(
					"group flex flex-col gap-2 rounded-[var(--radius)] border border-[color:var(--border)] p-4 transition-colors",
					"hover:bg-[color:var(--muted-surface)]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--foreground)]",
				)}
			>
				<span class="text-xs font-medium text-[color:var(--muted-foreground)]">Previous</span>
				<span class="font-medium text-[color:var(--foreground)]">{previous.title}</span>
			</a>
		{/if}
		{#if next}
			<a
				href={href(next.path)}
				class={cn(
					"group col-start-2 flex flex-col gap-2 rounded-[var(--radius)] border border-[color:var(--border)] p-4 text-right transition-colors",
					"hover:bg-[color:var(--muted-surface)]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--foreground)]",
				)}
			>
				<span class="text-xs font-medium text-[color:var(--muted-foreground)]">Next</span>
				<span class="font-medium text-[color:var(--foreground)]">{next.title}</span>
			</a>
		{/if}
	</div>
</div>
