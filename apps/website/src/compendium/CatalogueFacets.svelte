<script lang="ts">
	import type { DocsCatalogueEntry } from "./docs-types";

	let { facets }: { facets: NonNullable<DocsCatalogueEntry["facets"]> } = $props();

	function display(value: unknown): string {
		if (value === null) return "null";
		if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
			return String(value);
		}
		return JSON.stringify(value);
	}

	function assetHref(row: Record<string, unknown>): string | undefined {
		return typeof row.asset_href === "string" && row.asset_href !== "" ? row.asset_href : undefined;
	}
</script>

{#if facets.length}
	<section class="mt-8 space-y-3" aria-label="Technical details" data-testid="catalogue-facets">
		<h2 class="text-lg font-semibold">Technical details</h2>
		{#each facets as facet (`${facet.label}:${facet.rows.length}`)}
			<details class="rounded-[var(--radius)] border border-border p-3">
				<summary class="cursor-pointer font-medium">{facet.label} ({facet.rows.length})</summary>
				{#each facet.rows as row, index (index)}
					<div class="mt-3 border-t border-border pt-3">
						{#if assetHref(row)}
							<img
								class="mb-3 max-h-80 w-full rounded-[var(--radius)] border border-border object-contain"
								src={assetHref(row)}
								alt={`${facet.label} asset ${index + 1}`}
								loading="lazy"
							/>
						{/if}
						<dl class="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[minmax(10rem,auto)_1fr]">
							{#each Object.entries(row) as [key, value] (key)}
								<dt class="break-words font-medium text-[color:var(--muted-foreground)]">{key}</dt>
								<dd class="min-w-0 break-words whitespace-pre-wrap">{display(value)}</dd>
							{/each}
						</dl>
					</div>
				{/each}
			</details>
		{/each}
	</section>
{/if}
