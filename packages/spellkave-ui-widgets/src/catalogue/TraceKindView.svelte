<script lang="ts" module>
	import type { DocsRowEntryView, DocsRowField } from "./types";

	/**
	 * Normalize one `trace_kind_definitions` row into the shared row shape.
	 *
	 * A trace kind is the DEFINITION of a mark something leaves behind in a
	 * place — a scent, a scuff, a spoken utterance's own anchor — read by
	 * `spellkave_traces`/`spellkave_trace_detail` player-facing perception
	 * tools. `location_kinds` says what kind of place a trace of this kind can
	 * be anchored to; `perceptible_for_ticks` says how long it lingers once
	 * left. That second column has three distinct readings worth spelling
	 * out rather than printing the raw number: omitted means a standing mark
	 * that lasts until something removes it, `0` means the trace exists only
	 * for the instant it is emitted (the pattern `srd/speech` itself uses —
	 * overhearing falls out of being nearby while it is spoken, not from a
	 * lingering mark), and any other value is a real countdown.
	 *
	 * `trace_kind_definitions` has no `display_name` column — the title comes
	 * from the merged `title` field the owning page already computes.
	 */
	export function traceKindRowView(
		record: Record<string, unknown>,
		href: string | undefined,
		link: (ref: string) => string | undefined,
	): DocsRowEntryView {
		const text = (key: string): string | undefined => {
			const value = record[key];
			return typeof value === "string" && value !== "" ? value : undefined;
		};
		const ref = text("kind_id") ?? "";
		const fields: DocsRowField[] = [];
		const push = (label: string, value: string | undefined, options: { link?: boolean } = {}) => {
			if (value === undefined) return;
			const target = options.link ? link(value) : undefined;
			fields.push({ label, value, ...(options.link ? { code: true } : {}), ...(target ? { href: target } : {}) });
		};

		push("Anchored to", text("location_kinds"));

		const ticks = record.perceptible_for_ticks;
		const perceptible =
			typeof ticks === "number"
				? ticks === 0
					? "Only while it happens — no lingering mark"
					: `${ticks} ticks`
				: "Standing — lasts until removed";
		fields.push({ label: "Perceptible for", value: perceptible });

		const schema = text("schema_json");
		if (schema !== undefined) fields.push({ label: "Schema", value: schema, code: true });
		if (ref !== "") fields.push({ label: "Trace kind ID", value: ref, code: true });
		push("Owning bundle", text("bundle_id"));

		return {
			ref,
			title: text("title") ?? ref,
			kind_label: "Trace kind",
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
	<article data-testid="trace-kind-full">
		{#if showHeader}
			<EntryHeading {row} {chrome} />
			<DescriptionField description={row.description ?? ""} field="trace_kind_definitions.description" />
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
