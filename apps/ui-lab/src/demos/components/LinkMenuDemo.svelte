<script lang="ts">
	import { CodeBlock, LinkMenu } from "@spellkave/ui";

	// The real srd/str case from the catalogue: one id, two subjects.
	const strTargets = [
		{
			label: "Strength",
			kind: "Resources",
			href: "/docs/srd/playing-the-game/str",
		},
		{
			label: "Strength",
			kind: "Modifier targets",
			href: "/docs/srd/mechanics/modifier-targets/str",
		},
	];

	let lastPick = $state("");

	const finesse =
		"cond(actor.equipped_item('srd/slot/main-hand').has_tag('srd.weapon.property.finesse'), max(actor.effective('srd/str'), actor.effective('srd/dex')), actor.effective('srd/str'))";
</script>

<div class="grid w-full max-w-3xl gap-4">
	<CodeBlock
		>actor.effective(<LinkMenu
				items={strTargets}
				onSelect={(item) => (lastPick = item.href ?? "")}
				>'srd/str'</LinkMenu
			>)</CodeBlock
	>
	<p data-testid="link-menu-demo-result" class="text-sm text-[color:var(--muted-foreground)]">
		Click the quoted id to choose between the two pages that carry it.
		{#if lastPick}Last pick: <code>{lastPick}</code>{/if}
	</p>
	<CodeBlock>{finesse}</CodeBlock>
</div>
