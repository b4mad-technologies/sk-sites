<script lang="ts">
	import { Popover as BitsPopover } from "bits-ui";
	import { loomFocus, loomPanel, loomTrigger } from "../lib/loom";
	import { cn } from "../lib/utils";
	import type { PopoverProps } from "./types";

	let {
		open = $bindable(false),
		triggerLabel = "Open",
		trigger: triggerContent,
		onTriggerKeydown,
		triggerAriaLabel,
		triggerClass,
		inline = false,
		openOnHover = false,
		openDelay = 400,
		closeDelay = 250,
		onOpenChange,
		accessibleLabel,
		disabled = false,
		class: className,
		children,
	}: PopoverProps = $props();
</script>

<BitsPopover.Root bind:open {onOpenChange}>
	<BitsPopover.Trigger
		{disabled}
		{openOnHover}
		{openDelay}
		{closeDelay}
		aria-label={triggerAriaLabel}
		onkeydown={onTriggerKeydown}
		class={cn(inline ? "reference-trigger" : loomTrigger, triggerClass)}
	>
		{#if triggerContent}{@render triggerContent()}{:else}{triggerLabel}{/if}
	</BitsPopover.Trigger><BitsPopover.Portal>
		<BitsPopover.Content
			data-slot="popover-content"
			aria-label={accessibleLabel}
			role={accessibleLabel ? "dialog" : undefined}
			sideOffset={8}
			collisionPadding={inline ? 16 : 0}
			class={cn(loomPanel, loomFocus, "z-50 max-w-[20rem] p-4 text-sm leading-6", className)}
		>
			{@render children?.()}
		</BitsPopover.Content>
	</BitsPopover.Portal>
</BitsPopover.Root>

<style>
	:global(.reference-trigger) {
		display: inline;
		padding: 0;
		border: 0;
		background: none;
		color: inherit;
		font: inherit;
		text-align: inherit;
		cursor: pointer;
		text-decoration: underline;
		text-decoration-thickness: 0.08em;
		text-underline-offset: 0.15em;
	}
	:global(.reference-trigger:hover) { text-decoration-thickness: 0.14em; }
	:global(.reference-trigger:focus-visible) { outline: 2px solid currentColor; outline-offset: 2px; }
</style>
