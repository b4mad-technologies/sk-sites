<script lang="ts">
	import ActivityFeed from "./ActivityFeed.svelte";

	// Test-only harness: `ActivityFeed`'s `renderItem` is a snippet, which a
	// .test.ts file cannot construct directly — this wrapper supplies a
	// trivial one and lets a test drive `items` at scale (sk-jay0.1.8.60:
	// Play's continuous Explore journal can hold up to `EXPLORE_ACTIVITY_LIMIT`,
	// 1000, rows) and mark section-header rows by id (sk-jay0.1.8.63.5).
	let {
		items,
		sectionIds = new Set<string>(),
	}: { items: { id: string; text: string }[]; sectionIds?: Set<string> } = $props();
</script>

{#snippet row(item: { id: string; text: string })}
	<span>{item.text}</span>
{/snippet}

<ActivityFeed
	{items}
	ariaLabel="Rows"
	emptyText="Nothing here."
	renderItem={row}
	isSectionHeader={(item) => sectionIds.has(item.id)}
/>
