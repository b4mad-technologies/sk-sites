<script lang="ts" module>
	import type { DocsRowEntryView, DocsRowField } from "./types";

	/**
	 * Normalize one `modifier_templates` row into the shared row shape.
	 *
	 * A modifier is "a numeric or categorical adjustment riding a channel"
	 * (row-kind-coverage.toml): `applies_to` names the axis it rides — a
	 * `modifier_target_definitions` id such as `srd/ac`, or a fixed scope
	 * like `ResolutionCheck` the target table also carries a row for — and
	 * `delta_kind` (the closed `ModifierDeltaTag` shape: `Advantage`,
	 * `Disadvantage`, `Plus`, `Times`, `FlatSet`, `Replace`) says HOW it
	 * adjusts that axis, while `modifier_expression_source` is the DSL that
	 * computes the actual amount. `predicate_source` is a separate gate: it
	 * decides whether the modifier composes at all, independent of what
	 * value it would contribute.
	 *
	 * `priority` (default `0`) and `replace_template_id` (default unset) are
	 * shown only when authored away from their boring default — measured:
	 * every fixture row leaves `replace_template_id` unset, so this field
	 * exists only for the day one is authored, not because the corpus
	 * exercises it today.
	 */
	export function modifierRowView(
		record: Record<string, unknown>,
		href: string | undefined,
		link: (ref: string) => string | undefined,
	): DocsRowEntryView {
		const text = (key: string): string | undefined => {
			const value = record[key];
			return typeof value === "string" && value !== "" ? value : undefined;
		};
		const ref = text("modifier_template_id") ?? "";
		const fields: DocsRowField[] = [];
		const push = (label: string, value: string | undefined, options: { link?: boolean } = {}) => {
			if (value === undefined) return;
			const target = options.link ? link(value) : undefined;
			fields.push({ label, value, code: options.link === true, ...(target ? { href: target } : {}) });
		};

		push("Applies to", text("applies_to"), { link: true });
		push("Modifier type", text("delta_kind"));
		push("Applies when", text("predicate_source"));
		push("Value expression", text("modifier_expression_source"));
		push("Replaces", text("replace_template_id"), { link: true });
		const priority = record.priority;
		if (typeof priority === "number" && priority !== 0) fields.push({ label: "Priority", value: String(priority) });
		if (ref !== "") fields.push({ label: "Modifier ID", value: ref, code: true });
		push("Owning bundle", text("bundle_id"));

		return {
			ref,
			title: text("display_name") ?? ref,
			kind_label: "Modifier",
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
	<article data-testid="modifier-full">
		{#if showHeader}
			<EntryHeading {row} {chrome} />
			<DescriptionField description={row.description ?? ""} field="modifier_templates.description" />
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
