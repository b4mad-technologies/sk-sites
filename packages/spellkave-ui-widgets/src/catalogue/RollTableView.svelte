<script lang="ts" module>
	import type { DocsRowEntryView, DocsRowField } from "./types";

	/**
	 * Normalize one `roll_tables` row into the shared row shape.
	 *
	 * A roll table is a weighted draw (loot rarity bands, quest and boss
	 * drops) — `result_kind` says what a drawn `result_ref` means (today
	 * always `"int"`, resolved against a host-side code catalogue such as
	 * `LOOT_CODE_CATALOG`; see `magic-items/loot-tables.toml`'s own header).
	 *
	 * `roll_table_entries` is classified `surface = "owner"` of this kind in
	 * `row-kind-coverage.toml` ("A table's rows are the table. Splitting them
	 * into 23 pages would explain nothing.") — it never gets its own
	 * catalogue page. This projector therefore reads ONLY the table's own
	 * row, matching the shared `RowProjector` signature every other kind
	 * uses; the owning page supplies the table's entries separately as the
	 * `entries` PROP on the component below (not through the projector), and
	 * the full view renders them as a real table.
	 *
	 * Measured over the corpus: `roll_tables` DOES carry a `display_name`
	 * column, on all 7 rows (`magic-items/loot-tables.toml`, the only source)
	 * — unlike the other four kinds in this batch, so this view reads
	 * `display_name` directly rather than the compiler-derived `title`
	 * fallback.
	 */
	export function rollTableRowView(
		record: Record<string, unknown>,
		href: string | undefined,
		link: (ref: string) => string | undefined,
	): DocsRowEntryView {
		const text = (key: string): string | undefined => {
			const value = record[key];
			return typeof value === "string" && value !== "" ? value : undefined;
		};
		const ref = text("roll_table_id") ?? "";
		const fields: DocsRowField[] = [];
		const push = (label: string, value: string | undefined) => {
			if (value === undefined) return;
			fields.push({ label, value });
		};

		push("Result kind", text("result_kind"));
		if (ref !== "") fields.push({ label: "Roll Table ID", value: ref, code: true });
		push("Owning bundle", text("bundle_id"));

		return {
			ref,
			title: text("display_name") ?? ref,
			kind_label: "Roll table",
			...(href ? { href } : {}),
			...(text("description") ? { description: text("description") as string } : {}),
			fields,
		};
	}

	/** Read one `roll_table_entries` row's display columns, tolerating a stray non-string value. */
	function entryText(entry: Record<string, unknown>, key: string): string {
		const value = entry[key];
		return typeof value === "string" || typeof value === "number" ? String(value) : "";
	}

	// Loop key: the row id, or its order and target when it has none. Computed
	// up front because Biome cannot parse a call inside a keyed loop.
	function entryKey(entry: Record<string, unknown>): string {
		const id = entry.roll_table_entry_id;
		return typeof id === "string"
			? id
			: `${entryText(entry, "authored_order")}-${entryText(entry, "result_ref")}`;
	}

	function orderOf(entry: Record<string, unknown>): number {
		const value = entry.authored_order;
		return typeof value === "number" ? value : Number.POSITIVE_INFINITY;
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
		entries = [],
	}: {
		row: DocsRowEntryView;
		view: "inline" | "compact" | "full";
		chrome?: boolean;
		sections?: { header?: boolean; details?: boolean };
		/**
		 * This table's own `roll_table_entries` rows, supplied by the owning
		 * page — `roll_table_entries` is `surface = "owner"` of `roll_tables`
		 * in row-kind-coverage.toml, so it never resolves through the `link`
		 * callback or gets a `ReferenceGroup` of its own. Rendered as a real
		 * table in the full view only, when given.
		 */
		entries?: readonly Record<string, unknown>[];
	} = $props();

	const showHeader = $derived(sections.header ?? true);
	const showDetails = $derived(sections.details ?? true);
	const reference = $derived({
		ref: row.ref,
		title: row.title,
		...(row.href ? { href: row.href } : {}),
		...(row.description ? { summary: firstSentence(row.description) } : {}),
	});
	const sortedEntries = $derived([...entries].sort((left, right) => orderOf(left) - orderOf(right)));
	const keyedEntries = $derived(sortedEntries.map((entry) => ({ entry, key: entryKey(entry) })));
</script>

{#if view === "inline"}
	<EntryInline entry={reference} />
{:else if view === "compact"}
	<EntryCompact {row} />
{:else}
	<article data-testid="roll-table-full">
		{#if showHeader}
			<EntryHeading {row} {chrome} />
			<DescriptionField description={row.description ?? ""} field="roll_tables.description" />
		{/if}
		{#if showDetails}
			<FieldList fields={row.fields} />
			{#if sortedEntries.length > 0}
				<section class="mt-6 max-w-[65ch]" data-testid="roll-table-entries">
					<h3 class="font-display text-lg font-medium">Entries ({sortedEntries.length})</h3>
					<div class="mt-2 overflow-x-auto">
						<table class="w-full border-collapse text-sm">
							<thead>
								<tr>
									<th class="border border-border bg-muted-surface px-2 py-1 text-left">#</th>
									<th class="border border-border bg-muted-surface px-2 py-1 text-left">Weight</th>
									<th class="border border-border bg-muted-surface px-2 py-1 text-left">Result</th>
								</tr>
							</thead>
							<tbody>
								{#each keyedEntries as { entry, key } (key)}
									<tr>
										<td class="border border-border px-2 py-1">{entryText(entry, "authored_order")}</td>
										<td class="border border-border px-2 py-1">{entryText(entry, "weight")}</td>
										<td class="border border-border px-2 py-1"><code>{entryText(entry, "result_ref")}</code></td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</section>
			{/if}
			{#each row.references ?? [] as group (group.label)}
				<ReferenceGroup {group} />
			{/each}
			{#each row.referenced_by ?? [] as group (group.label)}
				<ReferenceGroup {group} />
			{/each}
		{/if}
	</article>
{/if}
