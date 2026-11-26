<script lang="ts">
	export type Hit = { id: string; title: string; meta: string };

	let {
		hits,
		onSelect,
		onHitKeydown,
	}: {
		hits: Hit[];
		onSelect?: (id: string, index: number) => void;
		onHitKeydown?: (event: KeyboardEvent) => void;
	} = $props();
</script>

{#if hits.length > 0}
	<ul class="flex flex-col gap-1" data-testid="search-results" aria-label="Search results">
		{#each hits as hit, i (hit.id + hit.title)}
			<li>
				<button
					type="button"
					id={`search-hit-${i}`}
					class="flex min-h-11 w-full flex-col items-start gap-0.5 px-3 py-2 text-left"
					onkeydown={onHitKeydown}
					onclick={() => onSelect?.(hit.id, i)}
				>
					<span class="text-sm text-primary underline-offset-4 hover:underline">{hit.title}</span>
					<span class="text-xs text-muted-foreground">{hit.meta}</span>
				</button>
			</li>
		{/each}
	</ul>
{/if}
