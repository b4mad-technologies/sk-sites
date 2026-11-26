<script lang="ts">
	import { cn } from "../lib/utils";
	import type { SidebarSectionProps } from "./types";

	let { title, children, actions, class: className }: SidebarSectionProps = $props();
</script>

<section data-slot="sidebar-section" class={cn("px-2 py-3", className)}>
	<div class="flex items-center justify-between gap-2 px-2 pb-1.5">
		<h2 class="m-0 text-xs font-semibold tracking-[0.1em] text-[color:var(--muted-foreground)] uppercase">{title}</h2>
		{#if actions}<div class="flex gap-1">{@render actions()}</div>{/if}
	</div>
	<ul class="m-0 flex list-none flex-col gap-0.5 p-0">{@render children()}</ul>
</section>
