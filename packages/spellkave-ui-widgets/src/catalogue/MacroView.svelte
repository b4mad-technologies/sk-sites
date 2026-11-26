<script lang="ts" module>
	import type { DocsRowEntryView, DocsRowField } from "./types";

	/**
	 * Normalize one `dsl_macro_definitions` row into the shared row shape.
	 *
	 * A macro is a named DSL rule fragment — heavily referenced from predicate
	 * text (row-kind-coverage.toml). `parameters` is authored as a nested
	 * `[[dsl_macro_definitions.parameters]]` array of `{ name, value_type }`
	 * pairs, not a scalar column, so it is read as an array here rather than
	 * through the usual `text()` helper.
	 *
	 * Measured over the corpus: `dsl_macro_definitions` carries NO
	 * `display_name` column at all — 14 of 14 rows across
	 * `playing-the-game/macros.toml`, `classes/monk.toml`,
	 * `classes/barbarian.toml` and `character-creation/advancement.toml`.
	 * Its title is derived upstream (the same shape `consequence_templates`
	 * already has — see `ConsequenceView`) and arrives as `record.title`;
	 * this projector must not read `record.display_name`, which never exists
	 * for this kind.
	 *
	 * `body_source` is the DSL call body itself — a rule fragment a DM or
	 * modder might genuinely want to read, not an identity column. It is
	 * still carried as an ordinary `DocsRowField` (label "Macro body") so it
	 * survives the shared `DocsRowEntryView` shape and shows up in a compact
	 * card's facts, but the full-view template below pulls it out of the
	 * generic field list and renders it as its own monospace, wrapping block
	 * — see the instance script.
	 */
	export function macroRowView(
		record: Record<string, unknown>,
		href: string | undefined,
		link: (ref: string) => string | undefined,
	): DocsRowEntryView {
		const text = (key: string): string | undefined => {
			const value = record[key];
			return typeof value === "string" && value !== "" ? value : undefined;
		};
		const ref = text("macro_id") ?? "";
		const fields: DocsRowField[] = [];
		const push = (label: string, value: string | undefined, options: { link?: boolean; code?: boolean } = {}) => {
			if (value === undefined) return;
			const target = options.link ? link(value) : undefined;
			fields.push({ label, value, ...(options.code || options.link ? { code: true } : {}), ...(target ? { href: target } : {}) });
		};

		push("Return type", text("return_type"));
		const parameters = record.parameters;
		if (Array.isArray(parameters) && parameters.length > 0) {
			const summary = parameters
				.filter((entry): entry is Record<string, unknown> => entry !== null && typeof entry === "object")
				.map((entry) => `${entry.name}: ${entry.value_type}`)
				.join(", ");
			if (summary !== "") fields.push({ label: "Parameters", value: summary, code: true });
		}
		push("Macro body", text("body_source"), { code: true });
		if (ref !== "") fields.push({ label: "Macro ID", value: ref, code: true });
		push("Owning bundle", text("bundle_id"));

		return {
			ref,
			title: text("title") ?? ref,
			kind_label: "Macro",
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

	// "Macro body" is pulled out of the generic field list and rendered as its
	// own block below: a DSL call body reads as a rule fragment, not a
	// one-line identity value — see the projector's doc comment above.
	const bodyField = $derived(row.fields.find((field) => field.label === "Macro body"));
	const otherFields = $derived(row.fields.filter((field) => field.label !== "Macro body"));
</script>

{#if view === "inline"}
	<EntryInline entry={reference} />
{:else if view === "compact"}
	<EntryCompact {row} />
{:else}
	<article data-testid="macro-full">
		{#if showHeader}
			<EntryHeading {row} {chrome} />
			<DescriptionField description={row.description ?? ""} field="dsl_macro_definitions.description" />
		{/if}
		{#if showDetails}
			<FieldList fields={otherFields} />
			{#if bodyField}
				<section class="mt-6 max-w-[65ch]">
					<h3 class="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
						Macro body
					</h3>
					<pre
						class="mt-1 overflow-x-auto whitespace-pre-wrap break-words rounded border border-border bg-muted-surface p-3 font-mono text-sm"
						data-testid="macro-body">{bodyField.value}</pre>
				</section>
			{/if}
			{#each row.references ?? [] as group (group.label)}
				<ReferenceGroup {group} />
			{/each}
			{#each row.referenced_by ?? [] as group (group.label)}
				<ReferenceGroup {group} />
			{/each}
		{/if}
	</article>
{/if}
