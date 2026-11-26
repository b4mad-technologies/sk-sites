<script lang="ts" module>
	import type { DocsRowEntryView, DocsRowField } from "./types";

	/**
	 * Normalize one `outcome_templates` row into the shared row shape.
	 *
	 * An outcome is what the world says happened once an action resolves
	 * (row-kind-coverage.toml: "What the world says happened"). It names the
	 * action it narrates via `manipulation_action_id` — labelled "Action",
	 * the same noun `ActionView`'s own `kind_label` uses, not a synonym.
	 *
	 * Measured over the corpus: only 7 of 415 `outcome_templates` rows carry
	 * a `description`, and those hold `{target_name}`-style placeholders —
	 * this view renders that text as-authored; it never tries to interpolate
	 * the placeholder (there is no bound target at docs-projection time to
	 * fill it with).
	 */
	export function outcomeRowView(
		record: Record<string, unknown>,
		href: string | undefined,
		link: (ref: string) => string | undefined,
	): DocsRowEntryView {
		const text = (key: string): string | undefined => {
			const value = record[key];
			return typeof value === "string" && value !== "" ? value : undefined;
		};
		const ref = text("outcome_template_id") ?? "";
		const fields: DocsRowField[] = [];
		const push = (label: string, value: string | undefined, options: { link?: boolean } = {}) => {
			if (value === undefined) return;
			const target = options.link ? link(value) : undefined;
			fields.push({ label, value, ...(options.link ? { code: true } : {}), ...(target ? { href: target } : {}) });
		};

		push("Action", text("manipulation_action_id"), { link: true });
		push("Speech act", text("communication_speech_act_id"), { link: true });
		push("Movement", text("movement_descriptor"));
		push("Sense query", text("sense_query_kind"));
		push("Visibility", text("sense_visibility"));
		push("Consequence", text("consequence_template_id"), { link: true });
		push("Outcome condition", text("outcome_expression_source"));
		// discovery_validated is a one-way flag ("this sense outcome marks the
		// target as validated-discovered"); false is the ordinary case for
		// every non-sensing outcome and would swamp the page if always shown.
		if (record.discovery_validated === true) fields.push({ label: "Discovery", value: "Marked validated" });
		if (ref !== "") fields.push({ label: "Outcome ID", value: ref, code: true });
		push("Owning bundle", text("bundle_id"));

		return {
			ref,
			title: text("display_name") ?? ref,
			kind_label: "Outcome",
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
	<article data-testid="outcome-full">
		{#if showHeader}
			<EntryHeading {row} {chrome} />
			<DescriptionField description={row.description ?? ""} field="outcome_templates.description" />
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
