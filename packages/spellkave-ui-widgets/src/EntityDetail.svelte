<script lang="ts">
	import { Button } from "@spellkave/ui";
	import Description from "./Description.svelte";
	import Inspect from "./Inspect.svelte";
	import type { EntityDetailProps, OfferedAction } from "./types";

	let {
		name,
		selectedId,
		detail = null,
		lead,
		renderProse,
		reference,
		kindLabel = "Person",
		artwork,
		onAct,
		busy = false,
		otherActions,
		actionsTitle = "Available actions",
		loadingText = "Loading actions…",
		failedText = "Could not load actions.",
		emptyText = "No actions are offered here.",
		showMissingDescription = false,
		showHeading = true,
		referencePresentation = false,
		showActions = true,
		ariaLabel = "Selected entity details",
		isSecondaryVerb,
		secondaryVerbsLabel = "More",
	}: EntityDetailProps = $props();

	const activeDetail = $derived(detail !== null && detail.id === selectedId ? detail : null);
	// sk-jay0.1.8.63.9: partition once per detail/classifier change, never by
	// label — `isSecondaryVerb` is the host's own semantic call.
	const primaryVerbs = $derived(
		activeDetail?.verbs.filter((verb) => !isSecondaryVerb?.(verb)) ?? [],
	);
	const secondaryVerbs = $derived(activeDetail?.verbs.filter((verb) => isSecondaryVerb?.(verb)) ?? []);
	let detailPane: HTMLElement | undefined = $state();
	$effect(() => {
		selectedId;
		if (detailPane) detailPane.scrollTop = 0;
	});
</script>

<!-- The scroll region needs keyboard focus even when no item actions exist. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<section class="entity-detail" aria-label={ariaLabel} tabindex="0" bind:this={detailPane}>
	{#if referencePresentation}
		{@render artwork?.(selectedId)}
		<Inspect
			{renderProse}
			label={kindLabel}
			title={name}
			description={activeDetail?.description ?? lead ?? ""}
			facts={activeDetail?.facts ?? []}
		/>
	{:else}
		{#if showHeading}
			<p class="sk-label sk-play-muted m-0">Details — {name}</p>
		{/if}
		{@render artwork?.(selectedId)}
		<p class="sk-display m-0 text-lg">{name}</p>
		{#if lead}
			<p class="sk-play-prose sk-play-muted !mt-2 text-base">{#if renderProse}{@render renderProse(lead)}{:else}{lead}{/if}</p>
		{/if}
		{#key selectedId}
			{#if renderProse && activeDetail?.description}<p class="sk-play-prose sk-play-muted mt-2" data-slot="play-item-value">{@render renderProse(activeDetail.description)}</p>{:else}<Description text={activeDetail?.description} open valueSlot="play-item-value" />{/if}
		{/key}
		{#if showMissingDescription && activeDetail && !activeDetail.failed && !activeDetail.description?.trim()}
			<p class="sk-play-muted mt-2 text-sm">No description available.</p>
		{/if}
		{#if activeDetail?.slot}
			<div class="mt-2 flex flex-wrap gap-1.5">
				<span
					data-slot="play-item-value"
					class="sk-label sk-play-muted rounded-[var(--radius)] border border-[color:var(--border)] px-1.5 py-0.5"
				>
					{activeDetail.slot}
				</span>
			</div>
		{/if}
		{#if activeDetail && activeDetail.facts.length > 0}
			<dl class="mt-2 flex flex-col gap-1">
				{#each activeDetail.facts as fact (fact.id)}
					<div class="flex items-baseline gap-2">
						<dt class="sk-label sk-play-muted">{fact.label}</dt>
						<dd class="sk-num m-0 text-sm" data-slot="play-item-value">{fact.value}</dd>
					</div>
				{/each}
			</dl>
		{/if}
	{/if}
	{#if !showActions && (activeDetail === null || activeDetail.failed)}
		<p class="sk-play-muted mt-2 text-sm" role={activeDetail?.failed ? "alert" : "status"}>{activeDetail?.failed ? "Could not load entity details." : "Loading entity details…"}</p>
	{/if}
	{@render reference?.(selectedId)}
	{#if showActions}
		<div class="mt-3">
			<span class="sk-label sk-play-muted">{actionsTitle}</span>
		</div>
	{/if}
	{#if showActions}
		{#if activeDetail?.failed}
			<p class="sk-play-muted mt-1 text-sm" role="alert">{failedText}</p>
		{:else if activeDetail === null}
			<p class="sk-play-muted mt-1 text-sm" role="status">{loadingText}</p>
		{:else if activeDetail.verbs.length === 0}
			<p class="sk-play-muted mt-1 text-sm">{emptyText}</p>
		{:else}
			{#if primaryVerbs.length > 0}
				<div class="mt-1 flex flex-wrap gap-2">
					{#each primaryVerbs as verb (verb.id)}
						{@render verbButton(verb)}
					{/each}
				</div>
			{/if}
			{#if secondaryVerbs.length > 0}
				<!-- Closed by default (sk-jay0.1.8.63.9): a scene offering ~20 ability/
				     skill checks alongside a handful of meaningful verbs otherwise
				     buries the latter in a flat wall of buttons. Native `details`
				     (same idiom `Description.svelte` already uses) keeps this keyboard
				     operable with no extra script. -->
				<details class={primaryVerbs.length > 0 ? "mt-2" : "mt-1"} data-slot="play-secondary-actions">
					<summary class="sk-label sk-play-muted cursor-pointer break-words rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2">
						{secondaryVerbsLabel} ({secondaryVerbs.length})
					</summary>
					<div class="mt-2 flex flex-wrap gap-2">
						{#each secondaryVerbs as verb (verb.id)}
							{@render verbButton(verb)}
						{/each}
					</div>
				</details>
			{/if}
		{/if}
	{/if}
	{#if otherActions}
		<div class="mt-3">
			<Button
				type="button"
				variant="woven-secondary"
				size="sm"
				class="max-w-full whitespace-normal text-left"
				onclick={otherActions.onOpen}
			>
				{otherActions.label}
			</Button>
		</div>
	{/if}
</section>

{#snippet verbButton(verb: OfferedAction)}
	<div class="min-w-0 max-w-full">
		<Button
			variant="woven-secondary"
			size="sm"
			type="button"
			class="gap-2"
			disabled={busy}
			onclick={onAct === undefined ? undefined : () => onAct(verb.id)}
		>
			{verb.label}
		</Button>
		<Description text={verb.description} label={`About ${verb.label}`} valueSlot="play-action-description" />
	</div>
{/snippet}

<style>
	.entity-detail {
		min-height: 0;
		overflow: auto;
		overscroll-behavior: contain;
		scrollbar-gutter: stable;
	}

	.entity-detail:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: -2px;
	}
</style>
