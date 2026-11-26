<script lang="ts">
	import { BrowseRow, type Occupant, PlacePanel } from "@spellkave/ui-widgets";

	let selectedId = $state<string | null>("visitor");
	let selectedExitId = $state<string | null>(null);
	let inserted = $state("");
	let choice = $state("first");
	const occupants: Occupant[] = [
		{ id: "visitor", name: "Visitor", kind: "person", sceneKind: "actor", note: "Carrying a lantern." },
		{ id: "box", name: "Box", kind: "thing", note: "", sceneKind: "entity" },
	];
	const place = { id: "room", name: "Room", description: "A sample place for browsing.", exits: [{ id: "door", label: "Courtyard", direction: "east" }] };
	const detail = $derived(selectedId ? { id: selectedId, description: selectedId === "visitor" ? "An example visitor description supplied by the host." : "An example object description supplied by the host.", facts: [{ id: "state", label: "State", value: "Observed" }], verbs: [
		{ id: "inspect", label: "Inspect", verb: "sensing", group: "Study", description: "A host-supplied explanation for this example action." },
		{ id: "speak", label: "Speak", verb: "communicate" },
		{ id: "check", label: "Check", verb: "manipulate", group: "Checks" },
	] } : null);
</script>

<p>Mark a row to read. Insert fills the sample draft without attempting anything. Clicking an unmarked way out marks it and fills the draft with its movement; clicking it again only unmarks.</p>
<div class="h-[38rem] min-h-0 flex">
	<PlacePanel {place} {occupants} {selectedId} {selectedExitId} {detail} density="stage" selectionOnly
		onSelect={id => { selectedId = selectedId === id ? null : id; selectedExitId = null; }}
		onSelectExit={id => { selectedExitId = selectedExitId === id ? null : id; selectedId = null; }}
		onAct={id => inserted = id} onInsertMove={id => inserted = id}>
		{#snippet reference()}<p>Example reference prose supplied independently by the host.</p>{/snippet}
	</PlacePanel>
</div>
<p role="status">Sample draft: {inserted || "empty"}</p>
<p>The finder and Place share BrowseRow's hover, selection accent, focus and scroll behavior. Place opts into compact rows; the sample finder keeps the default density. Each host owns its insertion policy.</p>
<div role="listbox" aria-label="Sample finder">
	<BrowseRow role="option" aria-selected={choice === "first"} selected={choice === "first"} onclick={() => choice = "first"}>First disclosed fact</BrowseRow>
	<BrowseRow role="option" aria-selected={choice === "second"} selected={choice === "second"} onclick={() => choice = "second"}>Second disclosed fact</BrowseRow>
</div>
