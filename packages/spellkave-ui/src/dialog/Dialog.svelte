<script lang="ts">
	import { Dialog as BitsDialog } from "bits-ui";
	import { loomFocus, loomPanel, loomTrigger } from "../lib/loom";
	import { cn } from "../lib/utils";
	import type { DialogProps } from "./types";

	let {
		open = $bindable(false),
		title,
		description,
		triggerLabel = "Open",
		triggerAriaLabel,
		trigger,
		content,
		closeLabel = "Close",
		onOpenChange,
		disabled = false,
		preventScroll,
		class: className,
		children,
	}: DialogProps = $props();
	let contentElement = $state<HTMLElement | null>(null);
	// bits-ui's Dialog.Content locks body scroll while open and releases the
	// lock on a 24ms timer at destroy — under Vitest that timer outlives jsdom
	// teardown and throws the unhandled `document is not defined` CI flake
	// (sk-jay0.7.144). The lock only means something with a real layout
	// engine, so default it off under jsdom; an explicit prop always wins.
	const lockScroll = $derived(preventScroll ?? !navigator.userAgent.includes("jsdom"));
</script>

<BitsDialog.Root bind:open {onOpenChange}>
	<!-- No whitespace inside or right after the trigger: for an inline trigger
	     (a name in a sentence) either one renders as a text node, which shows
	     as a gap before the next character. A controlled dialog may have no
	     local trigger at all. -->
	{#if trigger || triggerLabel !== null}<BitsDialog.Trigger {disabled} aria-label={triggerAriaLabel} class={cn(loomTrigger, className)}
		>{#if trigger}{@render trigger()}{:else}{triggerLabel}{/if}</BitsDialog.Trigger
	>{/if}<BitsDialog.Portal>
		<BitsDialog.Overlay
			data-slot="dialog-overlay"
			class="fixed inset-0 z-50 bg-[color:color-mix(in_srgb,var(--background)_78%,transparent)]"
		/>
		<BitsDialog.Content
			preventScroll={lockScroll}
			bind:ref={contentElement}
			onOpenAutoFocus={(event) => {
				if (content) {
					event.preventDefault();
					contentElement?.focus();
				}
			}}
			data-slot="dialog-content"
			class={cn(loomPanel, loomFocus, "fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto break-words p-6")}
		>
			<BitsDialog.Title class="[font-family:var(--font-display)] text-2xl tracking-[-0.03em]">
				{title}
			</BitsDialog.Title>
			{#if description}
				<BitsDialog.Description class="mt-2 max-w-[65ch] text-sm leading-6 text-[color:var(--muted-foreground)]">
					{description}
				</BitsDialog.Description>
			{/if}
			{#if content}
				<div class="mt-4 min-w-0">{@render content()}</div>
			{/if}
			<div data-slot="dialog-actions" class="mt-6 flex flex-wrap items-center gap-2">
				{#if children}
					{@render children()}
				{/if}
				<BitsDialog.Close class={cn(loomTrigger)}>
					{closeLabel}
				</BitsDialog.Close>
			</div>
		</BitsDialog.Content>
	</BitsDialog.Portal>
</BitsDialog.Root>
