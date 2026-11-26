<script lang="ts">
	import { FieldList } from "./catalogue";
	import type { DocsRowField } from "./catalogue/types";
	import type { InspectList } from "./inspect-types";

	const linkClass = "text-left text-sm text-primary underline-offset-4 hover:underline";

	let {
		label = "Place",
		title,
		description = "",
		fields = [],
		lists = [],
		authorFields = [],
		onDetails,
	}: {
		label?: string;
		title: string;
		description?: string;
		fields?: DocsRowField[];
		lists?: InspectList[];
		authorFields?: DocsRowField[];
		/** When set, a Details toggle renders (Maps' drawer); the compact
		 * card stays as is otherwise. */
		onDetails?: () => void;
	} = $props();
</script>

<section class="flex flex-col gap-4" data-testid="place-inspect" aria-label={title}>
	<div class="flex items-start justify-between gap-2">
		<div>
			<p class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
			<h1 class="mt-1 font-[family-name:var(--font-display)] text-3xl leading-tight font-medium">
				{title}
			</h1>
		</div>
		{#if onDetails !== undefined}
			<button
				type="button"
				class="shrink-0 text-sm text-primary underline-offset-4 hover:underline"
				data-testid="inspect-details-toggle"
				aria-expanded="false"
				onclick={onDetails}
			>
				Details
			</button>
		{/if}
	</div>
	{#if description.trim()}
		<p class="text-base leading-7" data-testid="place-inspect-description">{description}</p>
	{/if}
	<FieldList {fields} />
	{#each lists as list (list.heading)}
		<section class="flex flex-col gap-1" data-testid={list.testId}>
			<h3 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{list.heading}</h3>
			{#if list.items.length === 0}
				<p class="text-sm text-muted-foreground">{list.empty ?? "None."}</p>
			{:else}
				{#each list.items as item (item.id)}
					{#if list.onSelect}
						<button type="button" class={linkClass} onclick={() => list.onSelect?.(item.id)}>
							{item.name}
						</button>
					{:else}
						<p class="text-sm">{item.name}</p>
					{/if}
				{/each}
			{/if}
		</section>
	{/each}
	{#if authorFields.length > 0}
		<section class="flex flex-col gap-1" data-testid="place-author">
			<h3 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Author</h3>
			<FieldList fields={authorFields} />
		</section>
	{/if}
</section>
