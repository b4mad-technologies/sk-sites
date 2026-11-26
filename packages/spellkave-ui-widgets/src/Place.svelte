<script lang="ts">
	import { Button } from "@spellkave/ui";
	import Actions from "./Actions.svelte";
	import BrowseRow from "./BrowseRow.svelte";
	import Glyph from "./Glyph.svelte";
	import Occupants from "./Occupants.svelte";
	import { groupOccupants } from "./occupants";
	import PlayFrame from "./PlayFrame.svelte";
	import Scene from "./Scene.svelte";
	import type { Exit, Occupant, OfferedAction, PlaceProps } from "./types";

	let {
		place,
		selectionOnly = false,
		showDetailActions = true,
		onSelectExit,
		selectedExitId = null,
		onInsertMove,
		renderProse,
		reference,
		placeState = "ready",
		occupants,
		selectedId = null,
		onSelect,
		infoRefFor,
		detail = null,
		artwork,
		onAct,
		onMove,
		busy = false,
		otherActions,
		environmentActions = [],
		density = "card",
		chrome = "frame",
		isSecondaryVerb,
		secondaryVerbsLabel,
	}: PlaceProps = $props();

	const selected = $derived(occupants.find((occupant: Occupant) => occupant.id === selectedId) ?? null);
	const selectedExit = $derived(place?.exits.find(exit => exit.id === selectedExitId) ?? null);
	const groups = $derived(groupOccupants(occupants));
	const entries = $derived([...groups.flatMap(group => group.items.map(item => ({ kind: "occupant", id: item.id }))), ...(place?.exits.map(exit => ({ kind: "exit", id: exit.id })) ?? [])]);
	let rowButtons = $state<HTMLButtonElement[]>([]);
	function browse(event: KeyboardEvent, index: number): void {
		if (event.key === "ArrowRight") { event.preventDefault(); event.stopPropagation(); actionFilter?.focus(); return; }
		if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
		event.preventDefault();
		event.stopPropagation();
		const next = Math.max(0, Math.min(entries.length - 1, index + (event.key === "ArrowDown" ? 1 : -1)));
		if (next === index) return;
		const entry = entries[next];
		if (!entry) return;
		if (entry.kind === "exit") { if (selectedExitId !== entry.id) onSelectExit?.(entry.id); }
		else if (selectedId !== entry.id || selectedExitId !== null) onSelect?.(entry.id);
		rowButtons[next]?.focus();
	}

	let query = $state("");
	let markedId = $state<string | null>(null);
	let actionFilter = $state<HTMLInputElement>();
	const entryKey = $derived(selectedExit ? `exit:${selectedExit.id}` : selected?.id ?? null);
	let lastEntryKey = $state<string | null>(null);
	$effect(() => {
		if (entryKey !== lastEntryKey) { lastEntryKey = entryKey; markedId = null; query = ""; }
	});
	const activeDetail = $derived(detail?.id === selected?.id ? detail : null);
	const verbs = $derived<OfferedAction[]>(selectedExit
		? onInsertMove ? [{ id: selectedExit.id, label: "Go there", verb: "movement" }] : []
		: showDetailActions ? activeDetail?.verbs ?? [] : []);
	function actionGroup(action: OfferedAction): string {
		if (isSecondaryVerb?.(action)) return secondaryVerbsLabel ?? "Checks";
		if (action.verb === "communicate") return "Communicate";
		return action.groups?.join(" · ") || action.group || "Other";
	}
	function groupRank(action: OfferedAction): number {
		if (isSecondaryVerb?.(action)) return 3;
		if (action.verb === "communicate") return 0;
		return action.groups?.join(" · ") || action.group ? 1 : 2;
	}
	const sortedVerbs = $derived([...verbs].sort((a, b) => groupRank(a) - groupRank(b) || actionGroup(a).localeCompare(actionGroup(b)) || a.label.localeCompare(b.label) || a.id.localeCompare(b.id)));
	const filteredVerbs = $derived(sortedVerbs.filter(action => action.label.toLocaleLowerCase().includes(query.toLocaleLowerCase())));
	const marked = $derived(filteredVerbs.find(action => action.id === markedId) ?? null);
	function insertMarked(): void {
		if (!marked || busy) return;
		if (selectedExit) onInsertMove?.(selectedExit.id);
		else onAct?.(marked.id);
	}
	function actionKeys(event: KeyboardEvent): void {
		if (!["ArrowDown", "ArrowUp", "ArrowLeft", "Enter", "Escape"].includes(event.key)) return;
		event.preventDefault(); event.stopPropagation();
		if (event.key === "ArrowLeft") {
			const index = entries.findIndex(entry => entry.id === (selectedExit?.id ?? selected?.id));
			rowButtons[Math.max(0, index)]?.focus();
		} else if (event.key === "Escape") {
			if (markedId !== null) markedId = null; else query = "";
		} else if (event.key === "Enter") insertMarked();
		else {
			const current = filteredVerbs.findIndex(action => action.id === markedId);
			const index = current < 0 ? event.key === "ArrowDown" ? 0 : filteredVerbs.length - 1 : Math.max(0, Math.min(filteredVerbs.length - 1, current + (event.key === "ArrowDown" ? 1 : -1)));
			markedId = filteredVerbs[index]?.id ?? null;
		}
	}

	const exitsDatum = $derived(
		place ? `${place.exits.length} ${place.exits.length === 1 ? "way out" : "ways out"}` : "—",
	);
	const sceneReadState = $derived(placeState === "missing" ? "ready" : placeState);
	// sk-jay0.1.8.99 s3: the card names the ways out. Up to CARD_EXITS_MAX + 1
	// exits show whole (a "+1 more" note would take the room of the row it
	// hides); more than that show the first CARD_EXITS_MAX and a "+N more" note.
	const CARD_EXITS_MAX = 4;
	const cardExits = $derived(
		!place ? [] : place.exits.length <= CARD_EXITS_MAX + 1 ? place.exits : place.exits.slice(0, CARD_EXITS_MAX),
	);
	const cardExitsHidden = $derived((place?.exits.length ?? 0) - cardExits.length);
</script>

<!-- One way-out name for the stage list and the card list: "<label> (<direction>)". -->
{#snippet exitName(exit: Exit)}{exit.label}{exit.direction ? ` (${exit.direction})` : ""}{/snippet}

<PlayFrame
	slot="play-place"
	titleId="play-place-heading"
	title={place?.name ?? "Place"}
	titleTone="world"
	meta="Place"
	{density}
	{chrome}
	glyph="compass"
	datum={exitsDatum}
	class={density === "stage" ? "place-stage" : density === "card" ? "place-card" : undefined}
>
	{#if placeState === "failed"}
		<p class="sk-play-muted" role="alert">Place could not be loaded.</p>
	{:else if placeState === "loading"}
		<p class="sk-play-muted" role="status">Loading place…</p>
	{:else if placeState === "missing" || place === null}
		<p class="sk-play-muted">Between places.</p>
	{:else}
		{#if density !== "stage"}<Scene {place} readState={sceneReadState} showExits={false} {density} chrome="bare" />{/if}
		{#if density !== "stage"}
			<Occupants {occupants} {selectedId} {onSelect} {infoRefFor} {density} chrome="bare" />
			{#if density === "card"}
				{#if cardExits.length > 0}
					<!-- A row only reports its exit through onInsertMove; the host builds
					     the composer sentence. Without that callback the names are text. -->
					<ul class="place-card-ways m-0 mt-2 text-sm" aria-label="Ways out">
						{#each cardExits as exit (exit.id)}
							<li>{#if onInsertMove}<button type="button" class="place-card-way" disabled={busy} title={exit.gated ? "Something stands at this way; the world decides the attempt." : undefined} onclick={() => onInsertMove(exit.id)}><Glyph name="compass" class="size-4 shrink-0 opacity-80" /><span class="min-w-0">{@render exitName(exit)}</span>{#if exit.gated}<span class="sk-label sk-play-muted">may be blocked</span>{/if}</button>{:else}<span class="place-card-way"><Glyph name="compass" class="size-4 shrink-0 opacity-80" /><span class="min-w-0">{@render exitName(exit)}</span>{#if exit.gated}<span class="sk-label sk-play-muted">may be blocked</span>{/if}</span>{/if}</li>
						{/each}
						{#if cardExitsHidden > 0}<li class="sk-play-muted">+{cardExitsHidden} more</li>{/if}
					</ul>
				{/if}
				<p class="sk-play-muted m-0 mt-2 text-sm">{exitsDatum}</p>
			{/if}
		{:else}
			<div class="place-panes">
				<div class="place-lists">
					{#if occupants.length > 0}
						<h3 class="sk-label m-0">Here ({occupants.length})</h3>
						{#each groups as group (group.key)}
							{#if groups.length > 1}<h4 class="sk-label sk-play-muted mt-3">{group.key === "actor" ? "People" : group.key === "entity" ? "Things" : group.label} ({group.items.length})</h4>{/if}
							<ul class="sk-play-list" aria-label={group.label}>
								{#each group.items as occupant (occupant.id)}
									{@const index = entries.findIndex(entry => entry.kind === "occupant" && entry.id === occupant.id)}
									<li><button type="button" class="sk-play-row" bind:this={rowButtons[index]} aria-pressed={selectedId === occupant.id && selectedExit === null} onclick={() => onSelect?.(occupant.id)} onkeydown={event => browse(event, index)}>
										<Glyph name={occupant.kind} class="size-5 shrink-0 opacity-80" />
										<span class="min-w-0 flex-1"><span class="block font-medium">{occupant.name}</span>{#if !occupant.noteIsPresence && occupant.note}<span class="sk-play-muted block text-sm">{occupant.note}</span>{/if}</span>
									</button></li>
								{/each}
							</ul>
						{/each}
					{/if}
					{#if place.exits.length > 0}
						<section class="place-ways" aria-label="Ways out">
							<h3 class="sk-label m-0">Ways out ({place.exits.length})</h3>
							<ul class="sk-play-list">
								{#each place.exits as exit (exit.id)}
									{@const index = entries.findIndex(entry => entry.kind === "exit" && entry.id === exit.id)}
									<li><button type="button" class="sk-play-row" bind:this={rowButtons[index]} aria-pressed={selectedExitId === exit.id} onclick={() => { if (!selectionOnly) { onMove?.(exit.id); return; } const marking = selectedExitId !== exit.id; onSelectExit?.(exit.id); if (marking) onInsertMove?.(exit.id); }} onkeydown={event => browse(event, index)} title={exit.gated ? "Something stands at this way; the world decides the attempt." : exit.direction}>
										<Glyph name="compass" class="size-5 shrink-0 opacity-80" /><span class="min-w-0 flex-1">{selectionOnly ? "" : "Go to "}{@render exitName(exit)}</span>{#if exit.gated}<span class="sk-label sk-play-muted">may be blocked</span>{/if}
									</button></li>
								{/each}
							</ul>
						</section>
					{/if}

				</div>
				<div class="place-middle">
					<section class="place-summary" aria-label={selectedExit ? "Way out details" : selected ? "Selected entity details" : "Place details"}>
						<button type="button" class="place-entry" aria-label={`Read about ${selectedExit?.label ?? selected?.name ?? place.name}`} aria-pressed={marked === null} onclick={() => markedId = null}>
							{#if selected}{@render artwork?.(selected.id)}{/if}
							<span class="sk-label sk-play-muted">{selectedExit ? "Way out" : selected ? selected.kind === "thing" ? "Object" : selected.kind === "creature" ? "Creature" : "Person" : "Place"}</span>
							<h3 class="place-name sk-title text-2xl">{selectedExit?.label ?? selected?.name ?? place.name}</h3>
							{#if activeDetail?.description}<p class="sk-play-muted">{activeDetail.description}</p>{/if}
						{#if selected && !selected.noteIsPresence && selected.note}<p class="sk-play-muted">{selected.note}</p>{/if}
						{#if selectedExit?.direction}<p class="sk-play-muted">{selectedExit.direction}</p>{/if}
						{#if activeDetail}<dl>{#each activeDetail.facts as fact (fact.id)}<div class="flex gap-2"><dt class="sk-label sk-play-muted">{fact.label}:</dt><dd class="m-0">{fact.value}</dd></div>{/each}</dl>{/if}
						</button>
					</section>
					<section class="place-actions" aria-label="Things to try">
						<h4 class="sk-label m-0">Things to try ({verbs.length})</h4>
						<input bind:this={actionFilter} bind:value={query} aria-label="Filter things to try" placeholder="Filter things to try" onkeydown={actionKeys} />
						<div class="place-action-results">
							{#if selected && activeDetail?.failed}<p role="alert">Could not load actions on this entity.</p>
							{:else if selected && !activeDetail}<p role="status">Loading actions on this entity…</p>
							{:else}
								{#each filteredVerbs as action, index (action.id)}
									{#if actionGroup(action) && (index === 0 || actionGroup(filteredVerbs[index - 1]!) !== actionGroup(action))}<h5 class="sk-label sk-play-muted">{actionGroup(action)}</h5>{/if}
									<BrowseRow compact selected={marked?.id === action.id} aria-pressed={marked?.id === action.id} disabled={busy} onclick={() => markedId = markedId === action.id ? null : action.id} onkeydown={event => { if (event.key !== "Enter" && event.key !== " ") actionKeys(event); }}>{action.label}</BrowseRow>
								{/each}
								{#if filteredVerbs.length === 0}<p class="sk-play-muted">No matching actions.</p>{/if}
							{/if}
						</div>
						{#if !selectionOnly && otherActions}<Button variant="woven-secondary" size="sm" onclick={otherActions.onOpen}>{otherActions.label}</Button>{/if}
					</section>
				</div>
				<section class="place-reading" aria-label="Reading pane" aria-live="polite">
					{#if marked}
						{#if actionGroup(marked)}<p class="sk-label sk-play-muted">{actionGroup(marked)}</p>{/if}
						<h3 class="place-name sk-title text-2xl">{marked.label}</h3>
						{#if marked.description?.trim()}<p class="sk-play-prose">{#if renderProse}{@render renderProse(marked.description)}{:else}{marked.description}{/if}</p>{/if}
						<Button variant="woven-secondary" size="sm" disabled={busy} onclick={insertMarked}>Insert</Button>
					{:else if selectedExit}
						<h3 class="place-name sk-title text-2xl">{selectedExit.label}</h3>
						{#if selectedExit.gated}<p class="sk-play-muted">May be blocked. Something stands at this way; the world decides the attempt.</p>{/if}
					{:else if selected}
						{@render reference?.(selected.id)}
					{:else}
						<h3 class="place-name sk-title text-2xl">{place.name}</h3>
						<p class="sk-play-prose">{#if renderProse}{@render renderProse(place.description)}{:else}{place.description}{/if}</p>
					{/if}
				</section>
			</div>
			{#if !selectionOnly && environmentActions.length > 0}
				<div class="place-around">
					<Actions
						actions={environmentActions}
						{onAct}
						{busy}
						title="Around you"
						density="stage"
						chrome="bare"
					/>
				</div>
			{/if}
		{/if}
	{/if}
</PlayFrame>

<style>
	/* Card (sk-jay0.1.8.102 s1): the description is not clamped by line count.
	 * The card fills its tile as a column; the Scene part takes what is left,
	 * while the occupants line, the way-out rows and the "N ways out" line keep
	 * their own size. In a column host the card is a shrinking flex item, so a
	 * sibling above it (Play's action feedback line) takes its height out of the
	 * card's Scene part and never pushes the last line out of the tile.
	 * Inside the Scene part only the description scrolls (never a hidden
	 * remainder): the place name stays put, `.sk-stream-scroll` (@spellkave/ui)
	 * gives the text a stable gutter and an end inset so the last line clears
	 * the edge, and a fade as tall as that inset softens a line crossing the
	 * scroll edge mid-scroll instead of a hard mid-glyph cut next to the
	 * occupants row. The fade only covers the inset, so text that fits is
	 * never faded. */
	:global(.place-card) { display: flex; flex-direction: column; flex: 1 1 auto; height: 100%; min-height: 0; }
	:global(.place-card > [data-slot="play-scene"]) { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; overflow: hidden; }
	:global(.place-card > [data-slot="play-scene"] > :not(.scene-description)) { flex: none; }
	:global(.place-card .scene-description) { flex: 1 1 auto; min-height: 0; overscroll-behavior: contain; mask-image: linear-gradient(to bottom, var(--foreground) calc(100% - 0.5rem), transparent); }
	:global(.place-card > :not([data-slot="play-scene"])) { flex: none; }
	/* Keep the five named ways and occupants within the compact card budget.
	 * The description retains its own scroll region; exit names can wrap. */
	:global(.place-card > [data-slot="play-scene"] > h3) { font-size: 1.25rem; line-height: 1.5rem; }
	:global(.place-card > [data-slot="play-occupants"] > p) { font-size: .75rem; line-height: 1rem; }
	:global(.place-card > p:last-child) { margin-top: .25rem; }
	.place-card-ways { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .125rem .5rem; margin-top: .25rem; line-height: 1.25rem; }
	.place-card-way { display: flex; align-items: center; gap: .375rem; max-width: 100%; padding: 0 .25rem; border: 0; border-radius: var(--radius); background: transparent; color: inherit; font: inherit; text-align: start; overflow-wrap: anywhere; }
	button.place-card-way { cursor: pointer; }
	button.place-card-way:hover:not(:disabled) { background: color-mix(in srgb, var(--foreground) 7%, transparent); }
	button.place-card-way:focus-visible { outline: 2px solid var(--ring); outline-offset: -2px; }
	button.place-card-way:disabled { cursor: default; opacity: .6; }
	:global(.place-stage) { display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden; container-type: inline-size; }
	.place-panes { display: grid; grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(8rem, 1fr) minmax(20rem, 2fr) minmax(12rem, 1fr); flex: 1; min-height: 0; overflow: auto; gap: 1rem; margin-top: 1rem; }
	.place-lists, .place-summary, .place-action-results, .place-reading { min-width: 0; min-height: 0; overflow: auto; overscroll-behavior: contain; scrollbar-gutter: stable; }
	.place-middle { display: grid; grid-template-rows: 8rem minmax(0, 1fr); min-width: 0; min-height: 0; }
	.place-actions { display: grid; grid-template-rows: auto auto minmax(0, 1fr); gap: .5rem; min-height: 0; min-width: 0; }
	.place-actions input { inline-size: 100%; min-width: 0; border: 1px solid var(--border); border-radius: var(--radius); padding: .4rem .6rem; background: var(--background); color: var(--foreground); }
	.place-actions input:focus-visible { outline: 2px solid var(--ring); }
	.place-entry { display: block; width: 100%; border: 0; padding: .25rem; color: var(--foreground); background: transparent; text-align: start; cursor: pointer; }
	.place-name { text-transform: none; font-variant-caps: normal; }
	.place-entry:hover { background: color-mix(in srgb, var(--foreground) 7%, transparent); }
	.place-entry:focus-visible { outline: 2px solid var(--ring); outline-offset: -2px; }
	.place-summary :global(.artwork) { max-width: 4rem; float: inline-start; margin-inline-end: .5rem; }
	.place-ways, .place-around { margin-top: 1rem; }
	.place-reading, .place-middle { border-top: 1px solid var(--border); padding-top: 1rem; }
	@container (min-width: 48rem) {
		.place-panes { grid-template-columns: minmax(0, .8fr) minmax(0, 1fr) minmax(0, 1.1fr); grid-template-rows: minmax(0, 1fr); overflow: hidden; }
		.place-reading, .place-middle { border-top: 0; padding-top: 0; border-inline-start: 1px solid var(--border); padding-inline-start: 1rem; }
	}
</style>
