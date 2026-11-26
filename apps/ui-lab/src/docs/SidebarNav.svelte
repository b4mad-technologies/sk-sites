<script lang="ts">
	import { NAV_GROUPS } from "./pages";
	import SidebarNavItems from "./SidebarNavItems.svelte";
</script>

<aside
	class="fixed top-[70px] hidden h-[calc(100vh-70px)] w-full shrink-0 overflow-y-auto border-r border-[color:var(--border)] md:sticky md:block"
>
	<div class="h-full pb-6 pr-4 pt-4 lg:pb-8">
		<nav class="space-y-3" aria-label="Documentation">
			<div class="flex w-full flex-col pb-12">
				{#each NAV_GROUPS as group (group.title)}
					<div class="pb-4">
						<h4
							class="mb-1 ml-[9px] rounded-[var(--radius)] px-2.5 py-2 pl-4 text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--muted-foreground)]"
						>
							{group.title}
						</h4>
						<SidebarNavItems items={group.items} />
					</div>
				{/each}
			</div>
		</nav>
	</div>
</aside>
