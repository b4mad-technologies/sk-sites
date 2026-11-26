<script lang="ts" module>
	import type { DocsRowEntryView, DocsRowField } from "./types";

	/**
	 * Normalize one `substrate_definitions` row into the shared row shape.
	 *
	 * A substrate names a spatial medium (`outdoor`, say — referenced by
	 * `substrate_id` on `place_graphs`/`place_nodes` rows across the
	 * fixtures) and declares which `coordinate_kind_definitions` row
	 * governs its coordinates via the required FK `coordinate_kind_id` —
	 * linked, since `coordinate_kind_definitions` is itself a catalogued
	 * kind (`CoordinateKindView`).
	 *
	 * No authored `substrate_definitions` rows exist anywhere in the repo
	 * today (`substrate_id = "outdoor"` is referenced by many rows but
	 * never itself declared) — this projector is built directly against
	 * `crates/spellkave-schema/src/lib.rs`'s `SubstrateDefinitionRow`
	 * (`substrate_id`, `bundle_id`, `coordinate_kind_id`, `description`),
	 * per the task's "confirm from the struct when fixtures are empty"
	 * guidance.
	 *
	 * No `display_name` column, so the title comes from the merged `title`
	 * field the owning page computes.
	 */
	export function substrateRowView(
		record: Record<string, unknown>,
		href: string | undefined,
		link: (ref: string) => string | undefined,
	): DocsRowEntryView {
		const text = (key: string): string | undefined => {
			const value = record[key];
			return typeof value === "string" && value !== "" ? value : undefined;
		};
		const ref = text("substrate_id") ?? "";
		const fields: DocsRowField[] = [];
		const push = (label: string, value: string | undefined, options: { link?: boolean } = {}) => {
			if (value === undefined) return;
			const target = options.link ? link(value) : undefined;
			fields.push({ label, value, ...(options.link ? { code: true } : {}), ...(target ? { href: target } : {}) });
		};

		push("Coordinate kind", text("coordinate_kind_id"), { link: true });
		if (ref !== "") fields.push({ label: "Substrate ID", value: ref, code: true });
		push("Owning bundle", text("bundle_id"));

		return {
			ref,
			title: text("title") ?? ref,
			kind_label: "Substrate",
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
	<article data-testid="substrate-full">
		{#if showHeader}
			<EntryHeading {row} {chrome} />
			<DescriptionField description={row.description ?? ""} field="substrate_definitions.description" />
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
