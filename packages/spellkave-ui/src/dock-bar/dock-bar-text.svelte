<script lang="ts">
	import { cn } from "../lib/utils";
	import type { DockBarTextProps } from "./types";

	let { children, tone = "muted", class: className }: DockBarTextProps = $props();
</script>

<span
	class={cn(
		tone === "chip"
			? "rounded-full border border-[color:var(--border)] px-2 py-px text-xs text-[color:var(--muted-foreground)]"
			: "text-xs text-[color:var(--muted-foreground)]",
		className,
	)}
>
	{@render children()}
</span>
