<script lang="ts">
	import { Dialog } from "@spellkave/ui";
	import type { Snippet } from "svelte";

	/** Display-only field reader. The host supplies values and read state;
	 * opening the dialog never invokes a world action or fetches hidden data. */
	let { label, value, description, metadata = [], readState = "ready", children, valueSlot, metadataSlot, triggerClass = "" }: {
		label: string;
		value?: string;
		description?: string;
		metadata?: { label: string; value: string }[];
		readState?: "ready" | "loading" | "failed";
		children?: Snippet;
		triggerClass?: string;
		/** Structural field observation, including while the portal is closed. */
		valueSlot?: string;
		/** Optional structural observation of metadata inside the dialog portal. */
		metadataSlot?: string;
	} = $props();
	let open = $state(false);
</script>

<span
	class="contents"
	data-field-description={description?.trim() ? valueSlot : undefined}
	data-field-disclosed={open && readState === "ready" ? "true" : "false"}
>
	{#if metadataSlot}
		{#each metadata as field}
			<span class="contents" data-field-metadata={metadataSlot} data-field-disclosed={open ? "true" : "false"}></span>
		{/each}
	{/if}
	<Dialog bind:open title={label} triggerLabel={label}
		class={`min-h-11 justify-start border-0 bg-transparent px-0 text-left normal-case tracking-normal underline decoration-dotted underline-offset-4 ${triggerClass}`}
	>
		{#snippet trigger()}
			{#if children}{@render children()}{:else}{label}{/if}
		{/snippet}
		{#snippet content()}
			{#if value !== undefined}<p class="sk-num m-0 whitespace-pre-wrap break-words text-lg">{value}</p>{/if}
			{#if readState === "loading"}
				<p role="status">Loading description…</p>
			{:else if readState === "failed"}
				<p role="alert">Description could not be loaded.</p>
			{:else}
				<p class="sk-play-prose whitespace-pre-wrap break-words">{description?.trim() ? description : "No description available."}</p>
			{/if}
			{#if metadata.length}
				<dl class="mt-4 space-y-2">
					{#each metadata as field}
						<div><dt class="sk-label sk-play-muted">{field.label}</dt><dd class="m-0 whitespace-pre-wrap break-words">{field.value}</dd></div>
					{/each}
				</dl>
			{/if}
		{/snippet}
	</Dialog>
</span>
