<script lang="ts">
	import { cn } from "../lib/utils";
	import type { DockBarDividerProps } from "./types";

	let { class: className }: DockBarDividerProps = $props();
</script>

<span aria-hidden="true" class={cn("mx-2 h-4 w-px bg-[color:var(--border)]", className)}></span>
