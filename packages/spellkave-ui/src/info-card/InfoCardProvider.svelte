<script lang="ts">
	import { Portal } from "bits-ui";
	import { untrack } from "svelte";
	import InfoCard from "./InfoCard.svelte";
	import { InfoCardStack, setInfoCardStack } from "./info-card-stack.svelte";
	import { clampCardIntoViewport } from "./lib/positioning";
	import type { InfoCardProviderProps } from "./types";

	let {
		resolve,
		openDelay,
		closeDelay,
		pinDwell,
		open = $bindable(false),
		onOpenChange,
		children,
	}: InfoCardProviderProps = $props();

	// Construct with a placeholder — every field below is overwritten by the
	// effect before any interaction can reach it — so props are read live
	// (openDelay/pinDwell are meant to be tuned from a demo control panel
	// while the stack is already in use) rather than snapshotted once here.
	const stack = new InfoCardStack({ resolve: () => null });
	setInfoCardStack(stack);

	$effect(() => {
		stack.resolve = resolve;
		stack.openDelay = openDelay ?? 300;
		stack.closeDelay = closeDelay ?? 150;
		stack.pinDwell = pinDwell ?? 600;
	});

	// `open` has two independent writers — the stack itself (opening/closing
	// cards) and the host (a controlled `open={false}`/`bind:open`, or a
	// host-side effect that closes the info card when something else, like
	// the demo's ActionMenu, opens instead). Two effects that both read AND
	// write `open` in opposite directions is a feedback loop: whichever runs
	// first in a given flush wins and clobbers the other's write before it
	// can act — this used to close a just-opened card (or, depending on
	// scheduling, silently ignore a host-driven close), and which of the two
	// happened varied with the engine's effect-flush order (unit tests never
	// caught it, since they never drove `open` from outside). `lastKnownOpen`
	// is a plain (non-reactive) bookkeeping variable, not `$state`: reading
	// it below does not create a dependency, so it cannot itself trigger
	// either effect — it exists only so effect B can tell "the stack itself
	// already accounts for this" apart from "the host wants this closed".
	let lastKnownOpen = open;

	// Effect A: reacts ONLY to the stack's own entries — never to `open` —
	// and pushes the result out. The read of `open` for the comparison is
	// wrapped in `untrack`: a plain (tracked) read would make this effect
	// ALSO depend on `open`, which is exactly the loop this is meant to
	// avoid — a host-driven change to `open` alone must never re-trigger it.
	$effect(() => {
		const isOpen = stack.entries.length > 0;
		lastKnownOpen = isOpen;
		if (untrack(() => open) !== isOpen) {
			open = isOpen;
			onOpenChange?.(isOpen);
		}
	});

	// Effect B: reacts ONLY to `open` — never to `stack.entries` — so it can
	// never fire as a side effect of effect A's own write landing back here
	// (e.g. via `bind:open`) in the SAME flush. It closes the stack only
	// when `open` is false while our own bookkeeping still thinks it's
	// open — i.e. the host, not the stack, decided this.
	$effect(() => {
		if (!open && lastKnownOpen) stack.closeAll();
	});

	function elementForEvent(event: Event): Node | null {
		return event.target instanceof Node ? event.target : null;
	}

	function isInsideAnyCard(target: Node | null): boolean {
		if (!target) return false;
		return stack.entries.some((entry) => entry.cardEl?.contains(target));
	}

	// NON-MODAL by design: no scrim, no focus trap. Esc steps back one card;
	// a click outside every open card closes the whole path.
	function onKeydown(event: KeyboardEvent) {
		if (event.key !== "Escape" || stack.entries.length === 0) return;
		event.stopPropagation();
		// The anchor can be gone (a stream list re-rendered out from under a
		// pinned card): fall back to no focus move rather than throw or
		// focus something unrelated.
		const anchor = stack.closeDeepest();
		if (anchor?.isConnected) anchor.focus();
	}

	// `mousedown` rather than `pointerdown`: desktop-only for now (per the
	// brief), and jsdom (unit tests) has no `PointerEvent` at all.
	function onMouseDown(event: MouseEvent) {
		if (stack.entries.length === 0) return;
		if (isInsideAnyCard(elementForEvent(event))) return;
		stack.closeAll();
	}

	// A card's OWN internal scroll (its 60vh body) must not close anything —
	// only scrolling something that could move an anchor does, and even then
	// a PINNED card is a detached reader: it stays put at its current
	// on-screen position rather than closing or chasing the anchor. Only the
	// trailing run of unpinned previews closes, since a preview's whole
	// premise is "still over the link that opened it".
	function onScrollCapture(event: Event) {
		if (stack.entries.length === 0) return;
		if (isInsideAnyCard(elementForEvent(event))) return;
		stack.closeUnpinnedTail();
	}

	// A resize never closes anything; it re-clamps every open card (pinned
	// or not) back into the shrunk-or-grown viewport instead, without
	// recomputing against the anchor — see `clampCardIntoViewport`.
	function onResize() {
		for (const entry of stack.entries) {
			if (entry.cardEl) clampCardIntoViewport(entry.cardEl);
		}
	}
</script>

<svelte:window
	onkeydown={onKeydown}
	onmousedown={onMouseDown}
	onscrollcapture={onScrollCapture}
	onresize={onResize}
/>

{@render children?.()}

<Portal>
	{#each stack.entries as entry, index (entry.id)}
		<InfoCard {entry} {index} {stack} />
	{/each}
</Portal>
