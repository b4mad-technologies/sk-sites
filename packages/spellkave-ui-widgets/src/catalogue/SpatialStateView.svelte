<script lang="ts" module>
	import type { DocsRowEntryView, DocsRowField } from "./types";

	/**
	 * Normalize one `spatial_state_definitions` row into the shared row shape.
	 *
	 * A spatial state is a fact ATTACHED TO A PLACE rather than to an entity —
	 * a hazard marker, a difficult-terrain flag, an object's lock state.
	 * `value_type` says what shape the value takes, `writer_policy` says who
	 * is allowed to change it (world_interaction: a reducer-driven effect,
	 * not a manifest re-apply), `merge_rule` says what happens when two writes
	 * land on the same state, and `lod_policy` says how much of its history a
	 * reader keeps. `freshness_rule` is authored on most but not all rows
	 * (e.g. `srd/state/difficult_terrain` leaves it blank, meaning the state
	 * never expires on its own) — omitted rather than printed blank.
	 *
	 * `spatial_state_definitions` has no `display_name` column — the title
	 * comes from the merged `title` field the owning page already computes.
	 */
	export function spatialStateRowView(
		record: Record<string, unknown>,
		href: string | undefined,
		link: (ref: string) => string | undefined,
	): DocsRowEntryView {
		const text = (key: string): string | undefined => {
			const value = record[key];
			return typeof value === "string" && value !== "" ? value : undefined;
		};
		const ref = text("state_id") ?? "";
		const fields: DocsRowField[] = [];
		const push = (label: string, value: string | undefined, options: { link?: boolean } = {}) => {
			if (value === undefined) return;
			const target = options.link ? link(value) : undefined;
			fields.push({ label, value, ...(options.link ? { code: true } : {}), ...(target ? { href: target } : {}) });
		};

		push("Value type", text("value_type"));
		push("Who can write it", text("writer_policy"));
		push("Merge rule", text("merge_rule"));
		push("Detail retention", text("lod_policy"));
		push("Expires", text("freshness_rule"));
		if (ref !== "") fields.push({ label: "State ID", value: ref, code: true });
		push("Owning bundle", text("bundle_id"));

		return {
			ref,
			title: text("title") ?? ref,
			kind_label: "Spatial state",
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
	<article data-testid="spatial-state-full">
		{#if showHeader}
			<EntryHeading {row} {chrome} />
			<DescriptionField description={row.description ?? ""} field="spatial_state_definitions.description" />
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
