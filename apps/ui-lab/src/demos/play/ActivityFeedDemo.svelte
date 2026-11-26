<script lang="ts">
	import { ActivityFeed, ActivitySectionHeader, SpeechBubble } from "@spellkave/ui-widgets";

	/**
	 * A row is either a section header (a place, sk-jay0.1.8.63.5's
	 * grouped-list pattern — Play's own Explore stream uses `place` divider
	 * entries this way) or an ordinary activity line. One flat, id-keyed list,
	 * exactly what `ActivityFeed` itself always wants; `isSectionHeader` below
	 * is what tells it which rows are headers.
	 */
	type Row =
		| { id: string; kind: "header"; place: string; company?: string }
		| { id: string; kind: "activity"; action: string; outcome: string };

	const rows: Row[] = [
		{ id: "common-room", kind: "header", place: "Common Room", company: "Aldwin, keeper of the hearth-ledger is nearby" },
		{ id: "look", kind: "activity", action: "Look around", outcome: "You notice fresh mud by the cellar door." },
		{ id: "try-door", kind: "activity", action: "Open the cellar door", outcome: "The door is locked." },
		{ id: "ask-aldwin", kind: "activity", action: "Ask Aldwin about the cellar", outcome: "“Best not, traveller.”" },
		{ id: "cellar", kind: "header", place: "The Cellar" },
		{ id: "cellar-look", kind: "activity", action: "Look around", outcome: "Barrels, cobwebs, and something that squeaks." },
		{ id: "cellar-strike", kind: "activity", action: "Strike the rat", outcome: "You strike the rat." },
		{ id: "bar", kind: "header", place: "The Bar", company: "Brother Caddoc is nearby" },
		{ id: "bar-order", kind: "activity", action: "Order a drink", outcome: "The barkeep pours you an ale." },
		{ id: "bar-ask", kind: "activity", action: "Ask Caddoc for news", outcome: "“The roads west are quiet, for now.”" },
	];
</script>

{#snippet row(entry: Row)}
	{#if entry.kind === "header"}
		{@const company = entry.company}
		{#if company}
			<!-- `detailContent` (sk-jay0.1.8.63.6) is the widget's own escape
			     hatch for linked prose — Play passes its `ReferenceText` reading
			     aid here; this demo stands in with a plain link so the lab stays
			     free of Play's own reference-vocabulary plumbing. -->
			{#snippet linkedCompany()}
				<a href="#reference-demo">{company}</a>
			{/snippet}
			<ActivitySectionHeader title={entry.place} detailContent={linkedCompany} level={3} />
		{:else}
			<ActivitySectionHeader title={entry.place} level={3} />
		{/if}
	{:else}
		<div class="border-l-2 border-[var(--border)] pl-3 py-1.5">
			<p class="sk-play-prose m-0">{entry.action}</p>
			<p class="sk-play-muted m-0 text-sm">{entry.outcome}</p>
		</div>
	{/if}
{/snippet}

<!-- A bounded, scrolling container — the same shape as Play's own Explore
     stream (`.table-explore-stream`) — so the stick-and-replace behaviour
     (scroll and watch each place's header take over the top) is visible
     here, not just asserted in a test. -->
<div class="h-72 w-full max-w-xl overflow-y-auto">
	<ActivityFeed
		items={rows}
		ariaLabel="Recent activity"
		emptyText="Nothing has happened yet."
		renderItem={row}
		isSectionHeader={(entry) => entry.kind === "header"}
	/>
</div>

<div class="mt-6 w-full max-w-[46rem] space-y-2">
	<SpeechBubble speaker="Visitor" text="One short line." />
	<SpeechBubble speaker="Visitor" continued text="A consecutive line from the same speaker." />
	<SpeechBubble speaker="You" outgoing text="My answer." />
</div>
