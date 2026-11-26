<script lang="ts">
	import { ScrollArea as BitsScrollArea } from "bits-ui";
	import { loomFrame } from "../lib/loom";
	import { cn } from "../lib/utils";
	import type { ScrollAreaProps } from "./types";

	let { class: className, type = "always", children }: ScrollAreaProps = $props();
</script>

<BitsScrollArea.Root data-slot="scroll-area" {type} class={cn(loomFrame, "relative overflow-hidden bg-[color:var(--card)]", className)}>
	<BitsScrollArea.Viewport class="h-full w-full p-4 text-sm leading-6 text-[color:var(--foreground)]">
		{@render children?.()}
	</BitsScrollArea.Viewport>
	<BitsScrollArea.Scrollbar
		orientation="vertical"
		class="flex w-2.5 touch-none bg-[color:var(--muted)] p-px"
	>
		<BitsScrollArea.Thumb class="relative flex-1 rounded-[var(--radius)] bg-[color:var(--primary)]" />
	</BitsScrollArea.Scrollbar>
	<BitsScrollArea.Corner />
</BitsScrollArea.Root>
