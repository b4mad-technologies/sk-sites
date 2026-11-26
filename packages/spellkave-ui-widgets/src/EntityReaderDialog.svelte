<script lang="ts">
	/**
	 * A name-as-button reader (sk-jay0.1.8.63.7): the visible trigger is the
	 * bare entity name, styled as an inline reading-aid link (the same
	 * dotted-underline convention `FieldDetail` already uses for "this opens a
	 * reader", kept distinct from `ReferenceText`'s solid-underline public
	 * reference links so the two never look interchangeable when they sit in
	 * the same sentence). Its accessible name adds ", details" so a screen
	 * reader hears more than the bare name. Opening it never invokes a world
	 * action; verbs offered inside fire through the host's own `onAct`.
	 */
	import { Dialog } from "@spellkave/ui";
	import EntityDetail from "./EntityDetail.svelte";
	import type { EntityReaderDialogProps } from "./types";

	let {
		open = $bindable(false),
		name,
		selectedId,
		kindLabel = "Person",
		detail = null,
		artwork,
		onAct,
		busy = false,
		onOpenChange,
		reference,
		class: className = "",
		isSecondaryVerb,
		secondaryVerbsLabel,
	}: EntityReaderDialogProps = $props();
</script>

<Dialog
	bind:open
	title={name}
	triggerLabel={name}
	triggerAriaLabel={`${name}, details`}
	{onOpenChange}
	class={`min-h-0 inline justify-start border-0 bg-transparent px-0 py-0 text-left normal-case tracking-normal underline decoration-dotted underline-offset-4 ${className}`}
>
	{#snippet content()}
		<EntityDetail
			{name}
			{selectedId}
			{kindLabel}
			{detail}
			{artwork}
			{onAct}
			{busy}
			showHeading={false}
			showMissingDescription
			ariaLabel={`${name} details`}
			{isSecondaryVerb}
			{secondaryVerbsLabel}
		/>
		{#if reference}
			<div class="entity-reader-reference">{@render reference()}</div>
		{/if}
	{/snippet}
</Dialog>

<style>
	.entity-reader-reference {
		margin-top: 1rem;
		border-top: 1px solid var(--border);
		padding-top: 1rem;
	}
</style>
