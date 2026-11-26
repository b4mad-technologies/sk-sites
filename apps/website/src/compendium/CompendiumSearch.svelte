<script lang="ts">
	import { onMount } from "svelte";
	import type { DocsSearchEntry } from "./docs-types";
	import { filterSearch, loadDocsSearch } from "./load";
	import { pushPath } from "./parse-path";

	let {
		rows,
		searchHref,
	}: {
		rows: DocsSearchEntry[];
		searchHref?: string;
	} = $props();
	let loadedRows = $state<DocsSearchEntry[]>([]);
	let loadStarted = $state(false);
	let loadError = $state(false);
	$effect(() => { if (rows.length > 0) loadedRows = rows; });

	let query = $state("");
	let open = $state(false);
	let active = $state(0);
	let rootEl = $state<HTMLDivElement | null>(null);
	const results = $derived(filterSearch(loadedRows, query));
	const listId = "compendium-search-results";

	function go(row: DocsSearchEntry) {
		pushPath(row.href);
		open = false;
		query = "";
	}

	function ensureRows() {
		if (loadStarted || loadedRows.length > 0 || !searchHref) return;
		loadStarted = true;
		loadError = false;
		void loadDocsSearch(searchHref).then(
			(loaded) => { loadedRows = loaded; },
			() => { loadStarted = false; loadError = true; },
		);
	}

	function onKey(event: KeyboardEvent) {
		if (event.key === "Escape") {
			open = false;
			return;
		}
		if (event.key === "ArrowDown") {
			event.preventDefault();
			open = true;
			active = Math.min(active + 1, Math.max(results.length - 1, 0));
			return;
		}
		if (event.key === "ArrowUp") {
			event.preventDefault();
			active = Math.max(active - 1, 0);
			return;
		}
		if (event.key === "Enter") {
			const row = results[active];
			if (!row) return;
			event.preventDefault();
			go(row);
		}
	}

	onMount(() => {
		const onPointer = (event: PointerEvent) => {
			if (!rootEl?.contains(event.target as Node)) open = false;
		};
		window.addEventListener("pointerdown", onPointer);
		return () => window.removeEventListener("pointerdown", onPointer);
	});
</script>

<div class="search" bind:this={rootEl}>
	<label class="sr-only" for="compendium-search">Search the catalogue</label>
	<input
		id="compendium-search"
		type="search"
		role="combobox"
		placeholder="Search the catalogue…"
		autocomplete="off"
		aria-autocomplete="list"
		aria-expanded={open && query.trim().length > 0}
		aria-controls={listId}
		aria-activedescendant={open && results[active] ? `search-opt-${active}` : undefined}
		bind:value={query}
		onfocus={() => { open = true; ensureRows(); }}
		oninput={() => {
			open = true;
			active = 0;
		}}
		onkeydown={onKey}
		data-testid="compendium-search"
	/>
	{#if open && query.trim().length > 0}
		<div class="panel" data-testid="search-panel">
			<p class="count" role="status">{loadError ? "Search unavailable — focus to retry" : `${results.length} ${results.length === 1 ? "match" : "matches"}`}</p>
			<ul class="results" id={listId} role="listbox" aria-label="Search results">
				{#each results as row, i (row.id)}
					<li>
						<button
							type="button"
							id={`search-opt-${i}`}
							role="option"
							aria-selected={i === active}
							class:active={i === active}
							onmouseenter={() => (active = i)}
							onclick={() => go(row)}
						>
							<span class="name">{row.name}</span>
							<span class="meta">
								<span class="kind">{row.kind}</span>
								<span class="corpus">{row.corpus_label}</span>
							</span>
						</button>
					</li>
				{:else}
					<li class="empty">{loadError ? "The search index could not be loaded. Focus the field to retry." : "No matches. Try a name, kind, or keyword."}</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>

<style>
	.search {
		position: relative;
		flex: 1 1 16rem;
		min-width: 12rem;
		max-width: 32rem;
	}

	input {
		width: 100%;
		min-height: 44px;
		padding: 0 0.9rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		color: var(--foreground);
		background: var(--background);
		font: inherit;
	}

	input:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 1px;
	}

	.panel {
		position: absolute;
		z-index: 20;
		top: calc(100% + 0.25rem);
		right: 0;
		left: 0;
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--card);
	}

	.count {
		margin: 0;
		padding: 0.55rem 0.9rem 0.25rem;
		color: var(--muted-foreground);
		font-size: 0.75rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.results {
		margin: 0;
		padding: 0.15rem 0 0.35rem;
		max-height: 18rem;
		overflow: auto;
		list-style: none;
	}

	button {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 0.15rem;
		width: 100%;
		min-height: 44px;
		padding: 0.45rem 0.9rem;
		border: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	button.active {
		background: color-mix(in srgb, var(--primary) 18%, transparent);
	}

	.meta {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.kind,
	.corpus {
		color: var(--muted-foreground);
		font-size: 0.75rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.empty {
		padding: 0.75rem 0.9rem;
		color: var(--muted-foreground);
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
	}
</style>
