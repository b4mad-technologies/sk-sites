<script lang="ts">
	import { Accordion, Button } from "@spellkave/ui";

	let accordionValue = $state("place");
</script>

{#snippet accordionSnippet()}
	<div class="flex flex-col gap-2">
		<p>Named bodies in this room are tappable. Snippets allow rich content like buttons:</p>
		<div class="flex items-center gap-2">
			<Button size="sm" variant="outline">Interact</Button>
		</div>
	</div>
{/snippet}

<div class="w-full max-w-lg">
	<Accordion
		items={[
			{ value: "place", title: "Place", content: "The current room is the home surface." },
			{ value: "people", title: "People", content: accordionSnippet },
			{ value: "disabled", title: "Later", content: "Hidden until the next rung.", disabled: true },
		]}
		bind:value={accordionValue}
	/>
</div>
