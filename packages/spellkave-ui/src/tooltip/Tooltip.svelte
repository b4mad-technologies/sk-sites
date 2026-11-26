<script lang="ts">
	import { Tooltip as BitsTooltip } from "bits-ui";
	import { loomFocus, loomPanel, loomTrigger } from "../lib/loom";
	import { cn } from "../lib/utils";
	import type { TooltipProps } from "./types";

	let {
		content,
		triggerLabel = "Hint",
		triggerAriaLabel,
		triggerClass,
		open = $bindable(false),
		delayDuration = 200,
		disabled = false,
		class: className,
		children,
	}: TooltipProps = $props();
</script>

<BitsTooltip.Provider>
	<BitsTooltip.Root bind:open {delayDuration} {disabled}>
		<BitsTooltip.Trigger
			aria-label={triggerAriaLabel}
			class={triggerClass ?? cn(loomTrigger, "normal-case tracking-[0.03em]")}
		>
			{#if children}
				{@render children()}
			{:else}
				{triggerLabel}
			{/if}
		</BitsTooltip.Trigger>
		<BitsTooltip.Portal>
			<BitsTooltip.Content
				data-slot="tooltip-content"
				sideOffset={6}
				class={cn(loomPanel, loomFocus, "z-50 max-w-[18rem] px-3 py-2 text-sm leading-5", className)}
			>
				{content}
			</BitsTooltip.Content>
		</BitsTooltip.Portal>
	</BitsTooltip.Root>
</BitsTooltip.Provider>
