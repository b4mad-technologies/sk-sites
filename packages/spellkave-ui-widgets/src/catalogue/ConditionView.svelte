<script lang="ts" module>
	import type { DocsRowEntryView, DocsRowField } from "./types";

	/**
	 * Normalize one `condition_definitions` row into the shared row shape.
	 *
	 * A condition is "poisoned, prone, dead" (row-kind-coverage.toml) — a
	 * status an actor carries. Its interesting columns are the ones that say
	 * what carrying it DOES: `grants_capability_while_active` and
	 * `suppresses_capability_while_active` (the sk-syo capability fold —
	 * additive grant vs. subtractive suppression, deliberately not
	 * interchangeable, see `ConditionDefinitionRow`), `implies` (the SRD
	 * cascade — e.g. Unconscious implies Incapacitated), and the single
	 * `modifier_template_id` a condition may drive while active. Those lead
	 * the field list; the identity row (`Condition ID`) trails it, exactly
	 * as `ActionView` leads with consequences rather than its own id.
	 *
	 * `hooks` (`Vec<ConditionHookRow>`) is not rendered: every authored row in
	 * the corpus ships `hooks = []`, and `DocsRowField.value` is a single
	 * string, not a shape for a nested object list — there is no established
	 * pattern yet for a field that isn't string-shaped. When an authored hook
	 * exists this silently omits it rather than guessing a rendering; that
	 * mirrors `ActionView`'s own omission of validator-internal columns.
	 *
	 * `observable` (default `true`) is shown only when a row sets it
	 * `false` — the same "boring default stays silent" rule `ActionView`
	 * applies to a zero `cost_time_ms` — because a non-observable condition
	 * (one of the `incapacitated/no-*` siblings) is the notable case a DM
	 * needs to see, not the common one.
	 */
	export function conditionRowView(
		record: Record<string, unknown>,
		href: string | undefined,
		link: (ref: string) => string | undefined,
	): DocsRowEntryView {
		const text = (key: string): string | undefined => {
			const value = record[key];
			return typeof value === "string" && value !== "" ? value : undefined;
		};
		const ref = text("condition_definition_id") ?? "";
		const fields: DocsRowField[] = [];
		const push = (label: string, value: string | undefined, options: { link?: boolean } = {}) => {
			if (value === undefined) return;
			const target = options.link ? link(value) : undefined;
			fields.push({ label, value, code: options.link === true, ...(target ? { href: target } : {}) });
		};
		// An id-list column (`implies`, the two capability lists) can carry more
		// than one entry, but `DocsRowField` holds exactly one value and
		// `FieldList` keys its `#each` on `field.label` — two fields sharing a
		// label would collide there. A single entry keeps the plain label; more
		// than one gets an "(i of n)" suffix so every element still renders,
		// still linked, with a distinct key.
		const pushList = (label: string, key: string) => {
			const raw = record[key];
			const items = Array.isArray(raw) ? raw.filter((item): item is string => typeof item === "string" && item !== "") : [];
			items.forEach((item, index) => {
				const itemLabel = items.length > 1 ? `${label} (${index + 1} of ${items.length})` : label;
				const target = link(item);
				fields.push({ label: itemLabel, value: item, code: true, ...(target ? { href: target } : {}) });
			});
		};

		pushList("Grants capability while active", "grants_capability_while_active");
		pushList("Suppresses capability while active", "suppresses_capability_while_active");
		pushList("Implies", "implies");
		push("Modifier while active", text("modifier_template_id"), { link: true });
		push("Stacking rule", text("stacking_rule"), { link: true });
		push("Remove policy", text("remove_time_policy"), { link: true });
		push("Gate condition", text("gate_predicate_source"));
		if (record.observable === false) fields.push({ label: "Observable", value: "No" });
		if (ref !== "") fields.push({ label: "Condition ID", value: ref, code: true });
		push("Owning bundle", text("bundle_id"));

		return {
			ref,
			title: text("display_name") ?? ref,
			kind_label: "Condition",
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
	<article data-testid="condition-full">
		{#if showHeader}
			<EntryHeading {row} {chrome} />
			<DescriptionField description={row.description ?? ""} field="condition_definitions.description" />
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
