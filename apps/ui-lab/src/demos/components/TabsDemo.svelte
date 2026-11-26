<script lang="ts">
	import { Button, Tabs } from "@spellkave/ui";
</script>

{#snippet tabsSnippet()}
	<div class="flex flex-col gap-2">
		<p>Keep the Button API stable; choose variant and size, not a new one-off component.</p>
		<div class="flex items-center gap-2">
			<Button size="sm" variant="secondary">Snippet action</Button>
		</div>
	</div>
{/snippet}

<div class="w-full max-w-lg">
	<Tabs
		items={[
			{ value: "tokens", label: "Tokens", content: "Semantic tokens stay shared so the same values drive every surface." },
			{ value: "buttons", label: "Buttons", content: tabsSnippet },
			{
				value: "primitives",
				label: "Primitives",
				content: "Tabs and Checkbox centralize keyboard, focus, and ARIA behavior in one wrapper.",
			},
			{
				value: "disabled",
				label: "Disabled",
				content: "Disabled stays visible but inert. Never use it to hide a state that needs explanation.",
				disabled: true,
			},
		]}
		ariaLabel="UI lab guidance"
	/>
</div>
