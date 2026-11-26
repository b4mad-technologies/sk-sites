<script lang="ts" module>
	import type { DocsRowEntryView, DocsRowField } from "./types";

	/**
	 * Normalize one `prompt_definitions` row into the shared row shape.
	 *
	 * ADR-0142 D-1: the open question behind a talker's own dialogue prompt —
	 * `source_selector` says which talkers carry it, `open_predicate_source`
	 * says when it is open, `response_action_ids` is the ordered response set
	 * a perceiver may choose from, and `audience_kind_ref` says who is even
	 * addressed (`audience_kind_definitions`, this kind's sibling page).
	 *
	 * `trace_window_ticks`/`contract_version` carry `#[serde(default)]` zero
	 * values in `PromptDefinitionRow` (`crates/spellkave-schema/src/lib.rs`)
	 * that mean "unset", not a real zero-length window or contract — the same
	 * "boring default stays silent" convention `ActionView` applies to a zero
	 * `cost_time_ms`, so both are omitted at their default. `accepts_global_storm`
	 * mirrors `AffordanceTemplateRow`'s ADR-0027 column and follows
	 * `ConditionView`'s `observable`-style rule: shown only for the notable
	 * (non-default) value, here `true`.
	 *
	 * No `display_name` column, so the title falls back to the merged `title`
	 * field the owning page computes, same as `ExtentKindView`.
	 */
	export function promptDefinitionRowView(
		record: Record<string, unknown>,
		href: string | undefined,
		link: (ref: string) => string | undefined,
	): DocsRowEntryView {
		const text = (key: string): string | undefined => {
			const value = record[key];
			return typeof value === "string" && value !== "" ? value : undefined;
		};
		const ref = text("prompt_def_id") ?? "";
		const fields: DocsRowField[] = [];
		const push = (label: string, value: string | undefined, options: { link?: boolean } = {}) => {
			if (value === undefined) return;
			const target = options.link ? link(value) : undefined;
			fields.push({ label, value, ...(options.link ? { code: true } : {}), ...(target ? { href: target } : {}) });
		};
		// `response_action_ids` can carry more than one entry; `DocsRowField`
		// holds exactly one value and `FieldList` keys its `#each` on
		// `field.label`, so a single entry keeps the plain label and more than
		// one gets an "(i of n)" suffix — the same rule `ConditionView.pushList`
		// uses for its own id-list columns.
		const pushList = (label: string, key: string) => {
			const raw = record[key];
			const items = Array.isArray(raw) ? raw.filter((item): item is string => typeof item === "string" && item !== "") : [];
			items.forEach((item, index) => {
				const itemLabel = items.length > 1 ? `${label} (${index + 1} of ${items.length})` : label;
				const target = link(item);
				fields.push({ label: itemLabel, value: item, code: true, ...(target ? { href: target } : {}) });
			});
		};

		push("Selects", text("source_selector"));
		push("Open condition", text("open_predicate_source"));
		pushList("Response option", "response_action_ids");
		push("Audience kind", text("audience_kind_ref"), { link: true });
		const traceWindow = record.trace_window_ticks;
		if (typeof traceWindow === "number" && traceWindow > 0) {
			fields.push({ label: "Trace window", value: `${traceWindow} ticks` });
		}
		const contractVersion = record.contract_version;
		if (typeof contractVersion === "number" && contractVersion > 0) {
			fields.push({ label: "Contract version", value: String(contractVersion) });
		}
		if (record.accepts_global_storm === true) {
			fields.push({ label: "Accepts global storm", value: "Yes" });
		}
		if (ref !== "") fields.push({ label: "Prompt ID", value: ref, code: true });
		push("Owning bundle", text("bundle_id"));

		return {
			ref,
			title: text("title") ?? ref,
			kind_label: "Prompt",
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
	<article data-testid="prompt-definition-full">
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
