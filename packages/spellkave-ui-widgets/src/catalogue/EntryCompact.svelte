<script lang="ts">
	/**
	 * Card-sized summary: title, kind label, description, and optional facts.
	 * Layout lives in `@spellkave/ui` ReferenceCard.
	 */
	import { ReferenceCard } from "@spellkave/ui";
	import { catalogueOpen } from "./navigate";
	import type { DocsRowEntryView } from "./types";

	let { row }: { row: DocsRowEntryView } = $props();
	const facts = $derived(row.fields.map((field) => ({ label: field.label, value: field.value })));
</script>

<div class="my-5 max-w-[65ch]" data-testid="entry-compact">
	<ReferenceCard
		href={row.href}
		title={row.title}
		label={row.kind_label}
		{facts}
		onNavigate={row.href ? (event) => catalogueOpen(row.href ?? "", event) : undefined}
	>
		{#if row.description}
			<p class="text-sm leading-snug">{row.description}</p>
		{/if}
	</ReferenceCard>
</div>
