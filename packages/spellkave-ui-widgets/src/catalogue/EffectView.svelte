<script lang="ts" module>
	import type { DocsRowEntryView, DocsRowField } from "./types";

	/**
	 * Normalize one `effect_definitions` row into the shared row shape.
	 *
	 * An effect is a reusable payload a consequence frame write can trigger —
	 * `primitives_csv` names which kernel primitive(s) it drives (`Spawn`,
	 * `ScheduleAutonomyJob`, …) and `parameters_schema_json` is that
	 * primitive's own call shape, authored as JSON.
	 *
	 * Measured over the corpus: `effect_definitions` carries NO `display_name`
	 * column at all — 7 of 7 rows (`classes/caster-features.toml`, the four
	 * `spells/level-2/*.toml` schedule effects, and the two `spells/level-1/*`
	 * spawn effects). Its title is derived upstream (the same shape
	 * `consequence_templates` already has — see `ConsequenceView`) and
	 * arrives as `record.title`; this projector must not read
	 * `record.display_name`, which never exists for this kind.
	 *
	 * `description` is authored on only 1 of the 7 rows (the Wild Companion
	 * spawn) — every other row leaves it unauthored, hence the conditional
	 * below rather than ActionView's always-present convention.
	 */
	export function effectRowView(
		record: Record<string, unknown>,
		href: string | undefined,
		link: (ref: string) => string | undefined,
	): DocsRowEntryView {
		const text = (key: string): string | undefined => {
			const value = record[key];
			return typeof value === "string" && value !== "" ? value : undefined;
		};
		const ref = text("effect_def_id") ?? "";
		const fields: DocsRowField[] = [];
		const push = (label: string, value: string | undefined, options: { link?: boolean; code?: boolean } = {}) => {
			if (value === undefined) return;
			const target = options.link ? link(value) : undefined;
			fields.push({ label, value, ...(options.code || options.link ? { code: true } : {}), ...(target ? { href: target } : {}) });
		};

		push("Primitives", text("primitives_csv"));
		push("Parameters", text("parameters_schema_json"), { code: true });
		if (ref !== "") fields.push({ label: "Effect ID", value: ref, code: true });
		push("Owning bundle", text("bundle_id"));

		return {
			ref,
			title: text("title") ?? ref,
			kind_label: "Effect",
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
	<article data-testid="effect-full">
		{#if showHeader}
			<EntryHeading {row} {chrome} />
			<DescriptionField description={row.description ?? ""} field="effect_definitions.description" />
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
