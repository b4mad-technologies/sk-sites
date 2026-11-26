<script lang="ts">
	import { ReferenceCard } from "@spellkave/ui";

	let {
		label = "Place",
		title,
		meta = "",
		snippet = "",
	}: {
		label?: string;
		title: string;
		meta?: string;
		snippet?: string;
	} = $props();
</script>

<div data-testid="hover-card">
	<ReferenceCard {label} {title} class="min-w-[12rem] max-w-[18rem]">
		{#if meta !== ""}
			<p class="text-xs text-muted-foreground">{meta}</p>
		{/if}
		{#if snippet !== ""}
			<p class="text-sm leading-snug">{snippet}</p>
		{/if}
	</ReferenceCard>
</div>
