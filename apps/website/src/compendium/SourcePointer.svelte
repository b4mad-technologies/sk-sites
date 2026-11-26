<script lang="ts">
	import type { CompendiumSource } from "./types";

	let { source }: { source: CompendiumSource } = $props();
</script>

<p class="source" data-testid="source-pointer">
	{source.label}
	{#if source.cache_path}
		· <code>{source.cache_path}{source.primary_key ? ` pk='${source.primary_key}'` : ""}</code>
	{/if}
	{#if source.fixture_path}
		· <code>{source.fixture_path}</code>
	{/if}
</p>

<style>
	.source {
		margin: 0;
		color: var(--muted-foreground);
		font-size: 0.85rem;
	}

	code {
		font-size: 0.8em;
		overflow-wrap: anywhere;
	}
</style>
