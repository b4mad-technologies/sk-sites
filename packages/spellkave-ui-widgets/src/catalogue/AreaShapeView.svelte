<script lang="ts" module>
	import type { DocsRowEntryView, DocsRowField } from "./types";

	/**
	 * Normalize one `area_shape_definitions` row into the shared row shape.
	 *
	 * An area shape is the vocabulary a `ForEachActorInRadius` frame write
	 * picks from to describe an AoE — sphere, cone, line, cube, or a
	 * topological node-ball (`crates/spellkave-schema/src/lib.rs`'s "Item
	 * 29" doc comment). `parameter_schema_json` is a JSON object keyed by
	 * parameter name, valued by type hint (e.g. `{"radius_m":"f32"}`) — shown
	 * verbatim, in `<code>`, the same treatment `TraceKindView` gives
	 * `schema_json`. Real rows:
	 * `packages/spellkave-mechanics/fixtures/core/base/spatial.toml`
	 * (`core/area/sphere`, `core/area/cone`, `core/area/line`,
	 * `core/area/cube`, `core/area/node_ball`).
	 *
	 * No `display_name` column, so the title comes from the merged `title`
	 * field the owning page computes.
	 */
	export function areaShapeRowView(
		record: Record<string, unknown>,
		href: string | undefined,
		link: (ref: string) => string | undefined,
	): DocsRowEntryView {
		const text = (key: string): string | undefined => {
			const value = record[key];
			return typeof value === "string" && value !== "" ? value : undefined;
		};
		const ref = text("shape_id") ?? "";
		const fields: DocsRowField[] = [];
		const push = (label: string, value: string | undefined, options: { link?: boolean } = {}) => {
			if (value === undefined) return;
			const target = options.link ? link(value) : undefined;
			fields.push({ label, value, ...(options.link ? { code: true } : {}), ...(target ? { href: target } : {}) });
		};

		const schema = text("parameter_schema_json");
		if (schema !== undefined) fields.push({ label: "Parameters", value: schema, code: true });
		if (ref !== "") fields.push({ label: "Area Shape ID", value: ref, code: true });
		push("Owning bundle", text("bundle_id"));

		return {
			ref,
			title: text("title") ?? ref,
			kind_label: "Area shape",
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
	<article data-testid="area-shape-full">
		{#if showHeader}
			<EntryHeading {row} {chrome} />
			<DescriptionField description={row.description ?? ""} field="area_shape_definitions.description" />
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
