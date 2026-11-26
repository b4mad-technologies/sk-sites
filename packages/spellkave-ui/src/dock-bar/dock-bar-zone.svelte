<script lang="ts">
	import { cn } from "../lib/utils";
	import type { DockBarZoneProps } from "./types";

	let { children, end, class: className }: DockBarZoneProps = $props();
</script>

<div class={cn("flex min-w-0 items-center gap-1.5", end && "ms-auto", className)}>
	{@render children()}
</div>
