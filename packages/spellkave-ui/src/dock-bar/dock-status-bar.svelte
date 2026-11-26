<script lang="ts">
	import type { Snippet } from "svelte";

	let { groups, trailing }: { groups: readonly { id: string; label: string; icon?: Snippet; content: Snippet }[]; trailing?: Snippet } = $props();
</script>

<div class="dock-status-bar" data-testid="dock-status-bar">
	<div class="dock-status-bar__groups">
		{#each groups as group (group.id)}
			<div role="group" aria-label={`${group.label} status`} class="dock-status-bar__group">
				<span class="dock-status-bar__label">{@render group.icon?.()}{group.label}</span>
				{@render group.content()}
			</div>
		{/each}
	</div>
	<div class="dock-status-bar__trailing">{@render trailing?.()}</div>
</div>

<style>
	.dock-status-bar { display: flex; align-items: center; gap: 0.75rem; inline-size: 100%; min-inline-size: 0; font: 0.75rem/1.3 var(--font-body, sans-serif); text-transform: none; letter-spacing: normal; overflow-wrap: anywhere; }
	.dock-status-bar__groups { display: flex; flex: 1; flex-wrap: wrap; gap: 0.5rem 1rem; min-inline-size: 0; }
	.dock-status-bar__group { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; min-inline-size: 0; }
	.dock-status-bar__label { display: inline-flex; align-items: center; gap: 0.25rem; font-weight: 600; text-transform: uppercase; color: var(--muted-foreground); }
	.dock-status-bar__trailing { display: flex; align-items: center; gap: 0.5rem; margin-inline-start: auto; flex-shrink: 0; }
</style>
