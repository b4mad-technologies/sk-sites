<script lang="ts" module>
	import type { DocsRowEntryView, DocsRowField } from "./types";

	/**
	 * Normalize one `modifier_target_definitions` row into the shared row
	 * shape.
	 *
	 * A modifier target is "what a modifier is allowed to aim at"
	 * (row-kind-coverage.toml) — the axis `ModifierView`'s own "Applies to"
	 * field points at (`modifier_templates.applies_to`). Measured over the
	 * corpus (16 rows): the schema (`ModifierTargetDefinitionRow`) carries
	 * only `shape` beyond identity and description — the fold algebra
	 * (`Numeric`, `Mode`, or `Reference`; the manifest loader rejects any
	 * other value) a composing modifier must agree with. This row never
	 * points at another row itself — everything that references a target
	 * does so BY this row's own id, so there is nothing else to link out to.
	 */
	export function modifierTargetRowView(
		record: Record<string, unknown>,
		href: string | undefined,
		_link: (ref: string) => string | undefined,
	): DocsRowEntryView {
		const text = (key: string): string | undefined => {
			const value = record[key];
			return typeof value === "string" && value !== "" ? value : undefined;
		};
		const ref = text("target_id") ?? "";
		const fields: DocsRowField[] = [];
		const push = (label: string, value: string | undefined) => {
			if (value === undefined) return;
			fields.push({ label, value });
		};

		push("Value shape", text("shape"));
		if (ref !== "") fields.push({ label: "Target ID", value: ref, code: true });
		push("Owning bundle", text("bundle_id"));

		return {
			ref,
			title: text("display_name") ?? ref,
			kind_label: "Modifier target",
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
	<article data-testid="modifier-target-full">
		{#if showHeader}
			<EntryHeading {row} {chrome} />
			<DescriptionField description={row.description ?? ""} field="modifier_target_definitions.description" />
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
