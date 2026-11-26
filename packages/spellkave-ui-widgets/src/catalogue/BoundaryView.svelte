<script lang="ts" module>
	import type { DocsRowEntryView, DocsRowField } from "./types";

	/**
	 * Normalize one `boundary_definitions` row into the shared row shape.
	 *
	 * A boundary is the named moment (`turn_start`, `short_rest`, a modder's
	 * own `encounter_end`) an economy channel resets on or a consequence
	 * fires against — see `crates/spellkave-schema/src/lib.rs`'s
	 * `BoundaryDefinitionRow` doc comment. It is validated-only, never
	 * applied to a server table (no runtime consumer reads it back), so the
	 * whole row is just its own identity plus a description.
	 *
	 * The struct's identity field is literally `id`
	 * (`BoundaryDefinitionRow.id`, confirmed against every authored row —
	 * `packages/spellkave-srd-cc/fixtures/base/playing-the-game/action-economy.toml`
	 * and `packages/spellkave-mechanics/fixtures/core/base/action-economy.toml`
	 * both write `id = "..."`), NOT `boundary_id`. `row-kind-coverage.toml`
	 * declares `id_field = "boundary_id"` for this kind, which does not
	 * match the data — worth a separate look, out of scope here. This
	 * projector reads the real column, `id`.
	 *
	 * No `display_name` column, so the title comes from the merged `title`
	 * field the owning page computes, same fallback `TraceKindView` uses.
	 */
	export function boundaryRowView(
		record: Record<string, unknown>,
		href: string | undefined,
		link: (ref: string) => string | undefined,
	): DocsRowEntryView {
		const text = (key: string): string | undefined => {
			const value = record[key];
			return typeof value === "string" && value !== "" ? value : undefined;
		};
		const ref = text("id") ?? "";
		const fields: DocsRowField[] = [];
		const push = (label: string, value: string | undefined, options: { link?: boolean } = {}) => {
			if (value === undefined) return;
			const target = options.link ? link(value) : undefined;
			fields.push({ label, value, ...(options.link ? { code: true } : {}), ...(target ? { href: target } : {}) });
		};

		if (ref !== "") fields.push({ label: "Boundary ID", value: ref, code: true });
		push("Owning bundle", text("bundle_id"));

		return {
			ref,
			title: text("title") ?? ref,
			kind_label: "Boundary",
			...(href ? { href } : {}),
			...(text("description") ? { description: text("description") as string } : {}),
			fields,
		};
	}
</script>

<script lang="ts">
	import DescriptionField from "./DescriptionField.svelte";
	import EntryCompact from "./EntryCompact.svelte";
	import EntryHeading from "./EntryHeading.svelte";
	import EntryInline from "./EntryInline.svelte";
	import FieldList from "./FieldList.svelte";
	import { firstSentence } from "./first-sentence";
	import ReferenceGroup from "./ReferenceGroup.svelte";

	let {
		row,
		view,
		chrome = true,
		sections = {},
	}: {
		row: DocsRowEntryView;
		view: "inline" | "compact" | "full";
		chrome?: boolean;
		sections?: { header?: boolean; details?: boolean };
	} = $props();

	const showHeader = $derived(sections.header ?? true);
	const showDetails = $derived(sections.details ?? true);
	const reference = $derived({
		ref: row.ref,
		title: row.title,
		...(row.href ? { href: row.href } : {}),
		...(row.description ? { summary: firstSentence(row.description) } : {}),
	});
</script>

{#if view === "inline"}
	<EntryInline entry={reference} />
{:else if view === "compact"}
	<EntryCompact {row} />
{:else}
	<article data-testid="boundary-full">
		{#if showHeader}
			<EntryHeading {row} {chrome} />
			<DescriptionField description={row.description ?? ""} field="boundary_definitions.description" />
		{/if}
		{#if showDetails}
			<FieldList fields={row.fields} />
			{#each row.references ?? [] as group (group.label)}
				<ReferenceGroup {group} />
			{/each}
			{#each row.referenced_by ?? [] as group (group.label)}
				<ReferenceGroup {group} />
			{/each}
		{/if}
	</article>
{/if}
