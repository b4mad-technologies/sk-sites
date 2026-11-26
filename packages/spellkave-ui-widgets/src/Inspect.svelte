<script lang="ts">
	import { ReferenceCard, type ReferenceFact } from "@spellkave/ui";
	import type { Snippet } from "svelte";
	import ItemRow from "./ItemRow.svelte";
	import type { InspectItem, InspectList, InspectPeer } from "./inspect-types";

	const linkClass = "text-left text-sm text-primary underline-offset-4 hover:underline";

	let {
		label = "Person",
		title,
		description = "",
		renderProse,
		facts = [],
		carried = [],
		here = [],
		lists = [],
		onSelectHere,
		onSelectCarried,
		onDetails,
	}: {
		label?: string;
		title: string;
		description?: string;
		renderProse?: Snippet<[string]>;
		facts?: ReferenceFact[];
		carried?: InspectItem[];
		here?: InspectPeer[];
		lists?: InspectList[];
		onSelectHere?: (id: string) => void;
		/** Click handler for carried rows; link rows honor it via
	 * preventDefault so middle-click/new-tab still work. */
		onSelectCarried?: (id: string) => void;
		/** When set, a Details toggle renders and the card title opens the
	 * next-larger rendering of the same subject (Maps' drawer). */
		onDetails?: () => void;
	} = $props();

	const resolvedLists = $derived.by((): InspectList[] => {
		if (lists.length > 0) return lists;
		const out: InspectList[] = [];
		if (here.length > 0) {
			out.push({
				heading: "Also here",
				testId: "inspect-here",
				items: here,
				onSelect: onSelectHere,
			});
		}
		return out;
	});
</script>

<section class="flex flex-col gap-3" data-testid="inspect" aria-label={title}>
	{#if onDetails !== undefined}
		<div class="flex items-center justify-between gap-2">
			<span class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</span>
			<button
				type="button"
				class="text-sm text-primary underline-offset-4 hover:underline"
				data-testid="inspect-details-toggle"
				aria-expanded="false"
				onclick={onDetails}
			>
				Details
			</button>
		</div>
	{/if}
	<ReferenceCard
		{label}
		{title}
		{facts}
		href={onDetails !== undefined ? "#" : undefined}
		onNavigate={onDetails !== undefined ? (event: MouseEvent) => onDetails?.() : undefined}
	>
		{#if description}
			<p class="text-sm leading-snug">{#if renderProse}{@render renderProse(description)}{:else}{description}{/if}</p>
		{/if}
	</ReferenceCard>
	{#if lists.length === 0 && carried.length > 0}
		<section class="flex flex-col gap-1" data-testid="inspect-carried">
			<h3 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Carrying</h3>
			{#each carried as item (item.id)}
				<ItemRow
					id={item.id}
					name={item.name}
					quantity={item.quantity}
					equipped={item.equipped}
					href={item.href}
					onSelect={onSelectCarried}
					testId={item.href !== undefined ? "inspect-carried-item" : undefined}
				/>
			{/each}
		</section>
	{/if}
	{#each resolvedLists as list (list.heading)}
		{#if list.items.length > 0}
			<section class="flex flex-col gap-1" data-testid={list.testId}>
				<h3 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{list.heading}</h3>
				{#each list.items as item (item.id)}
					{#if list.onSelect}
						<button type="button" class={linkClass} onclick={() => list.onSelect?.(item.id)}>
							{item.name}
						</button>
					{:else}
						<p class="text-sm">{item.name}</p>
					{/if}
				{/each}
			</section>
		{/if}
	{/each}
</section>
