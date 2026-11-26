<script lang="ts">
	import { PlacePanel, Scene } from "@spellkave/ui-widgets";
	import { commonRoomOccupants, places } from "./fixtures";

	let selectedId = $state<string | null>(null);
	let selectedExitId = $state<string | null>(null);
	let insertion = $state("");
	const occupants = [
		{ id: "lab/person", name: "Visitor", kind: "person" as const, sceneKind: "actor", note: "Here", noteIsPresence: true },
		{ id: "lab/thing", name: "Box", kind: "thing" as const, sceneKind: "entity", note: "Here", noteIsPresence: true },
	];
	// sk-jay0.1.8.102 s1: a description longer than three lines. The Place card
	// shows it whole; in a short tile only the description scrolls while the
	// place name, the occupants line, the three way-out rows and the ways-out
	// count keep their size (the browser case seen at 1312x700).
	const longPlace = {
		...places.stairs,
		name: "Creation Limbo",
		description:
			"A grey hush hangs between one breath and the next. Shapes of a life not yet lived drift past like lantern-light on fog: a sword, a hymn, a road. Somewhere below, the hamlet waits; the inn lies to the north, past the old well and the leaning signpost, where the fire is already lit and a seat at the long table has been kept for you.",
	};
	// sk-jay0.1.8.99 s3: the card names its ways out; a click only reports the
	// exit (the host fills the composer). Two exits share a direction here, and
	// a seven-exit place shows four names and a "+3 more" note.
	const sharedDirectionPlace = {
		...places.commonRoom,
		name: "Crossing",
		exits: [
			{ id: "crossing-n1", label: "Chapel", direction: "north" },
			{ id: "crossing-n2", label: "Bell tower", direction: "north" },
			{ id: "crossing-w", label: "Mill road", direction: "west", gated: true },
		],
	};
	const manyExitsPlace = {
		...places.commonRoom,
		name: "Market square",
		exits: [
			{ id: "square-n", label: "Inn", direction: "north" },
			{ id: "square-ne", label: "Smithy", direction: "northeast" },
			{ id: "square-e", label: "Well", direction: "east" },
			{ id: "square-se", label: "Stables", direction: "southeast" },
			{ id: "square-s", label: "South gate", direction: "south" },
			{ id: "square-w", label: "Temple", direction: "west" },
			{ id: "square-d", label: "Cellar steps", direction: "down" },
		],
	};
	let cardInsertion = $state("");
</script>

<!--
  Two sibling roots: DemoContainer (sk-jay0.7.37) stacks a multi-root demo
  itself now, so this file doesn't need its own `flex w-full flex-col`
  wrapper (sk-jay0.7.33's original per-file fix) — see ActionsDemo.svelte
  for the fuller rationale and the regression test in App.test.ts.
  `minmax(17rem,1fr)` still floors each card at the mosaic's own
  card-column width (~272px at 1280px wide, apps/play/src/lib/mosaic.ts
  REST_SIZE + DESKTOP_COLUMNS, minus the play-widget frame's padding) so a
  long action label never bleeds past its card.
-->
<div class="grid w-full gap-4 sm:grid-cols-[repeat(auto-fit,minmax(17rem,1fr))]">
	<Scene place={places.loft} />
	<Scene place={places.commonRoom} />
</div>

<p class="sk-label mt-6 mb-2 text-[color:var(--muted-foreground)]">
	density: strip | card | stage, default card
</p>
<div class="grid w-full gap-4 sm:grid-cols-[repeat(auto-fit,minmax(17rem,1fr))]">
	<Scene place={places.commonRoom} density="strip" />
	<Scene place={places.commonRoom} density="card" />
	<Scene place={places.commonRoom} density="stage" />
</div>

<p class="sk-label mt-6 mb-2">Place: arrows browse; detail buttons disclose an insertion</p>
<div class="flex h-[32rem] min-h-0 flex-col">
	<PlacePanel place={places.commonRoom} {occupants} density="stage" selectionOnly {selectedId} {selectedExitId}
		onSelect={id => { selectedExitId = null; selectedId = selectedId === id ? null : id; }}
		onSelectExit={id => { selectedId = null; selectedExitId = selectedExitId === id ? null : id; }}
		detail={selectedId ? { id: selectedId, description: "A supplied description.", facts: [], verbs: [{ id: "lab/inspect", label: "Inspect", verb: "sensing" }] } : null}
		onAct={id => { insertion = `Insert action: ${id}`; }} onInsertMove={id => { insertion = `Insert way out: ${id}`; }} />
</div>
<p role="status">{insertion}</p>

<p class="sk-label mt-6 mb-2">Place card: a long description, not clamped (tall tile, then a short tile where only the description scrolls)</p>
<div class="grid w-full gap-4 sm:grid-cols-[repeat(auto-fit,minmax(17rem,1fr))]">
	<div class="h-[24rem] rounded-[var(--radius)] border border-[color:var(--border)] p-2.5">
		<PlacePanel place={longPlace} occupants={commonRoomOccupants} density="card" chrome="bare" />
	</div>
	<div class="h-[12rem] rounded-[var(--radius)] border border-[color:var(--border)] p-2.5">
		<PlacePanel place={longPlace} occupants={commonRoomOccupants} density="card" chrome="bare" />
	</div>
</div>

<p class="sk-label mt-6 mb-2">Place card: ways out by name; a click reports the exit to the host</p>
<div class="grid w-full gap-4 sm:grid-cols-[repeat(auto-fit,minmax(17rem,1fr))]">
	<div class="h-[20rem] rounded-[var(--radius)] border border-[color:var(--border)] p-2.5">
		<PlacePanel place={sharedDirectionPlace} occupants={commonRoomOccupants} density="card" chrome="bare"
			onInsertMove={id => { cardInsertion = `Insert way out: ${id}`; }} />
	</div>
	<div class="h-[20rem] rounded-[var(--radius)] border border-[color:var(--border)] p-2.5">
		<PlacePanel place={manyExitsPlace} occupants={commonRoomOccupants} density="card" chrome="bare"
			onInsertMove={id => { cardInsertion = `Insert way out: ${id}`; }} />
	</div>
</div>
<p role="status" aria-label="Card insertion">{cardInsertion}</p>
