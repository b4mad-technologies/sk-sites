<script lang="ts">
	import { BattleMap, type BattleMapExit, type BattleMapToken } from "@spellkave/ui-widgets";

	// Stands in for art the host app resolves (the widget takes a URL only).
	const goblinArt = `data:image/svg+xml,${encodeURIComponent(
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="#3f6b3a"/><circle cx="5.5" cy="7" r="1.5" fill="#f4e04d"/><circle cx="10.5" cy="7" r="1.5" fill="#f4e04d"/><path d="M4 11h8v1H4z" fill="#1d2b1b"/></svg>',
	)}`;

	// A minimal plate using the same data-node-id contract as a rendered world
	// grid. It intentionally demonstrates cells and offered steps only: roster
	// tokens and technical location prose remain world-data concerns.
	const plate = `<svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg"><g data-node-id="cellar/c_0"><rect class="grid-cell" x="0" y="0" width="40" height="40" /></g><g data-node-id="cellar/c_1"><rect class="grid-cell" x="40" y="0" width="40" height="40" /></g><g data-node-id="cellar/c_2"><rect class="grid-cell" x="80" y="0" width="40" height="40" /></g><g data-node-id="cellar/c_3"><rect class="grid-cell" x="0" y="40" width="40" height="40" /></g></svg>`;
	const exits: BattleMapExit[] = [
		{ handle: "s:exit:east", toNodeId: "cellar/c_1", label: "east" },
		{ handle: "s:exit:south", toNodeId: "cellar/c_3", label: "south" },
	];
	let event = $state("Choose an offered adjacent cell.");

	// Selection mode (user ruling 2026-09-19): "the map only ever SELECTS.
	// Actions happen only on the Table." A 5x4 arena: your cell, four foes
	// (two sharing one cell), one ally, and two offered neighbour cells.
	const selectPlate = `<svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg">${Array.from(
		{ length: 4 },
		(_, row) =>
			Array.from(
				{ length: 5 },
				(_2, col) =>
					`<g data-node-id="arena/c_${col}_${row}"><rect class="grid-cell" x="${col * 40}" y="${row * 40}" width="40" height="40" /></g>`,
			).join(""),
	).join("")}</svg>`;
	const selectOwnNodeId = "arena/c_0_0";
	const selectExits: BattleMapExit[] = [
		{ handle: "s:exit:east", toNodeId: "arena/c_1_0", label: "east" },
		{ handle: "s:exit:south", toNodeId: "arena/c_0_1", label: "south" },
	];
	const tokens: BattleMapToken[] = [
		{ nodeId: selectOwnNodeId, actorId: "hero", name: "You", isMe: true },
		{ nodeId: "arena/c_1_2", actorId: "ally-1", name: "Squire Elin", tone: "ally" },
		{ nodeId: "arena/c_3_1", actorId: "goblin-1", name: "Goblin Minion 1", tone: "foe" },
		{ nodeId: "arena/c_3_1", actorId: "goblin-2", name: "Goblin Minion 2", tone: "foe" },
		{ nodeId: "arena/c_4_2", actorId: "goblin-3", name: "Goblin Minion 3", tone: "foe" },
		// A token with host-supplied art; the others keep the initials disc.
		{ nodeId: "arena/c_2_3", actorId: "goblin-4", name: "Goblin Minion 4", tone: "foe", image: goblinArt },
	];
	let selectedNodeId = $state<string | null>(null);
	const selectionLabel = $derived.by(() => {
		if (selectedNodeId === null) return "Nothing selected yet.";
		if (selectedNodeId === selectOwnNodeId) return "Your cell";
		const occupants = tokens.filter((token) => token.nodeId === selectedNodeId);
		const coordMatch = /c_(\d+)_(\d+)$/.exec(selectedNodeId);
		const coordLabel = coordMatch ? `${coordMatch[1]},${coordMatch[2]}` : selectedNodeId;
		const reachable = selectExits.some((exit) => exit.toNodeId === selectedNodeId);
		if (occupants.length === 0) {
			return `Free cell ${coordLabel}${reachable ? " — reachable" : ""}`;
		}
		const names = occupants.map((occupant) => occupant.name);
		const nameLabel =
			names.length === 1 ? names[0]! : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
		const tones = new Set(occupants.map((occupant) => occupant.tone ?? "neutral"));
		const toneLabel = tones.size === 1 ? [...tones][0] : "mixed";
		return `${nameLabel} — ${toneLabel}`;
	});
</script>

<p class="sk-play-prose m-0 mb-2 text-sm">
	Selection mode (<code>onSelectCell</code> supplied): every cell selects; nothing steps from here.
</p>
<div class="h-96 w-full max-w-2xl">
	<BattleMap
		plate={selectPlate}
		ownNodeId={selectOwnNodeId}
		exits={selectExits}
		refusal={null}
		onStep={() => (event = "onStep must never fire in selection mode.")}
		{selectedNodeId}
		onSelectCell={(nodeId) => (selectedNodeId = nodeId)}
		{tokens}
	/>
</div>
<p
	class="sk-play-prose mt-3"
	aria-live="polite"
	data-testid="battle-map-select-demo-event"
>{selectionLabel}</p>

<p class="sk-play-prose m-0 mt-6 mb-2 text-sm">
	Legacy mode (no <code>onSelectCell</code>): unchanged from before this ruling — an offered cell
	steps immediately.
</p>
<div class="h-80 w-full max-w-xl">
	<BattleMap
		{plate}
		ownNodeId="cellar/c_0"
		{exits}
		refusal={null}
		onStep={(handle) => (event = `Would step through ${handle}.`)}
	/>
</div>
<p class="sk-play-prose mt-3" aria-live="polite" data-testid="battle-map-demo-event">{event}</p>
