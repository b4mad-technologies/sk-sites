<script lang="ts">
	import { onDestroy } from "svelte";
	import { cn } from "../lib/utils";
	import { useInfoCardOwnerIndex, useInfoCardStack } from "./info-card-stack.svelte";
	import type { InfoLinkProps } from "./types";

	let { refId, class: className, onclick, children }: InfoLinkProps = $props();

	const stack = useInfoCardStack();
	const ownerIndex = useInfoCardOwnerIndex();

	let linkEl = $state<HTMLButtonElement | null>(null);
	let myEntryId = $state<number | null>(null);
	let openTimer: ReturnType<typeof setTimeout> | undefined;

	const isOpen = $derived(myEntryId !== null && !!stack && stack.indexOf(myEntryId) !== -1);

	function handleMouseEnter() {
		if (!stack || !linkEl) return;
		if (isOpen && myEntryId !== null) {
			stack.hoverEnter(myEntryId);
			return;
		}
		clearTimeout(openTimer);
		openTimer = setTimeout(() => {
			if (linkEl) myEntryId = stack.open(refId, ownerIndex, linkEl, false, false);
		}, stack.openDelay);
	}

	function handleMouseLeave() {
		clearTimeout(openTimer);
		if (!stack || myEntryId === null) return;
		stack.hoverLeave(myEntryId);
	}

	function pinNow(focus: boolean) {
		if (!stack || !linkEl) return;
		clearTimeout(openTimer);
		if (isOpen && myEntryId !== null) {
			stack.pin(myEntryId);
			if (focus) stack.focusCard(myEntryId);
			return;
		}
		myEntryId = stack.open(refId, ownerIndex, linkEl, true, focus);
	}

	function handleClick(event: MouseEvent) {
		onclick?.(event);
		pinNow(false);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key !== "Enter" && event.key !== " ") return;
		event.preventDefault();
		pinNow(true);
	}

	// A stream re-render can unmount this link mid-delay (hovered, not yet
	// opened); the card it already opened stays open (see `InfoCardProvider`
	// close/Esc handling), but the pending open must not fire against a
	// `linkEl` that no longer exists.
	onDestroy(() => clearTimeout(openTimer));
</script>

<button
	type="button"
	bind:this={linkEl}
	class={cn("info-link", className)}
	aria-haspopup="dialog"
	aria-expanded={isOpen}
	onmouseenter={handleMouseEnter}
	onmouseleave={handleMouseLeave}
	onclick={handleClick}
	onkeydown={handleKeydown}
>
	{@render children?.()}
</button>

<style>
	:global(.info-link) {
		display: inline;
		padding: 0;
		border: 0;
		background: none;
		color: inherit;
		font: inherit;
		text-align: inherit;
		cursor: pointer;
		text-decoration: underline;
		text-decoration-style: dotted;
		text-decoration-thickness: 0.08em;
		text-underline-offset: 0.15em;
	}
	:global(.info-link:hover),
	:global(.info-link[aria-expanded="true"]) {
		text-decoration-style: solid;
		color: var(--primary);
	}
	:global(.info-link:focus-visible) {
		outline: 2px solid currentColor;
		outline-offset: 2px;
	}
</style>
