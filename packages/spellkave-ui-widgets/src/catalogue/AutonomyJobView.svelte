<script lang="ts" module>
	import type { DocsRowEntryView, DocsRowField } from "./types";

	/**
	 * Normalize one `autonomy_jobs` row into the shared row shape.
	 *
	 * A standing job is work the world does on its own, without anyone acting:
	 * "damages every occupant of the room every 6 seconds for 3 pulses". A
	 * player meets that rule; a DM steers it. It is not operational plumbing —
	 * `row-kind-coverage.toml` said so for a while and was wrong.
	 *
	 * The table carries no `display_name` column, so the title arrives as the
	 * compiler-derived `title`, the same way `consequence_templates` works.
	 */
	export function autonomyJobRowView(
		record: Record<string, unknown>,
		href: string | undefined,
		link: (ref: string) => string | undefined,
	): DocsRowEntryView {
		const text = (key: string): string | undefined => {
			const value = record[key];
			return typeof value === "string" && value !== "" ? value : undefined;
		};
		const ref = text("job_id") ?? "";
		const fields: DocsRowField[] = [];
		const push = (label: string, value: string | undefined, options: { link?: boolean } = {}) => {
			if (value === undefined) return;
			const target = options.link ? link(value) : undefined;
			fields.push({
				label,
				value,
				code: options.link === true,
				...(target ? { href: target } : {}),
			});
		};

		// What it does, then where and when — the order a reader asks in.
		push("Runs", text("dsl_function"), { link: true });
		push("Anchored at", text("anchor_place_node_id"), { link: true });
		push("Fires on", text("fire_at_boundary"), { link: true });
		const every = record.interval_ms;
		if (typeof every === "number" && every > 0)
			fields.push({ label: "Every", value: `${every / 1000} s` });
		const repeats = record.remaining_pulses ?? record.pulses;
		if (typeof repeats === "number") fields.push({ label: "Pulses", value: String(repeats) });
		// `enabled` is shown only when false: a job that runs is the ordinary
		// case, a job authored but switched off is the notable one.
		if (record.enabled === false) fields.push({ label: "Enabled", value: "No" });
		if (ref !== "") fields.push({ label: "Job ID", value: ref, code: true });
		push("Owning bundle", text("bundle_id"));

		return {
			ref,
			title: text("title") ?? ref,
			kind_label: "Standing work",
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
	<article data-testid="autonomy-job-full">
		{#if showHeader}
			<EntryHeading {row} {chrome} />
			<DescriptionField description={row.description ?? ""} field="autonomy_jobs.description" />
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
