<script lang="ts" module>
	import type { DocsRowEntryView, DocsRowField } from "./types";

	/**
	 * Normalize one `economy_channel_definitions` row into the shared row
	 * shape.
	 *
	 * A channel is what a verb spends (row-kind-coverage.toml: "Action, bonus
	 * action, reaction. What a verb spends.") — every `action_definitions`
	 * row's own `spends_channel` points at one of these four. `resets_on`
	 * points at a `boundary_definitions` row ("page" surface in
	 * row-kind-coverage.toml), so it is linked like any other cross-kind
	 * reference.
	 *
	 * Measured over the corpus: `economy_channel_definitions` carries NO
	 * `display_name` column (or `description` column) at all — 4 of 4 rows,
	 * all in `playing-the-game/action-economy.toml`. Its title is derived
	 * upstream (the same shape `consequence_templates` already has — see
	 * `ConsequenceView`) and arrives as `record.title`. With no description
	 * column ever authored, this view follows `AffordanceView`'s convention
	 * and never renders a description block at all.
	 *
	 * `off_turn_eligible` is shown unconditionally rather than only-when-true
	 * (contrast `OutcomeView`'s `discovery_validated`): with only 4 rows in
	 * the whole corpus, and this exact flag being the reason Reaction can be
	 * spent outside your own turn, hiding it on the 3 rows where it is false
	 * would hide the very fact that makes Reaction distinctive.
	 */
	export function channelRowView(
		record: Record<string, unknown>,
		href: string | undefined,
		link: (ref: string) => string | undefined,
	): DocsRowEntryView {
		const text = (key: string): string | undefined => {
			const value = record[key];
			return typeof value === "string" && value !== "" ? value : undefined;
		};
		const ref = text("id") ?? "";
		const fields: DocsRowField[] = [];
		const push = (label: string, value: string | undefined, options: { link?: boolean } = {}) => {
			if (value === undefined) return;
			const target = options.link ? link(value) : undefined;
			fields.push({ label, value, ...(options.link ? { code: true } : {}), ...(target ? { href: target } : {}) });
		};

		if (typeof record.off_turn_eligible === "boolean") {
			fields.push({ label: "Off-turn eligible", value: record.off_turn_eligible ? "Yes" : "No" });
		}
		const pool = record.pool_ms_per_round;
		if (typeof pool === "number" && pool > 0) {
			fields.push({ label: "Pool per round", value: `${pool / 1000} s` });
		}
		push("Resets on", text("resets_on"), { link: true });
		if (ref !== "") fields.push({ label: "Channel ID", value: ref, code: true });
		push("Owning bundle", text("bundle_id"));

		return {
			ref,
			title: text("title") ?? ref,
			kind_label: "Economy channel",
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
	<article data-testid="channel-full">
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
