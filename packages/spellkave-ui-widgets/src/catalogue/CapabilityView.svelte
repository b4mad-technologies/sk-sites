<script lang="ts" module>
	import type { DocsRowEntryView, DocsRowField } from "./types";

	/**
	 * Normalize one `capability_definitions` row into the shared row shape.
	 *
	 * A capability is "what an actor is permitted to do at all"
	 * (row-kind-coverage.toml) — the structural gate an affordance checks
	 * before it is even offered (`AffordanceView`'s own "Requires capability"
	 * field points here). This table itself carries almost none of the
	 * mechanism: it is an identity row for a permission, not the thing that
	 * grants or spends it. Measured over the corpus: the schema
	 * (`CapabilityDefinitionRow`) has exactly five columns beyond the row's
	 * own id/bundle — `actor_kind`, `display_name`, `description` and
	 * `default_visibility` — so there is nothing to link to from here; other
	 * rows point AT a capability, this row never points out.
	 *
	 * `default_visibility` (ADR-0120) is not a decorative default: it is the
	 * read-visibility a concrete grant inherits unless overridden, and the
	 * corpus carries both `"Public"` and `"Hidden"` values, so it is shown
	 * unconditionally rather than only-when-notable.
	 */
	export function capabilityRowView(
		record: Record<string, unknown>,
		href: string | undefined,
		link: (ref: string) => string | undefined,
	): DocsRowEntryView {
		const text = (key: string): string | undefined => {
			const value = record[key];
			return typeof value === "string" && value !== "" ? value : undefined;
		};
		const ref = text("capability_id") ?? "";
		const fields: DocsRowField[] = [];
		const push = (label: string, value: string | undefined) => {
			if (value === undefined) return;
			fields.push({ label, value });
		};

		push("Actor kind", text("actor_kind"));
		push("Default visibility", text("default_visibility"));
		if (ref !== "") fields.push({ label: "Capability ID", value: ref, code: true });
		push("Owning bundle", text("bundle_id"));

		return {
			ref,
			title: text("display_name") ?? ref,
			kind_label: "Capability",
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
	<article data-testid="capability-full">
		{#if showHeader}
			<EntryHeading {row} {chrome} />
			<DescriptionField description={row.description ?? ""} field="capability_definitions.description" />
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
