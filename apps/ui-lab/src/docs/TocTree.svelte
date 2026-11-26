<script lang="ts">
	import { cn } from "./cn";
	import { href, router } from "./router.svelte";
	import Tree from "./TocTree.svelte";
	import type { TocItem } from "./toc";

	let {
		tree,
		level = 1,
		activeUrl,
	}: {
		tree: TocItem[];
		level?: number;
		activeUrl: string | null;
		onSelect?: (id: string) => void;
	} = $props();
</script>

{#if tree.length && level < 3}
	<ul
		class={cn("m-0 list-none", level !== 1 && "pl-4", level === 1 && "border-l border-[color:var(--border)]")}
	>
		{#each tree as item, index (index)}
			{@const isActive = activeUrl === item.url}
			<li class="mt-0">
				<a
					aria-current={isActive ? "location" : undefined}
					href={href(router.path, item.url.slice(1))}
					onclick={(event) => {
						if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
						// A repeated click does not cause hashchange; still scroll to its target.
						if (window.location.hash !== href(router.path, item.url.slice(1))) return;
						const id = item.url.replace(/^#/, "");
						document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
					}}
					class={cn(
						"inline-block border-l border-l-transparent py-[5px] pl-5 leading-4 no-underline hover:text-[color:var(--foreground)]",
						isActive
							? "border-l-[color:var(--foreground)] text-[color:var(--foreground)]"
							: "border-l-transparent text-[color:var(--muted-foreground)]",
						level !== 1 && "-ml-4 pl-10",
					)}
				>
					{item.title}
				</a>
				{#if item.items?.length}
					<Tree tree={item.items} level={level + 1} {activeUrl} />
				{/if}
			</li>
		{/each}
	</ul>
{/if}
