<script lang="ts">
	import type { CompendiumStat } from "./types";

	let { stats }: { stats: CompendiumStat[] } = $props();
</script>

{#if stats.length > 0}
	<dl class="stats" data-testid="stat-rows">
		{#each stats as stat (stat.key)}
			<div>
				<dt class="sk-label">{stat.label}</dt>
				<dd class="sk-num">{stat.value}</dd>
			</div>
		{/each}
	</dl>
{/if}

<style>
	.stats {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
		gap: 0;
		margin: 1rem 0 0;
		border-top: 1px solid var(--border);
	}

	.stats div {
		margin: 0;
		padding: 0.55rem 0.85rem 0.55rem 0;
		border-bottom: 1px solid var(--border);
	}

	dt {
		margin: 0;
		color: var(--muted-foreground);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	dd {
		margin: 0.15rem 0 0;
	}
</style>
