<script lang="ts">
	import { SelectionRow, type SelectionRowProps } from "@spellkave/ui-widgets";

	/**
	 * The one live selection row (bead sk-jay0.1.8.63.13): "the map is always
	 * only selecting, actions always only on the Table." Each scenario below
	 * is one shape `apps/play/src/lib/selection.ts`'s `selectionRowFromView`
	 * can hand a host — never invented data, just the row shapes the design
	 * doc enumerates.
	 */
	type Scenario = { id: string; label: string; row: Omit<SelectionRowProps, "onAct" | "pendingActionId" | "disabled"> };

	const scenarios: Scenario[] = [
		{
			id: "foe",
			label: "A foe",
			row: {
				title: "Selected",
				subjects: [
					{
						id: "rat-1",
						name: "Cellar Rat 1",
						primary: [
							{ id: "act:strike", label: "Strike" },
							{ id: "act:shove", label: "Shove" },
						],
						more: [{ id: "checks", label: "Checks", submenu: [{ id: "c:athletics", label: "Check: Athletics" }] }],
					},
				],
			},
		},
		{
			id: "two-foes",
			label: "Two foes on one cell",
			row: {
				title: "Selected",
				subjects: [
					{ id: "rat-1", name: "Cellar Rat 1", primary: [{ id: "act:strike-1", label: "Strike" }], more: [] },
					{ id: "rat-2", name: "Cellar Rat 2", primary: [{ id: "act:strike-2", label: "Strike" }], more: [] },
				],
			},
		},
		{
			id: "free-cell",
			label: "A free reachable cell",
			row: {
				title: "Selected",
				subtitle: "east",
				subjects: [{ id: "exit:s:exit:1", name: "Free cell", primary: [{ id: "move:s:exit:1", label: "Move here" }], more: [] }],
			},
		},
		{
			id: "own-cell",
			label: "Your own cell",
			row: {
				title: "Selected",
				subjects: [{ id: "self", name: "You", primary: [{ id: "act:dodge", label: "Dodge" }], more: [] }],
			},
		},
		{
			id: "nothing",
			label: "Nothing offered",
			row: {
				title: "Selected",
				subjects: [{ id: "rat-3", name: "Cellar Rat 3", primary: [], more: [] }],
				note: "Nothing is offered from here.",
			},
		},
		{
			id: "travel",
			label: "A place to travel to",
			row: {
				title: "Selected",
				subjects: [{ id: "place:north-road", name: "North Road", primary: [{ id: "move:s:exit:north", label: "Travel to North Road" }], more: [] }],
			},
		},
	];

	const firstScenario = scenarios[0] as Scenario;
	let scenarioId = $state(firstScenario.id);
	const scenario = $derived(scenarios.find((entry) => entry.id === scenarioId) ?? firstScenario);
	let event = $state("No action pressed yet.");
	let pendingActionId = $state<string | null>(null);

	function onAct(actionId: string): void {
		event = `onAct("${actionId}")`;
		pendingActionId = actionId;
		setTimeout(() => {
			pendingActionId = null;
		}, 600);
	}
</script>

<p class="sk-play-prose m-0 mb-2 text-sm">
	Primary actions render as key-pilled buttons, numbered across the whole row; generic checks
	always fold into one "Checks" menu.
</p>
<div class="flex flex-wrap gap-2 mb-3">
	{#each scenarios as entry (entry.id)}
		<button
			type="button"
			class="sk-play-prose rounded border px-2 py-1 text-xs"
			aria-pressed={entry.id === scenarioId}
			onclick={() => (scenarioId = entry.id)}
		>
			{entry.label}
		</button>
	{/each}
</div>
<div class="max-w-lg border rounded">
	<SelectionRow {...scenario.row} {pendingActionId} onAct={onAct} />
</div>
<p class="sk-play-prose mt-3" aria-live="polite" data-testid="selection-row-demo-event">{event}</p>
