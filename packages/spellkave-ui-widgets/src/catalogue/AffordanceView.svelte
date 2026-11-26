<script lang="ts" module>
	import type { DocsRowEntryView, DocsRowField } from "./types";

	/**
	 * Normalize one `affordance_templates` row into the shared row shape.
	 *
	 * An affordance is the OFFER stage (`offer-vs-resolution-roll.md`):
	 * whether the verb is even attemptable here and now — capability,
	 * wielded-item identity, range/reach. No die, no target-defense read
	 * belongs on this page; that lives on the action it points at via
	 * `outcome_template_id`'s own chain. Labels stay inside that vocabulary
	 * ("condition", "requires", "spends") rather than reader-side synonyms
	 * like "trigger"/"check"/"effect".
	 *
	 * Validator-computed bookkeeping (`locality_class`, `reads_occupancy`,
	 * `stratification_ok`, `accepts_global_storm`, `predicate_bool`) never
	 * surfaces here — those document the materialiser's own reasoning about
	 * the predicate, not the offer itself a player or DM reads about. Same
	 * omission `ActionView` already makes for its own internal columns
	 * (`session_def_id`, `resumable`, `self_eligible`, `self_only`).
	 *
	 * Measured over the corpus: `affordance_templates` carries NO
	 * `description` column at all — 417 of 417 rows. This view therefore
	 * never renders a description block at all (not even a "missing"
	 * message) — see the instance script below.
	 */
	export function affordanceRowView(
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
		const push = (label: string, value: string | undefined, options: { link?: boolean } = {}) => {
			if (value === undefined) return;
			const target = options.link ? link(value) : undefined;
			fields.push({ label, value, ...(options.link ? { code: true } : {}), ...(target ? { href: target } : {}) });
		};

		push("Niche", text("niche_id"), { link: true });
		push("Requires capability", text("capability_id"), { link: true });
		push("Outcome", text("outcome_template_id"), { link: true });
		push("Spends", text("spends_channel"), { link: true });
		push("Recharges", text("recharges_on"));
		push("Offer condition", text("predicate_source"));
		const range = record.range_m;
		// range_m of exactly 0 means "no target" (e.g. Swing), not "broken
		// range" — showing "Range: 0 m" on an untargeted offer would read as
		// a bug, so it is omitted the same way ActionView omits a zero cost.
		if (typeof range === "number" && range > 0) {
			fields.push({ label: "Range", value: `${range.toFixed(2)} m` });
		}
		const composes = record.composes;
		if (Array.isArray(composes) && composes.length > 0) {
			fields.push({
				label: "Composes",
				value: composes.filter((id): id is string => typeof id === "string").join(", "),
				code: true,
			});
		}
		push("Movement cost expression", text("movement_cost_expression_source"));
		if (ref !== "") fields.push({ label: "Affordance ID", value: ref, code: true });
		push("Owning bundle", text("bundle_id"));

		return {
			ref,
			title: text("display_name") ?? ref,
			kind_label: "Affordance",
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
	<article data-testid="affordance-full">
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
