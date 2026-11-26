<script lang="ts">
	import {
		ActionMenu,
		type ActionMenuEntry,
		type InfoCardData,
		InfoCardProvider,
		type InfoCardResolve,
		InfoLink,
	} from "@spellkave/ui";

	let openDelay = $state(300);
	let pinDwell = $state(600);

	// Information and actions are two different shapes on the same name:
	// InfoLink/InfoCard stay information-only (see their own contract) —
	// this ⋯ icon is a SEPARATE, plain bits-ui DropdownMenu (`ActionMenu`,
	// packages/spellkave-ui/src/action-menu/) sitting next to the name, not
	// inside the card. Only present occupants (the two goblins, the
	// captain) get the icon; a rumor, a report, or a ledger has none.
	const SKILLS = [
		"Acrobatics",
		"Animal Handling",
		"Arcana",
		"Athletics",
		"Deception",
		"History",
		"Insight",
		"Intimidation",
		"Investigation",
		"Medicine",
		"Nature",
		"Perception",
		"Performance",
		"Persuasion",
		"Religion",
		"Sleight of Hand",
		"Stealth",
		"Survival",
		"Strength",
		"Dexterity",
	];

	function actionsFor(name: string): ActionMenuEntry[] {
		return [
			{ id: "attack", label: "Attack" },
			{ id: "speak-to", label: `Speak to ${name}` },
			{
				id: "checks",
				label: "Checks",
				submenu: SKILLS.map((skill) => ({ id: `check:${skill}`, label: `Check: ${skill}` })),
			},
			{ id: "recruit", label: "Recruit", disabled: true, hint: "Hostile" },
		];
	}

	// At most one of {info-card stack, one action menu} is open at a time —
	// the two shapes intentionally do not coexist. `openMenuFor` names which
	// occupant's ActionMenu (if any) is open; InfoCardProvider's own
	// `open`/`onOpenChange` (presentation-only bookkeeping, not an action)
	// is the other half of the same rule.
	let infoCardOpen = $state(false);
	let openMenuFor = $state<string | null>(null);
	let lastAction = $state("");

	function onMenuOpenChange(occupant: string, open: boolean) {
		openMenuFor = open ? occupant : null;
		if (open) infoCardOpen = false;
	}

	function onInfoCardOpenChange(open: boolean) {
		infoCardOpen = open;
		if (open) openMenuFor = null;
	}

	function onAction(occupant: string, actionId: string) {
		lastAction = `${actionId} → ${occupant}`;
	}

	// Fake data only — this mock exists to judge the chained-card interaction
	// before any real Play reference/lookup is wired behind `resolve`.
	const DATA: Record<string, InfoCardData> = {
		"goblin-1": {
			title: "Goblin Warrior 1",
			kind: "Creature (this world)",
			image: { src: "https://placehold.co/96x96/1a2943/efe6cf?text=Gob", alt: "" },
			summary: "One of two raiders blocking the east road out of the hamlet.",
			facts: [
				{ label: "Faction", value: "Goblin war band" },
				{ label: "Conditions", value: "None" },
			],
			body: [
				"A common ",
				{ refId: "goblin-warrior", text: "Goblin Warrior" },
				", armed like its twin.",
			],
		},
		"goblin-2": {
			title: "Goblin Warrior 2",
			kind: "Creature (this world)",
			image: { src: "https://placehold.co/96x96/1a2943/efe6cf?text=Gob", alt: "" },
			summary: "Keeping watch from the ditch beside the road.",
			facts: [
				{ label: "Faction", value: "Goblin war band" },
				{ label: "Conditions", value: "None" },
			],
			body: ["Also a ", { refId: "goblin-warrior", text: "Goblin Warrior" }, "."],
		},
		"goblin-warrior": {
			title: "Goblin Warrior",
			kind: "Monster (SRD)",
			facts: [
				{ label: "AC", value: "15" },
				{ label: "HP", value: "11 (2d8+2)" },
				{ label: "CR", value: "1/8" },
			],
			body: [
				"Small, nimble, and lightly armored. Has ",
				{ refId: "nimble-escape", text: "Nimble Escape" },
				" and attacks with a ",
				{ refId: "scimitar", text: "Scimitar" },
				".",
			],
		},
		"nimble-escape": {
			title: "Nimble Escape",
			kind: "Trait",
			facts: [{ label: "Type", value: "Special trait" }],
			body: [
				"Can take the ",
				{ refId: "disengage", text: "Disengage" },
				" or Hide action as a ",
				{ refId: "bonus-action", text: "bonus action" },
				" on each of its turns.",
			],
		},
		disengage: {
			title: "Disengage",
			kind: "Action (SRD)",
			facts: [{ label: "Type", value: "Action" }],
			summary: "Your movement doesn't provoke opportunity attacks for the rest of the turn.",
		},
		"bonus-action": {
			title: "Bonus Action",
			kind: "Rule (SRD)",
			summary:
				"An additional action some class features, spells, and other abilities let you take. You get only one per turn, no matter how many features grant one.",
			footerHref: "/docs/srd/playing-the-game/bonus-action",
		},
		scimitar: {
			title: "Scimitar",
			kind: "Item (SRD)",
			facts: [
				{ label: "Damage", value: "1d6 slashing" },
				{ label: "Properties", value: "Finesse, Light" },
			],
			summary: "A light, curved blade favored by quick attackers.",
		},
		ysolde: {
			title: "Captain Ysolde",
			kind: "NPC (this world)",
			image: { src: "https://placehold.co/96x96/1a2943/efe6cf?text=Y", alt: "" },
			summary: "Garrison captain, watching the gate warily since the raiders showed up.",
			facts: [
				{ label: "Role", value: "Garrison captain" },
				{ label: "Disposition", value: "Wary" },
			],
		},
		"slow-report": {
			title: "Scout's Report",
			kind: "Rumor (this world)",
			summary: "A rider came in from the north road an hour ago, out of breath.",
		},
	};

	const resolve: InfoCardResolve = async (refId) => {
		if (refId === "broken-ledger") {
			await new Promise((r) => setTimeout(r, 200));
			throw new Error("simulated network failure");
		}
		if (refId === "missing-rumor") return null;
		if (refId === "slow-report") {
			await new Promise((r) => setTimeout(r, 800));
			return DATA[refId] ?? null;
		}
		return DATA[refId] ?? null;
	};
</script>

<div class="grid w-full max-w-2xl gap-6">
	<div class="grid gap-4 sm:grid-cols-2">
		<label class="grid gap-1 text-xs text-[color:var(--muted-foreground)]">
			<span class="sk-label">Hover-to-preview delay: {openDelay}ms</span>
			<input type="range" min="0" max="1000" step="50" bind:value={openDelay} />
		</label>
		<label class="grid gap-1 text-xs text-[color:var(--muted-foreground)]">
			<span class="sk-label">Hover-to-pin dwell: {pinDwell}ms</span>
			<input type="range" min="100" max="1500" step="50" bind:value={pinDwell} />
		</label>
	</div>

	<p class="text-xs text-[color:var(--muted-foreground)]">
		Three rules to try: a chained card with no room beside its parent cascades
		down just far enough to keep the parent's title visible; hovering a link
		that would close a pinned card does nothing — only a click replaces it;
		scrolling the box below leaves pinned cards exactly where they are and
		only closes an unpinned preview.
	</p>

	<InfoCardProvider
		{resolve}
		{openDelay}
		{pinDwell}
		open={infoCardOpen}
		onOpenChange={onInfoCardOpenChange}
	>
		<div
			data-testid="info-card-demo-scroll"
			class="max-h-40 overflow-y-auto rounded-[var(--radius)] border border-[color:var(--border)] p-4"
		>
			<p class="text-sm leading-6 text-[color:var(--muted-foreground)]">
				(Scroll this box — pin a card first, then scroll: it stays put rather
				than chase the anchor. An unpinned hover preview still closes.)
			</p>
			<p class="mt-2 text-sm leading-7">
				<span class="inline-flex items-center gap-0.5">
					<InfoLink refId="goblin-1">Goblin Warrior 1</InfoLink>
					<ActionMenu
						label="Actions for Goblin Warrior 1"
						items={actionsFor("Goblin Warrior 1")}
						open={openMenuFor === "goblin-1"}
						onOpenChange={(next) => onMenuOpenChange("goblin-1", next)}
						onSelect={(id) => onAction("Goblin Warrior 1", id)}
					/>
				</span>
				and
				<span class="inline-flex items-center gap-0.5">
					<InfoLink refId="goblin-2">Goblin Warrior 2</InfoLink>
					<ActionMenu
						label="Actions for Goblin Warrior 2"
						items={actionsFor("Goblin Warrior 2")}
						open={openMenuFor === "goblin-2"}
						onOpenChange={(next) => onMenuOpenChange("goblin-2", next)}
						onSelect={(id) => onAction("Goblin Warrior 2", id)}
					/>
				</span>
				are nearby.
				<span class="inline-flex items-center gap-0.5">
					<InfoLink refId="ysolde">Captain Ysolde</InfoLink>
					<ActionMenu
						label="Actions for Captain Ysolde"
						items={actionsFor("Captain Ysolde")}
						open={openMenuFor === "ysolde"}
						onOpenChange={(next) => onMenuOpenChange("ysolde", next)}
						onSelect={(id) => onAction("Captain Ysolde", id)}
					/>
				</span>
				nods from the gate. A <InfoLink refId="slow-report">scout's report</InfoLink>
				just came in. There's also a
				<InfoLink refId="missing-rumor">half-remembered rumor</InfoLink>
				and a <InfoLink refId="broken-ledger">damaged supply ledger</InfoLink> nobody
				can quite read — none of these three has an action icon; they aren't occupants.
			</p>
			<p class="mt-4 text-sm leading-6 text-[color:var(--muted-foreground)]">
				Padding so the box above actually scrolls: the far raiders keep to the ditch,
				the gate stays shut, and the hamlet waits.
			</p>
		</div>
	</InfoCardProvider>

	<p class="text-xs text-[color:var(--muted-foreground)]">
		Chain: Goblin Warrior 1 → Goblin Warrior (rules) → Nimble Escape → Disengage / Bonus
		Action — four levels. Scout's report loads slowly; the rumor is not found; the ledger
		fails.
	</p>

	<p data-testid="info-card-demo-action-log" class="text-sm text-[color:var(--muted-foreground)]">
		{#if lastAction}Last action: <code>{lastAction}</code>{:else}No action chosen yet.{/if}
	</p>
</div>
