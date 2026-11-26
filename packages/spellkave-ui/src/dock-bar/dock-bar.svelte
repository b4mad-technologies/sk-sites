<script lang="ts">
	import { cn } from "../lib/utils";
	import type { DockBarProps } from "./types";

	// A dock row mixes status, controls, and optional menus. It is a layout
	// group, not a desktop application menu bar; each DockBarMenu owns its own
	// accessible DropdownMenu root.
	let { class: className, children }: DockBarProps = $props();
</script>

<div class={cn("flex items-center gap-2", className)}>
	{@render children()}
</div>
