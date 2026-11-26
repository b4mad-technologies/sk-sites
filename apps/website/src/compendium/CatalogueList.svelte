<script lang="ts">
	import { Button, Input } from "@spellkave/ui";
	import type { DocsCatalogueEntrySummary } from "./docs-types";
	import { pushPath } from "./parse-path";
	import ReferenceCard from "./ReferenceCard.svelte";

	let {
		entries,
		noun = { singular: "reference entry", plural: "reference entries" },
	}: {
		entries: DocsCatalogueEntrySummary[];
		/** Count-phrase noun ("352 {plural}") — defaults to the generic "reference entry"/"reference entries" wording used when a group has no more specific label (sk-jay0.3.5.64 round 2). */
		noun?: { singular: string; plural: string };
	} = $props();
	// Per-instance suffix: a section page can render several CatalogueList
	// instances side by side (primary + one per secondary family group,
	// sk-jay0.3.5.64), so a fixed "catalogue-filter" id would duplicate.
	const instanceId = $props.id();
	const filterId = `catalogue-filter-${instanceId}`;
	let query = $state("");
	let page = $state(0);
	const pageSize = 50;
	const filtered = $derived(entries.filter((entry) =>
		`${entry.display_name} ${entry.description} ${entry.family} ${entry.facts.map((fact) => `${fact.label} ${fact.value}`).join(" ")}`
			.toLowerCase().includes(query.trim().toLowerCase()),
	));
	const pageCount = $derived(Math.max(1, Math.ceil(filtered.length / pageSize)));
	const visible = $derived(filtered.slice(page * pageSize, (page + 1) * pageSize));

	$effect(() => {
		entries;
		query;
		page = 0;
	});

	function open(href: string, event: MouseEvent) {
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		event.preventDefault();
		pushPath(href);
	}
</script>

<div class="mb-4 max-w-md">
	<label class="mb-1 block text-sm font-semibold" for={filterId}>Filter reference entries</label>
	<Input id={filterId} bind:value={query} placeholder="Name, family, description, or fact" />
</div>
<p class="mb-3 text-sm text-[color:var(--muted-foreground)]">{filtered.length} {filtered.length === 1 ? noun.singular : noun.plural}</p>
<ul class="grid list-none gap-3 p-0 md:grid-cols-2">
	{#each visible as entry (`${entry.kind}:${entry.ref}`)}
		<li><ReferenceCard href={entry.href} title={entry.display_name} description={entry.description} label={entry.family} facts={entry.facts} art={entry.art ? { href: entry.art.href } : undefined} /></li>
	{/each}
</ul>
{#if pageCount > 1}
	<nav aria-label="Reference entry pages" class="mt-5 flex items-center gap-3">
		<Button variant="outline" disabled={page === 0} onclick={() => (page -= 1)}>Previous</Button>
		<span class="text-sm">Page {page + 1} of {pageCount}</span>
		<Button variant="outline" disabled={page + 1 >= pageCount} onclick={() => (page += 1)}>Next</Button>
	</nav>
{/if}
