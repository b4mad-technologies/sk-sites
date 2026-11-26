<script lang="ts">
	import RenderedMarkdown from "./RenderedMarkdown.svelte";

	let {
		description,
		field,
		heading = "Description",
		context = "Manifest field",
	}: {
		description: string;
		field: string;
		heading?: string;
		context?: string;
	} = $props();
</script>

<section class="max-w-[65ch] border-l-2 border-primary pl-4" aria-label={heading}>
	{#if description.trim()}
		<RenderedMarkdown value={description} testId="description-rendered" />
	{:else}
		<p class="text-sm text-[color:var(--destructive)]" data-testid="description-rendered">
			No description is authored in this manifest field.
		</p>
	{/if}
	<p class="mt-1 text-xs text-[color:var(--muted-foreground)]">
		{context} · <code>{field}</code>
	</p>
</section>
