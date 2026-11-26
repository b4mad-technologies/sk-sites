<script lang="ts">
	import { cn } from "./cn";
	import type { NavLeaf } from "./pages";
	import { href, router } from "./router.svelte";

	let { items = [] }: { items: NavLeaf[] } = $props();
</script>

{#if items.length}
	<div class="grid grid-flow-row auto-rows-max gap-px pl-4 text-sm">
		{#each items as item (item.path)}
			<a
				href={href(item.path)}
				class={cn(
					"inline-flex w-full items-center rounded-[var(--radius)] px-2.5 py-1.5 text-[color:var(--foreground)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--foreground)]",
					router.path === item.path
						? "bg-[color:var(--muted-surface)]"
						: "hover:bg-[color:var(--muted-surface)]/50",
				)}
				aria-current={router.path === item.path ? "page" : undefined}
			>
				{item.title}
			</a>
		{/each}
	</div>
{/if}
