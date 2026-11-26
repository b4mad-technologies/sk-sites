<script lang="ts">
	import { type BattleMapExit, type MapFrame, PlaceMap } from "@spellkave/ui-widgets";
	import { maps } from "./fixtures";

	// A minimal full-map plate using the same data-node-id contract as a
	// rendered world map (render-svg.ts): a `<g data-node-id>` per place,
	// wrapping a `.place` mark and a `text.label`. Mirrors BattleMapDemo's
	// own hand-written plate, one level up (places, not grid cells).
	const travelFrame: MapFrame = {
		mode: "full",
		placeName: "Common Room",
		caption: "Click, or tab and press Enter, to travel to a neighbouring place.",
		focusNodeId: "common-room",
		svg: `<svg viewBox="0 0 120 60" xmlns="http://www.w3.org/2000/svg"><g data-node-id="common-room"><circle class="place" cx="20" cy="30" r="7" /><text x="20" y="46" class="label">Common Room</text></g><g data-node-id="cellar"><circle class="place" cx="60" cy="30" r="7" /><text x="60" y="46" class="label">Cellar</text></g><g data-node-id="foyer"><circle class="place" cx="100" cy="30" r="7" /><text x="100" y="46" class="label">Foyer</text></g></svg>`,
	};
	const travelExits: BattleMapExit[] = [
		{ handle: "s:exit:cellar", toNodeId: "cellar", label: "Cellar" },
		{ handle: "s:exit:foyer", toNodeId: "foyer", label: "Foyer" },
	];
	// A card plate on the dark theme: the renderer's light ground, title bar and
	// legend are hidden, labels restyled from tokens. Shape mirrors render-svg.ts.
	const darkCardFrame: MapFrame = {
		mode: "full",
		placeName: "Advancement Limbo",
		caption: "Card density hides the ground, title bar and legend.",
		focusNodeId: "limbo",
		svg: `<svg viewBox="0 0 240 120" xmlns="http://www.w3.org/2000/svg"><style>.place{fill:#148284;stroke:#fff;stroke-width:2.2}.label{fill:#1d2428;font-size:12px;font-weight:700;text-anchor:middle;paint-order:stroke;stroke:#fff;stroke-width:4px}.title-main{fill:#14201e;font-size:15px}</style><rect width="100%" height="100%" fill="#f4f7f6" /><g class="title-bar"><text class="title-main" x="16" y="22">Advancement Limbo</text></g><g data-node-id="limbo"><circle class="place" cx="120" cy="60" r="7" /><text x="120" y="80" class="label">Advancement Limbo</text></g><g class="map-chrome" data-chrome="legend" transform="translate(0 100)"><text x="12" y="14">place</text></g></svg>`,
	};
	let travelEvent =$state("Choose a neighbouring place.");
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
	<PlaceMap frame={maps.peek} />
	<PlaceMap frame={maps.full} />
</div>

<p class="sk-label mt-6 mb-2 text-[color:var(--muted-foreground)]">
	density: strip | card | stage, default card
</p>
<div class="grid w-full gap-4 sm:grid-cols-[repeat(auto-fit,minmax(17rem,1fr))]">
	<PlaceMap frame={maps.full} density="strip" />
	<PlaceMap frame={maps.full} density="card" />
	<PlaceMap frame={maps.full} density="stage" />
</div>

<p class="sk-label mt-6 mb-2 text-[color:var(--muted-foreground)]">
	click-to-travel: only Cellar and Foyer are offered; Common Room is the current place
</p>
<div class="h-64 w-full max-w-md">
	<PlaceMap
		frame={travelFrame}
		exits={travelExits}
		onTravel={(handle) => (travelEvent = `Would travel via ${handle}.`)}
	/>
</div>
<p class="sk-play-prose mt-3" aria-live="polite" data-testid="place-map-demo-event">{travelEvent}</p>

<p class="sk-label mt-6 mb-2 text-[color:var(--muted-foreground)]">
	dark card: no light ground, title bar or legend
</p>
<div class="h-48 w-full max-w-xs">
	<PlaceMap frame={darkCardFrame} density="card" />
</div>

<p class="sk-label mt-6 mb-2 text-[color:var(--muted-foreground)]">
	.sk-stream-scroll: end padding for overlay scrollbars, stable gutter, bottom inset (the gap above is the host's margin)
</p>
<div class="sk-stream-scroll h-32 w-full max-w-xs rounded border border-[color:var(--border)]" data-testid="stream-scroll-demo">
	{#each Array.from({ length: 12 }, (_, i) => i + 1) as n (n)}
		<p class="sk-play-prose m-0">Stream line {n}</p>
	{/each}
</div>
