<script lang="ts" module>
	import type { DocsRowEntryView, DocsRowField } from "./types";

	/**
	 * Normalize one `location_definitions` row into the shared row shape.
	 *
	 * A location definition is a named place in the world hierarchy —
	 * `parent_def` nests it under another location (empty = root),
	 * `interior_graph_id` points at the `place_graphs` row that furnishes
	 * its interior when one exists, and `cell_res10`/`cell_res7`/`cell_res4`
	 * anchor it to an H3 cell at three resolutions when it has a
	 * geographic footprint. Real row:
	 * `packages/spellkave-mechanics/fixtures/core/base/locations.toml`
	 * (`core/spell_cave`) — every one of those four fields authored empty/0
	 * there, confirming 0 and `""` are the "unset" sentinels, not a real
	 * cell/graph: `text()` already drops empty strings, and the cell
	 * fields are shown only when non-zero, the same convention
	 * `ActionView` uses for `reaction_window_ms`/`cost_time_ms`.
	 *
	 * `display_name` IS present on this row, so the title reads it
	 * directly rather than falling back to a merged `title`.
	 */
	export function locationRowView(
		record: Record<string, unknown>,
		href: string | undefined,
		link: (ref: string) => string | undefined,
	): DocsRowEntryView {
		const text = (key: string): string | undefined => {
			const value = record[key];
			return typeof value === "string" && value !== "" ? value : undefined;
		};
		const ref = text("location_def_id") ?? "";
		const fields: DocsRowField[] = [];
		const push = (label: string, value: string | undefined, options: { link?: boolean } = {}) => {
			if (value === undefined) return;
			const target = options.link ? link(value) : undefined;
			fields.push({ label, value, ...(options.link ? { code: true } : {}), ...(target ? { href: target } : {}) });
		};

		push("Parent location", text("parent_def"), { link: true });
		push("Interior graph", text("interior_graph_id"), { link: true });

		const cell = (key: string, label: string) => {
			const value = record[key];
			if (typeof value === "number" && value > 0) fields.push({ label, value: String(value) });
		};
		cell("cell_res10", "H3 cell (resolution 10)");
		cell("cell_res7", "H3 cell (resolution 7)");
		cell("cell_res4", "H3 cell (resolution 4)");

		if (ref !== "") fields.push({ label: "Location ID", value: ref, code: true });
		push("Owning bundle", text("bundle_id"));

		return {
			ref,
			title: text("display_name") ?? ref,
			kind_label: "Location",
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
	<article data-testid="location-full">
		{#if showHeader}
			<EntryHeading {row} {chrome} />
			<DescriptionField description={row.description ?? ""} field="location_definitions.description" />
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
