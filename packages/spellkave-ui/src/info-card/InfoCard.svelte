<script lang="ts">
	import { untrack } from "svelte";
	import { loomFocus, loomFrame } from "../lib/loom";
	import { cn } from "../lib/utils";
	import InfoLink from "./InfoLink.svelte";
	import { type InfoCardEntry, type InfoCardStack, setInfoCardOwnerIndex } from "./info-card-stack.svelte";
	import { floatingPosition, referenceFor } from "./lib/positioning";

	let { entry, index, stack }: { entry: InfoCardEntry; index: number; stack: InfoCardStack } =
		$props();

	// Any `InfoLink` rendered anywhere in this card's markup — including
	// nested inside its own rich-text body — opens its target BESIDE this
	// card, not beside itself; see `lib/positioning.ts`'s `referenceFor`.
	// `index` is stable for this entry's whole lifetime (the stack only ever
	// truncates a contiguous tail, never removes an earlier entry while
	// keeping a later one) — `untrack` records that this is a deliberate
	// one-time read, not a missed `$derived`.
	untrack(() => setInfoCardOwnerIndex(index));

	const titleId = $props.id();

	function close() {
		const anchor = entry.anchorEl;
		stack.closeFrom(index);
		// The opening link can be long gone by the time a pinned card closes
		// (a stream list re-rendered out from under it). Focusing a detached
		// element is a silent no-op everywhere, but check explicitly so the
		// intent — "fall back gracefully, don't chase a vanished anchor" —
		// reads at the call site rather than relying on that platform quirk.
		if (anchor.isConnected) anchor.focus();
	}

	function registerCardEl(node: HTMLElement) {
		stack.setCardEl(entry.id, node);
		return () => stack.setCardEl(entry.id, null);
	}

	function focusOnMount(node: HTMLElement) {
		if (entry.focusOnMount) node.focus();
	}
</script>

<div
	role="dialog"
	aria-labelledby={titleId}
	tabindex="-1"
	data-slot="info-card"
	class={cn(
		loomFrame,
		loomFocus,
		"fixed z-50 flex w-[20rem] max-w-[calc(100vw-1rem)] flex-col overflow-hidden bg-[color:var(--card)] text-[color:var(--foreground)] shadow-lg",
	)}
	onmouseenter={() => stack.cardHoverEnter(entry.id)}
	onmouseleave={() => stack.cardHoverLeave(entry.id)}
	{@attach registerCardEl}
	{@attach focusOnMount}
	{@attach floatingPosition(
		() => referenceFor(entry.anchorEl, stack.ownerCardEl(entry.ownerIndex)),
		entry.ownerIndex === null
			? { placement: "bottom-start", fallbackPlacements: ["top-start"] }
			: {
					placement: "right-start",
					fallbackPlacements: ["left-start"],
					ownerCardEl: stack.ownerCardEl(entry.ownerIndex),
				},
	)}
>
	<div
		class="h-[2px] w-0 bg-[color:var(--primary)]"
		class:info-card-dwell={entry.dwelling}
		style:--sk-pin-dwell-ms={`${stack.pinDwell}ms`}
	></div>

	<div class="min-h-0 flex-1 overflow-y-auto p-4" style="max-height: 60vh;">
		<div class="flex items-start justify-between gap-3" data-slot="info-card-title-row">
			<div class="min-w-0">
				{#if entry.data?.kind}
					<p class="sk-label text-[color:var(--muted-foreground)]">{entry.data.kind}</p>
				{/if}
				<h2
					id={titleId}
					class="mt-0.5 font-[family-name:var(--font-display)] text-lg leading-tight font-medium"
				>
					{entry.data?.title ?? entry.refId}
				</h2>
			</div>
			{#if entry.data?.image}
				<img
					loading="lazy"
					class="h-16 w-16 shrink-0 rounded-[var(--radius)] border border-[color:var(--border)] object-cover"
					src={entry.data.image.src}
					alt={entry.data.image.alt}
				/>
			{/if}
		</div>

		<div class="mt-3 text-sm leading-6">
			{#if entry.status === "loading"}
				<p class="text-[color:var(--muted-foreground)]" role="status">Loading…</p>
			{:else if entry.status === "not-found"}
				<p class="text-[color:var(--muted-foreground)]">Not found.</p>
			{:else if entry.status === "error"}
				<p class="text-[color:var(--destructive)]" role="alert">
					Couldn't load this reference.
				</p>
			{:else if entry.data}
				{#if entry.data.summary}
					<p>{entry.data.summary}</p>
				{/if}
				{#if entry.data.facts && entry.data.facts.length > 0}
					<dl class="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
						{#each entry.data.facts as fact, factIndex (`${factIndex}:${fact.label}`)}
							<dt class="font-semibold text-[color:var(--muted-foreground)]">{fact.label}</dt>
							<dd>{fact.value}</dd>
						{/each}
					</dl>
				{/if}
				{#if entry.data.body && entry.data.body.length > 0}
					<p class="mt-2">
						{#each entry.data.body as segment, segmentIndex (segmentIndex)}
							{#if typeof segment === "string"}{segment}{:else}<InfoLink
									refId={segment.refId}>{segment.text}</InfoLink
								>{/if}
						{/each}
					</p>
				{/if}
				{#if entry.data.footerHref}
					<p class="mt-3">
						<a
							href={entry.data.footerHref}
							target="spellkave-reference"
							class="text-[color:var(--primary)] underline-offset-4 hover:underline"
							>Full reference ↗</a
						>
					</p>
				{/if}
			{/if}
		</div>
	</div>

	{#if entry.pinned}
		<button
			type="button"
			aria-label="Close"
			class={cn(loomFocus, "absolute top-1.5 right-1.5 rounded-full p-1 leading-none text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]")}
			onclick={close}
		>
			×
		</button>
	{/if}
</div>

<style>
	.info-card-dwell {
		width: 100%;
		transition: width var(--sk-pin-dwell-ms, 600ms) linear;
	}
</style>
