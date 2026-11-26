<script lang="ts">
	/**
	 * The entry's description block. `field` names the manifest column the
	 * text came from and renders as a "<context> · <field>" caption.
	 *
	 * `field` is OPTIONAL: a live subject (the Maps drawer's person/thing)
	 * has a description that came from world state, not from a manifest
	 * column a reader could look up — captioning it with a borrowed column
	 * name would be a lie. With `field` omitted the caption is skipped and
	 * only the description renders.
	 */
	let {
		description,
		field,
		heading = "Description",
		context = "Manifest field",
	}: {
		description: string;
		field?: string;
		heading?: string;
		context?: string;
	} = $props();
</script>

<section class="max-w-[65ch] border-l-2 border-primary pl-4" aria-label={heading}>
	{#if description.trim()}
		<div class="text-sm leading-7" data-testid="description-rendered">{description}</div>
	{:else}
		<p class="text-sm text-[color:var(--destructive)]" data-testid="description-rendered">
			No description is authored in this manifest field.
		</p>
	{/if}
	{#if field !== undefined}
		<p class="mt-1 text-xs text-[color:var(--muted-foreground)]">
			{context} · <code>{field}</code>
		</p>
	{/if}
</section>
