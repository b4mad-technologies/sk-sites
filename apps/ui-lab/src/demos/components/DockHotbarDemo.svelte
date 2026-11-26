<script lang="ts">
	import type { DockHotbarGroup, DockHotbarPip, DockHotbarUrgent } from "@spellkave/ui";
	import { DockHotbar } from "@spellkave/ui";

	let lastPick = $state("");
	let expanded = $state(false);

	function pick(id: string) {
		lastPick = id;
	}

	const pips: DockHotbarPip[] = [
		{ id: "action", label: "Action", state: "available", fraction: null },
		{ id: "bonus", label: "Bonus", state: "available", fraction: null },
		{ id: "reaction", label: "Reaction", state: "spent", fraction: null },
		{ id: "move", label: "Move", state: "partial", fraction: 0.4 },
	];

	// (1) Nothing selected: HERE + ME, digits carried across both groups.
	const noSelectionRows: DockHotbarGroup[][] = [
		[
			{ id: "here", label: "HERE", slots: [{ id: "look", label: "Look", key: "1" }, { id: "rest", label: "Rest", key: "2" }] },
			{
				id: "me",
				label: "ME",
				slots: [
					{ id: "dodge", label: "Dodge", key: "3" },
					{ id: "dash", label: "Dash", key: "4" },
					{ id: "hide", label: "Hide", key: "5" },
				],
			},
		],
	];

	// (2) A selection: the chosen thing's own group, one dimmed slot that
	// stays in place, and an overflow menu of generic checks.
	const selectionRows: DockHotbarGroup[][] = [
		[
			{
				id: "selection",
				label: "GOBLIN WARRIOR 1",
				slots: [
					{ id: "attack", label: "Attack", key: "1", accessibleLabel: "Melee Attack — Goblin Warrior 1" },
					{ id: "shove", label: "Shove", key: "2" },
					{ id: "speak", label: "Speak", key: "3", active: true },
					{ id: "whisper", label: "Whisper", key: "4" },
					{ id: "grapple", label: "Grapple", dimmed: true, dimmedReason: "No free hand" },
				],
				more: [
					{
						entries: [
							{ id: "check:perception", label: "Perception check" },
							{ id: "check:insight", label: "Insight check" },
						],
					},
				],
			},
		],
	];

	// (3) Expanded: three rows, keys only on the first.
	const expandedRows: DockHotbarGroup[][] = [
		[
			{
				id: "selection",
				label: "GOBLIN WARRIOR 1",
				slots: [
					{ id: "attack", label: "Attack", key: "1" },
					{ id: "shove", label: "Shove", key: "2" },
				],
			},
		],
		[{ id: "here", label: "HERE", slots: [{ id: "look", label: "Look" }, { id: "rest", label: "Rest" }] }],
		[
			{
				id: "me",
				label: "ME",
				slots: [
					{ id: "dodge", label: "Dodge" },
					{ id: "dash", label: "Dash" },
					{ id: "hide", label: "Hide" },
				],
			},
		],
	];

	// (4) Disabled/busy: the whole bar is inert while "Attack" is in flight.
	const busyRows: DockHotbarGroup[][] = [
		[
			{
				id: "selection",
				label: "GOBLIN WARRIOR 1",
				slots: [
					{ id: "attack", label: "Attack", pending: true },
					{ id: "shove", label: "Shove" },
				],
			},
		],
	];

	// (5) Urgent: a reaction window replaces the action rows. "Open again"
	// restarts the window so the draining bar can be watched more than once.
	const URGENT_TOTAL_MS = 6000;
	let urgentOpenedAt = $state(Date.now());
	let urgentNow = $state(Date.now());
	$effect(() => {
		const timer = setInterval(() => (urgentNow = Date.now()), 500);
		return () => clearInterval(timer);
	});
	const urgentRemaining = $derived(Math.max(0, URGENT_TOTAL_MS - (urgentNow - urgentOpenedAt)));
	const urgent = $derived<DockHotbarUrgent | null>(
		urgentRemaining === 0
			? null
			: {
					title: "A moment to react",
					text: "Cellar Rat 1 attacks Renn",
					remainingMs: urgentRemaining,
					totalMs: URGENT_TOTAL_MS,
					answers: [
						{ id: "reaction:react", label: "React", key: "1" },
						{ id: "reaction:pass", label: "Let it pass", key: "2" },
					],
				},
	);
	function reopenUrgent(): void {
		urgentOpenedAt = Date.now();
		urgentNow = urgentOpenedAt;
	}
</script>

<div class="grid w-full max-w-3xl gap-6">
	<div class="grid gap-1.5">
		<div
			class="rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2"
		>
			<DockHotbar rows={noSelectionRows} {pips} onSelect={pick} />
		</div>
		<p class="text-xs text-[color:var(--muted-foreground)]">
			Nothing selected: the HERE and ME groups, digits 1–5, and the resource strip leading the
			row.
		</p>
	</div>

	<div class="grid gap-1.5">
		<div
			class="rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2"
		>
			<DockHotbar rows={selectionRows} onSelect={pick} />
		</div>
		<p class="text-xs text-[color:var(--muted-foreground)]">
			A selection: "Speak" is active (it set the composer's mode), "Grapple" is dimmed but stays
			in place, and "…" opens a menu of generic checks.
		</p>
	</div>

	<div class="grid gap-1.5">
		<div
			class="rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2"
		>
			<DockHotbar
				rows={expanded ? expandedRows : selectionRows}
				{expanded}
				onToggleExpanded={() => (expanded = !expanded)}
				onSelect={pick}
			>
				{#snippet trailing()}
					<button
						type="button"
						class="rounded-[0.375rem] border border-[color:var(--border)] bg-[color:var(--background)] px-2 text-xs leading-5 text-[color:var(--foreground)] hover:bg-[color:var(--muted-surface)]"
						onclick={() => pick("end-turn")}>End turn</button
					>
				{/snippet}
			</DockHotbar>
		</div>
		<p class="text-xs text-[color:var(--muted-foreground)]">
			Pulled taller: selection, HERE, and ME each get their own row (keys only on the first). The
			▾/▴ toggle and "End turn" both sit right-aligned on the first row.
		</p>
	</div>

	<div class="grid gap-1.5">
		<div
			class="rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2"
		>
			<DockHotbar rows={busyRows} disabled onSelect={pick} />
		</div>
		<p class="text-xs text-[color:var(--muted-foreground)]">
			Disabled/busy: "Attack" is pending (aria-busy) and every slot is inert — but nothing looks
			dimmed, because a busy world is not the same fact as an action the target does not offer.
		</p>
	</div>

	<div class="grid gap-1.5">
		<div
			class="rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2"
		>
			<DockHotbar rows={selectionRows} {urgent} {pips} onSelect={pick} />
		</div>
		<p class="text-xs text-[color:var(--muted-foreground)]">
			Urgent: while the world holds a reaction window open, the row replaces every action row, so
			the digits on screen are the digits that answer. The bar drains with the window; the rows
			come back when it closes.
			<button type="button" class="underline" onclick={reopenUrgent}>Open again</button>
		</p>
	</div>

	<p data-testid="dock-hotbar-demo-result" class="text-sm text-[color:var(--muted-foreground)]">
		{#if lastPick}Last selected: <code>{lastPick}</code>{:else}Nothing selected yet.{/if}
	</p>
</div>
