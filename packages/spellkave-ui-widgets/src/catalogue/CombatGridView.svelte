<script lang="ts" module>
	import type { DocsRowEntryView, DocsRowField } from "./types";

	/**
	 * Normalize one `combat_grid_blueprints` row into the shared row shape.
	 *
	 * A combat grid blueprint is the map-view a scene's combat plays out on:
	 * its size, its cell scale, its adjacency rule (how a creature can step
	 * diagonally), and which affordance template drives an ordinary step
	 * across an edge. `topology` is authored as a raw string ("4"/"8") in the
	 * manifest; this view spells out what that means for a player standing
	 * on the grid rather than leaving the digit to guess at. `edge_overrides_json`
	 * carries per-edge exceptions (e.g. a difficult-terrain edge costing more
	 * than the blueprint's default) — most blueprints author none (`"[]"`),
	 * so an empty override list is treated the same as an unauthored field
	 * rather than printed as a blank JSON array.
	 *
	 * `display_name` IS a real column here, but not every row authors it
	 * (`srd/combat-grid/standard-10x10` does not) — falls back to the raw id.
	 */
	export function combatGridRowView(
		record: Record<string, unknown>,
		href: string | undefined,
		link: (ref: string) => string | undefined,
	): DocsRowEntryView {
		const text = (key: string): string | undefined => {
			const value = record[key];
			return typeof value === "string" && value !== "" ? value : undefined;
		};
		const ref = text("blueprint_id") ?? "";
		const fields: DocsRowField[] = [];
		const push = (label: string, value: string | undefined, options: { link?: boolean } = {}) => {
			if (value === undefined) return;
			const target = options.link ? link(value) : undefined;
			fields.push({ label, value, ...(options.link ? { code: true } : {}), ...(target ? { href: target } : {}) });
		};

		const width = record.width;
		const height = record.height;
		if (typeof width === "number" && typeof height === "number")
			fields.push({ label: "Grid size", value: `${width} × ${height} cells` });

		const cellSize = record.cell_size_m;
		if (typeof cellSize === "number")
			fields.push({ label: "Cell size", value: `${Math.round(cellSize * 100) / 100} m` });

		const topology = text("topology");
		if (topology !== undefined) {
			const adjacency =
				topology === "8"
					? "8-directional (diagonal steps allowed)"
					: topology === "4"
						? "4-directional (orthogonal steps only)"
						: topology;
			fields.push({ label: "Adjacency", value: adjacency });
		}

		push("Movement affordance", text("edge_affordance_template_id"), { link: true });

		const bindings = text("edge_affordance_bindings_json");
		if (bindings !== undefined) fields.push({ label: "Movement bindings", value: bindings, code: true });

		const overrides = text("edge_overrides_json");
		if (overrides !== undefined && overrides !== "[]")
			fields.push({ label: "Edge overrides", value: overrides, code: true });

		if (ref !== "") fields.push({ label: "Grid ID", value: ref, code: true });
		push("Owning bundle", text("bundle_id"));

		return {
			ref,
			title: text("display_name") ?? ref,
			kind_label: "Combat grid",
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
	<article data-testid="combat-grid-full">
		{#if showHeader}
			<EntryHeading {row} {chrome} />
			<DescriptionField description={row.description ?? ""} field="combat_grid_blueprints.description" />
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
