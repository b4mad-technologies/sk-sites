<script lang="ts" module>
	import type { DocsRowEntryView, DocsRowField } from "./types";

	/**
	 * Normalize one `consequence_templates` row into the shared row shape.
	 *
	 * A consequence is what actually changes (row-kind-coverage.toml) — the
	 * third stage of `offer-vs-resolution-roll.md`, after the affordance
	 * (offer) and the action (resolution). Its own mutations are the sibling
	 * `consequence_frame_writes` rows, rendered on this same page by
	 * `FrameWriteView` (that kind is `surface = "owner"` of this one in
	 * `row-kind-coverage.toml`) — this component only carries the
	 * consequence's own columns, never its frame writes.
	 *
	 * Measured over the corpus: `consequence_templates` carries NO
	 * `display_name` column at all — 478 of 478 rows. Its title is derived
	 * upstream (the same "no display_name column" shape `tag_value_definitions`
	 * already has, resolved there via a compiler-derived `entry.title`) and
	 * is expected to arrive as `record.title` — this projector must not read
	 * `record.display_name`, which never exists for this kind.
	 */
	export function consequenceRowView(
		record: Record<string, unknown>,
		href: string | undefined,
		link: (ref: string) => string | undefined,
	): DocsRowEntryView {
		const text = (key: string): string | undefined => {
			const value = record[key];
			return typeof value === "string" && value !== "" ? value : undefined;
		};
		const ref = text("template_id") ?? "";
		const fields: DocsRowField[] = [];
		const push = (label: string, value: string | undefined, options: { code?: boolean } = {}) => {
			if (value === undefined) return;
			fields.push({ label, value, ...(options.code ? { code: true } : {}) });
		};

		push("Effects", text("effect_refs_csv"), { code: true });
		push("Trace emissions", text("traces_json"), { code: true });
		if (ref !== "") fields.push({ label: "Consequence ID", value: ref, code: true });
		push("Owning bundle", text("bundle_id"));

		return {
			ref,
			title: text("title") ?? ref,
			kind_label: "Consequence",
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
	<article data-testid="consequence-full">
		{#if showHeader}
			<EntryHeading {row} {chrome} />
			<DescriptionField description={row.description ?? ""} field="consequence_templates.description" />
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
