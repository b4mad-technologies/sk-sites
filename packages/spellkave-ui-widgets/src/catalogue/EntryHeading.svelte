<script lang="ts">
	/**
	 * The full view's heading: title, kind label, and ref. When embedded
	 * inside `CatalogueEntryPage` (`chrome=false`) the owning page has
	 * already rendered an identical title as its own page `<h1>` — like
	 * `ResourceView`/`SubjectView`/`TagView` today, the title is skipped
	 * rather than duplicated, and only the kind label · ref caption
	 * renders. When `chrome` is true, `DocsPageHeader` already shows the
	 * kind label as its description line, so the caption below it carries
	 * only the ref, not a repeat of the label.
	 */
	import { DocsPageHeader } from "@spellkave/ui";
	import type { DocsRowEntryView } from "./types";

	let { row, chrome = true }: { row: DocsRowEntryView; chrome?: boolean } = $props();
</script>

{#if chrome}
	<DocsPageHeader title={row.title} description={row.kind_label} />
	<p class="text-xs text-[color:var(--muted-foreground)]" data-testid="entry-heading-ref">
		<code>{row.ref}</code>
	</p>
{:else}
	<p class="text-xs text-[color:var(--muted-foreground)]" data-testid="entry-heading-ref">
		{row.kind_label} · <code>{row.ref}</code>
	</p>
{/if}
