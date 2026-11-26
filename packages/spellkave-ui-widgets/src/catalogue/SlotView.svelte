<script lang="ts" module>
	import type { DocsRowEntryView, DocsRowField } from "./types";

	/**
	 * Normalize one `equipment_slot_definitions` row into the shared row
	 * shape.
	 *
	 * A slot is where a piece of equipment attaches — every armor/weapon
	 * `entity_definitions` row references one by
	 * `slot_compatibility_predicate` string, not a validated foreign key
	 * (see `equipment/armor-slots.toml`'s own doc comment: self-sufficiency,
	 * srd owns this vocabulary rather than depending on `core`).
	 *
	 * Measured over the corpus: `equipment_slot_definitions` carries NO
	 * `display_name` (or `description`) column at all — 3 of 3 rows, all in
	 * `equipment/armor-slots.toml`. Its title is derived upstream (the same
	 * shape `consequence_templates` already has — see `ConsequenceView`) and
	 * arrives as `record.title`. It DOES carry its own authored human name
	 * under `label` ("Chest", "Main Hand", "Off Hand") — shown here as its
	 * own field rather than assumed identical to the derived title, since a
	 * future slot id could derive a different title than its authored label.
	 * With no description column ever authored, this view follows
	 * `AffordanceView`'s convention and never renders a description block.
	 */
	export function slotRowView(
		record: Record<string, unknown>,
		href: string | undefined,
		link: (ref: string) => string | undefined,
	): DocsRowEntryView {
		const text = (key: string): string | undefined => {
			const value = record[key];
			return typeof value === "string" && value !== "" ? value : undefined;
		};
		const ref = text("slot_id") ?? "";
		const fields: DocsRowField[] = [];
		const push = (label: string, value: string | undefined, options: { link?: boolean } = {}) => {
			if (value === undefined) return;
			const target = options.link ? link(value) : undefined;
			fields.push({ label, value, ...(options.link ? { code: true } : {}), ...(target ? { href: target } : {}) });
		};

		push("Slot name", text("label"));
		push("Compatible equipment", text("default_compatibility_predicate"));
		if (ref !== "") fields.push({ label: "Slot ID", value: ref, code: true });
		push("Owning bundle", text("bundle_id"));

		return {
			ref,
			title: text("title") ?? ref,
			kind_label: "Equipment slot",
			...(href ? { href } : {}),
			fields,
		};
	}
</script>

<script lang="ts">
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
	<article data-testid="slot-full">
		{#if showHeader}
			<EntryHeading {row} {chrome} />
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
