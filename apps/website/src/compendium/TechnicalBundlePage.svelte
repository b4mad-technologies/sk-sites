<script lang="ts">
	import { Button, DocsPageHeader, Input } from "@spellkave/ui";
	import type { DocsTechnicalSourceSummary, DocsTechnicalTable } from "./docs-types";
	import { pushPath } from "./parse-path";

	const PAGE_SIZE = 50;
	let { bundle, table }: { bundle: DocsTechnicalSourceSummary; table?: DocsTechnicalTable } = $props();
	let query = $state("");
	let page = $state(0);
	const indexedRows = $derived((table?.rows ?? []).map((row, index) => ({ row, index })));
	const filteredRows = $derived.by(() => {
		const needle = query.trim().toLocaleLowerCase();
		return needle === "" ? indexedRows : indexedRows.filter(({ row }) => JSON.stringify(row).toLocaleLowerCase().includes(needle));
	});
	const pageCount = $derived(Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE)));
	const visibleRows = $derived(filteredRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE));
	const tableIdentity = $derived(`${bundle.source_id}:${table?.source_id ?? ""}:${table?.table ?? ""}`);
	const metadataEnvelope = $derived(table?.table === "manifest_metadata");
	$effect(() => {
		tableIdentity;
		query = "";
		page = 0;
	});
	function open(href: string, event: MouseEvent) {
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		event.preventDefault(); pushPath(href); window.scrollTo({ top: 0 });
	}
	function filter(event: Event) { query = (event.currentTarget as HTMLInputElement).value; page = 0; }
	function rowLabel(row: Record<string, unknown>, index: number): string {
		const identity = Object.entries(row).find(([field, value]) => typeof value === "string" && value.length > 0 && field !== "bundle_id" && (field.endsWith("_id") || field.endsWith("_key") || field === "namespace" || field === "tag"));
		return identity ? `Row ${index + 1} · ${identity[0]}: ${identity[1]}` : `Row ${index + 1}`;
	}
</script>

<article data-testid="technical-bundle-page">
	<DocsPageHeader title={table ? `${bundle.source_id} · ${metadataEnvelope ? "manifest metadata" : table.table}` : `${bundle.source_id} technical rows`} description="Exact static manifest-source projection" />
	<p class="max-w-[65ch] text-sm text-[color:var(--muted-foreground)]">{metadataEnvelope ? "These are root and included-fragment metadata envelopes, not runtime table rows." : "These are authored manifest rows, not inferred gameplay state. Fragment origin is shown only when the manifest or metadata explicitly carries it."}</p>
	{#if table}
		<p class="mt-4"><a href={bundle.href} onclick={(event) => open(bundle.href, event)}>← All {bundle.source_id} tables</a></p>
		{#if table.rows.length === 0}<p class="mt-4 text-sm">This table contains no rows.</p>
		{:else}
			<div class="mt-4 max-w-xl"><label class="text-sm font-semibold" for="technical-row-filter">Filter rows</label><Input id="technical-row-filter" type="search" value={query} oninput={filter} placeholder="Search row text or identifier" class="mt-1" /></div>
			<p class="mt-3 text-sm" aria-live="polite">{filteredRows.length} filtered / {table.rows.length} total rows</p>
			{#if filteredRows.length === 0}<p class="mt-4 text-sm">No rows match this filter.</p>
			{:else}
				<div class="mt-4 space-y-3">{#each visibleRows as item (`${tableIdentity}:${item.index}`)}<details class="max-w-[80ch] border-l-2 border-border pl-4"><summary class="cursor-pointer font-semibold">{rowLabel(item.row, item.index)}</summary><pre class="mt-2 overflow-x-auto whitespace-pre-wrap text-xs">{JSON.stringify(item.row, null, 2)}</pre></details>{/each}</div>
				{#if pageCount > 1}<nav class="mt-5 flex items-center gap-3" aria-label="Technical row pages"><Button variant="outline" type="button" disabled={page === 0} onclick={() => page--}>Previous</Button><span class="text-sm">Page {page + 1} of {pageCount}</span><Button variant="outline" type="button" disabled={page + 1 >= pageCount} onclick={() => page++}>Next</Button></nav>{/if}
			{/if}
		{/if}
	{:else}
		<p class="mt-4 text-sm">{bundle.row_count} runtime rows. Metadata envelopes are listed separately and are not included in that count.</p>
		{#if bundle.tables.length === 0}<p class="mt-4 text-sm">This manifest source contains no technical row tables or metadata envelopes.</p>{:else}<ul class="mt-5 grid gap-2 sm:grid-cols-2">{#each bundle.tables as item}<li><a class="flex justify-between rounded-[var(--radius)] border border-border px-3 py-2 hover:border-primary" href={`${bundle.href}/${encodeURIComponent(item.table)}`} onclick={(event) => open(`${bundle.href}/${encodeURIComponent(item.table)}`, event)}><span>{item.table === "manifest_metadata" ? "Manifest metadata" : item.table}</span><span class="text-[color:var(--muted-foreground)]">{item.count}</span></a></li>{/each}</ul>{/if}
	{/if}
</article>
