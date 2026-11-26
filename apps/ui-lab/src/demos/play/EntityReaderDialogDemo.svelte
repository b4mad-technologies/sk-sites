<script lang="ts">
	import { EntityReaderDialog } from "@spellkave/ui-widgets";

	// sk-jay0.1.8.63.9: a scene target offering the 24 generic ability/skill
	// checks (packages/spellkave-srd-cc/src/chapters/playing-the-game/
	// generic-check-units.ts) alongside a handful of meaningful verbs buries
	// the latter in a flat wall of buttons — `isSecondaryVerb` collapses the
	// checks behind one closed disclosure. The host, not the widget, decides
	// what counts as "secondary" (here: the descriptor family `srd/check`).
	const checkSlugs = ["acrobatics", "arcana", "athletics", "insight", "perception", "stealth"];
	const bandit = {
		id: "e:5",
		description: "A wary bandit, quick to size up a mark.",
		facts: [{ id: "faction", label: "Faction", value: "Raiders" }],
		verbs: [
			{ id: "act:attack", label: "Attack", verb: "manipulate" },
			{ id: "act:speak-to", label: "Speak to", verb: "communicate" },
			...checkSlugs.map((slug) => ({
				id: `act:check-${slug}`,
				label: slug[0]?.toUpperCase() + slug.slice(1),
				verb: "manipulate",
				description: `Attempt a ${slug} check against this target.`,
			})),
		],
	};
	function isCheckVerb(verb: { id: string }): boolean {
		return verb.id.startsWith("act:check-");
	}
</script>

<div class="grid w-full gap-4 sm:grid-cols-[repeat(auto-fit,minmax(17rem,1fr))]">
	<EntityReaderDialog
		name="Goblin Warrior 1"
		selectedId="e:1"
		kindLabel="Creature"
		detail={{
			id: "e:1",
			description: "A wiry raider armed with a crude scimitar.",
			facts: [
				{ id: "faction", label: "Faction", value: "Raiders" },
				{ id: "condition", label: "Condition", value: "Bloodied" },
			],
			verbs: [{ id: "act:attack", label: "Attack", verb: "manipulate" }],
		}}
	>
		{#snippet reference()}
			<p class="sk-play-muted text-sm">
				Goblin Warrior — a common SRD raider (a stand-in for the live page's own
				public-reference fetch).
			</p>
		{/snippet}
	</EntityReaderDialog>
	<EntityReaderDialog
		name="Aldwin, keeper of the hearth-ledger"
		selectedId="e:4"
		detail={{
			id: "e:4",
			description: "The hearth-keeper, watchful and dry-humoured.",
			facts: [],
			verbs: [],
		}}
	/>
	<EntityReaderDialog name="Cellar Rat 1" selectedId="e:2" kindLabel="Creature" detail={null} />
	<EntityReaderDialog
		name="Cellar Rat 2"
		selectedId="e:3"
		kindLabel="Creature"
		detail={{ id: "e:3", facts: [], verbs: [], failed: true }}
	/>
	<EntityReaderDialog
		name="Bandit"
		selectedId="e:5"
		kindLabel="Creature"
		detail={bandit}
		isSecondaryVerb={isCheckVerb}
		secondaryVerbsLabel="Checks"
	/>
</div>
