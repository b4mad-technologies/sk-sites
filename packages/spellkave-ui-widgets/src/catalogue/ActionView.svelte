<script lang="ts" module>
	import type { DocsRowEntryView, DocsRowField } from "./types";

	/**
	 * Normalize one `action_definitions` row into the shared row shape.
	 *
	 * The per-kind knowledge lives HERE, beside the markup that renders it:
	 * which column is the title, which are references, and what a reader
	 * should call each one. That is the whole reason this is a component per
	 * row kind rather than one generic renderer driven by field metadata — a
	 * generic list would print `on_success` and leave the reader to guess.
	 *
	 * Labels follow the vocabulary the authoring docs already fixed, from
	 * `packages/spellkave-world-author/docs/patterns/offer-vs-resolution-roll.md`:
	 * an action is the RESOLUTION stage, its affordance the OFFER, and what it
	 * points at on success or failure the CONSEQUENCE. No reader-side synonyms.
	 */
	export function actionRowView(
		record: Record<string, unknown>,
		href: string | undefined,
		link: (ref: string) => string | undefined,
	): DocsRowEntryView {
		const text = (key: string): string | undefined => {
			const value = record[key];
			return typeof value === "string" && value !== "" ? value : undefined;
		};
		const ref = text("action_id") ?? "";
		const fields: DocsRowField[] = [];
		const push = (label: string, value: string | undefined, options: { link?: boolean } = {}) => {
			if (value === undefined) return;
			const target = options.link ? link(value) : undefined;
			fields.push({ label, value, code: options.link === true, ...(target ? { href: target } : {}) });
		};

		push("Consequence on success", text("on_success"), { link: true });
		push("Consequence on failure", text("on_failure"), { link: true });
		push("Requires capability", text("required_capability"), { link: true });
		push("Spends", text("spends_channel"), { link: true });
		push("Resolution", text("resolution_mode"));
		push("Resolution scope", text("resolution_scope"), { link: true });
		push("Resolution predicate", text("resolution_predicate_source"));
		// Reaction columns are empty on an ordinary action; showing them anyway
		// would pad every one of the 343 action pages with three blank rows.
		push("Reaction trigger", text("reaction_trigger"));
		push("Reaction eligibility", text("reaction_eligibility"));
		const window = record.reaction_window_ms;
		if (typeof window === "number" && window > 0)
			fields.push({ label: "Reaction window", value: `${window / 1000} s` });
		const cost = record.cost_time_ms;
		if (typeof cost === "number" && cost > 0)
			fields.push({ label: "Time cost", value: `${cost} ms` });
		if (ref !== "") fields.push({ label: "Action ID", value: ref, code: true });
		push("Owning bundle", text("bundle_id"));

		return {
			ref,
			title: text("display_name") ?? ref,
			kind_label: "Action",
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
		/**
		 * The same header/details split `ResourceView`, `SubjectView` and
		 * `TagView` take, so an entry page can lead with the description and
		 * defer the identity rows below the related-entry blocks.
		 */
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
	<article data-testid="action-full">
		{#if showHeader}
			<EntryHeading {row} {chrome} />
			<DescriptionField description={row.description ?? ""} field="action_definitions.description" />
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
