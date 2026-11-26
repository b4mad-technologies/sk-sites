<script lang="ts" module>
	import type { DocsRowEntryView, DocsRowField } from "./types";

	/**
	 * Normalize one `stacking_discipline_definitions` row into the shared row
	 * shape.
	 *
	 * A stacking discipline is the rule a `condition_definitions` row points
	 * at (via its own `stacking_rule` column) to say what happens when the
	 * SAME condition lands on a target more than once — does a second Half
	 * Cover application add a second row, or refresh the one that is already
	 * there? `stack_count_outcome_source` and `expires_at_tick_outcome_source`
	 * are DSL expression sources (not ids — never linked, matching how
	 * `ActionView` renders `resolution_predicate_source`) read off the
	 * applying outcome to decide the stacked count and the new expiry tick.
	 * Only one row exists in the whole corpus today
	 * (`srd/stacking/single` — cover-conditions.toml), but it names a real
	 * rule two conditions already reference, not a placeholder.
	 */
	export function stackingDisciplineRowView(
		record: Record<string, unknown>,
		href: string | undefined,
		link: (ref: string) => string | undefined,
	): DocsRowEntryView {
		const text = (key: string): string | undefined => {
			const value = record[key];
			return typeof value === "string" && value !== "" ? value : undefined;
		};
		const ref = text("discipline_id") ?? "";
		const fields: DocsRowField[] = [];
		const push = (label: string, value: string | undefined, options: { link?: boolean } = {}) => {
			if (value === undefined) return;
			const target = options.link ? link(value) : undefined;
			fields.push({ label, value, ...(options.link ? { code: true } : {}), ...(target ? { href: target } : {}) });
		};

		push("Stack count source", text("stack_count_outcome_source"));
		push("Expiry tick source", text("expires_at_tick_outcome_source"));
		if (ref !== "") fields.push({ label: "Discipline ID", value: ref, code: true });
		push("Owning bundle", text("bundle_id"));

		return {
			ref,
			title: text("display_name") ?? ref,
			kind_label: "Stacking discipline",
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
	<article data-testid="stacking-discipline-full">
		{#if showHeader}
			<EntryHeading {row} {chrome} />
			<DescriptionField
				description={row.description ?? ""}
				field="stacking_discipline_definitions.description"
			/>
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
