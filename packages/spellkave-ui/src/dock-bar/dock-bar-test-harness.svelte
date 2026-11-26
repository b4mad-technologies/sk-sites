<script lang="ts">
	import type { Snippet } from "svelte";
	import DockBar from "./dock-bar.svelte";
	import DockBarMenu from "./dock-bar-menu.svelte";
	import type { DockBarMenuProps } from "./types";

	// Test-only wrapper: `DockBarMenu` needs a `Menubar.Root` ancestor for
	// its context, so tests render this instead of the menu alone.
	let { menus, extra }: { menus: DockBarMenuProps[]; extra?: Snippet } = $props();
</script>

<DockBar>
	{#each menus as menu, index (index)}
		<DockBarMenu {...menu} />
	{/each}
	{#if extra}
		{@render extra()}
	{/if}
</DockBar>
