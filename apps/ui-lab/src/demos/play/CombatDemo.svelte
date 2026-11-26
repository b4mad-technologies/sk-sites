<script lang="ts">
	import { Combat, type CombatState, type CombatTarget, type EconomyChannel } from "@spellkave/ui-widgets";
	import { combats } from "./fixtures";

	const targets: CombatTarget[] = [
		{
			targetRef: "rat-swarm",
			label: "Cellar Rat Swarm",
			actions: [
				{ id: "melee-swarm", label: "Melee Attack", accessibleLabel: "Melee Attack — Cellar Rat Swarm", verb: "melee" },
				{ id: "shove-swarm", label: "Shove", accessibleLabel: "Shove — Cellar Rat Swarm", verb: "shove" },
			],
		},
		{
			targetRef: "rat-1",
			label: "Cellar Rat 1",
			actions: [{ id: "melee-rat-1", label: "Melee Attack", accessibleLabel: "Melee Attack — Cellar Rat 1", verb: "melee" }],
		},
	];
	const economy: EconomyChannel[] = [
		{ channelId: "srd/economy_channel/primary", spentMs: 1, windowStartMs: 100 },
		{ channelId: "srd/economy_channel/reaction", spentMs: 0, windowStartMs: 100 },
	];
	const combat: CombatState = {
		...combats.yourTurn,
		roster: [
			{ ordinal: 0, name: "Renn the Roadwarden", isMe: true, isCurrent: true },
			{ ordinal: 1, name: "Cellar Rat Swarm", targetRef: "rat-swarm", isMe: false, isCurrent: false },
			{ ordinal: 2, name: "Cellar Rat 1", targetRef: "rat-1", isMe: false, isCurrent: false },
		],
	};
	let selectedTargetRef = $state("rat-swarm");
	let lastEvent = $state("Select a target or an offered verb.");
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
	<Combat combat={combats.click} />
	<Combat
		{combat}
		{targets}
		{economy}
		{selectedTargetRef}
		onSelectTarget={(targetRef) => {
			selectedTargetRef = targetRef;
			lastEvent = `Selected ${targets.find((target) => target.targetRef === targetRef)?.label ?? targetRef}.`;
		}}
		onAct={(id) => (lastEvent = `Would dispatch ${id}.`)}
		onEndTurn={() => (lastEvent = "Would dispatch End turn.")}
	/>
	<Combat combat={combats.waiting} />
</div>

<p class="sk-play-prose mt-3" aria-live="polite" data-testid="combat-demo-event">{lastEvent}</p>

<p class="sk-label mt-6 mb-2 text-[color:var(--muted-foreground)]">
	density: strip | card | stage, default card
</p>
<div class="grid w-full gap-4 sm:grid-cols-[repeat(auto-fit,minmax(17rem,1fr))]">
	<Combat combat={combats.yourTurn} density="strip" />
	<Combat combat={combats.yourTurn} density="card" />
	<Combat combat={combats.yourTurn} density="stage" />
</div>
