<script lang="ts">
	import type { Snippet } from "svelte";
	import type { HTMLButtonAttributes } from "svelte/elements";

	let { selected = false, compact = false, children, class: className, ...rest }: HTMLButtonAttributes & { selected?: boolean; compact?: boolean; children?: Snippet } = $props();
	let element: HTMLButtonElement | undefined;
	$effect(() => { if (selected) element?.scrollIntoView?.({ block: "nearest" }); });
</script>

<button bind:this={element} type="button" {...rest} class={["browse-row", className]} data-selected={selected} data-compact={compact}>
	{@render children?.()}
</button>

<style>
	.browse-row { display: flex; align-items: baseline; gap: .5rem; inline-size: 100%; min-inline-size: 0; padding: .4rem .6rem; border: 0; border-inline-start: 3px solid transparent; background: transparent; color: var(--foreground); text-align: start; cursor: pointer; overflow-wrap: anywhere; }
	.browse-row[data-compact="true"] { padding: .3rem .4rem; font-size: .9rem; line-height: 1.3; }
	.browse-row:hover { background: color-mix(in srgb, var(--foreground) 7%, transparent); }
	.browse-row[data-selected="true"], .browse-row[data-selected="true"]:hover { background: color-mix(in srgb, var(--primary) 20%, transparent); border-inline-start-color: var(--primary); }
	.browse-row:focus-visible { outline: 2px solid var(--ring); outline-offset: -2px; }
</style>
