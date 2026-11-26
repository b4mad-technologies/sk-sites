<script lang="ts" module>
	import type { DocsRowEntryView, DocsRowField } from "./types";

	/**
	 * Normalize one `outcome_graphs` row into the shared row shape.
	 *
	 * An outcome graph is a small state machine of staged rolls
	 * (`root_node_id` names the entry node, `max_depth`/`max_nodes`/
	 * `max_draws` bound how far it can branch/expand at resolve time) — see
	 * `crates/spellkave-schema/src/lib.rs`'s `OutcomeGraphRow` and its
	 * `default_outcome_graph_max_*` fallbacks (8/32/8). `root_node_id` names
	 * a node WITHIN this same graph's own `outcome_graph_nodes`, not an
	 * externally addressable ref, so it stays plain text — the same
	 * treatment `RollTableView` gives `result_ref`.
	 *
	 * `outcome_graph_nodes` is `surface = "owner"` of this kind in
	 * `row-kind-coverage.toml` ("owner" — never gets its own page), so this
	 * projector reads only the graph's own row, matching the shared
	 * `RowProjector` signature; the owning page supplies the graph's nodes
	 * separately as the `nodes` PROP on the component below, exactly the
	 * pattern `RollTableView` uses for `roll_table_entries`.
	 *
	 * Real row: `openspec/changes/archive/2026-06-14-arbitration-outcome-graph-authoring/fixtures/authored-outcome-graph.toml`
	 * (`demo_graph/staged_skill_check`, root `approach`, two nodes).
	 *
	 * `display_name` IS present on this row, so the title reads it
	 * directly rather than falling back to a merged `title`.
	 */
	export function outcomeGraphRowView(
		record: Record<string, unknown>,
		href: string | undefined,
		link: (ref: string) => string | undefined,
	): DocsRowEntryView {
		const text = (key: string): string | undefined => {
			const value = record[key];
			return typeof value === "string" && value !== "" ? value : undefined;
		};
		const ref = text("outcome_graph_id") ?? "";
		const fields: DocsRowField[] = [];
		const push = (label: string, value: string | undefined, options: { link?: boolean } = {}) => {
			if (value === undefined) return;
			const target = options.link ? link(value) : undefined;
			fields.push({ label, value, ...(options.link ? { code: true } : {}), ...(target ? { href: target } : {}) });
		};

		const rootNode = text("root_node_id");
		if (rootNode !== undefined) fields.push({ label: "Root node", value: rootNode, code: true });

		const num = (key: string, label: string) => {
			const value = record[key];
			if (typeof value === "number") fields.push({ label, value: String(value) });
		};
		num("max_depth", "Max depth");
		num("max_nodes", "Max nodes");
		num("max_draws", "Max draws");

		if (ref !== "") fields.push({ label: "Outcome Graph ID", value: ref, code: true });
		push("Owning bundle", text("bundle_id"));

		return {
			ref,
			title: text("display_name") ?? ref,
			kind_label: "Outcome graph",
			...(href ? { href } : {}),
			...(text("description") ? { description: text("description") as string } : {}),
			fields,
		};
	}

	/** Read one `outcome_graph_nodes` row's display columns, tolerating a stray non-string value. */
	function nodeText(node: Record<string, unknown>, key: string): string {
		const value = node[key];
		return typeof value === "string" || typeof value === "number" ? String(value) : "";
	}

	// Loop key: the row id, or its order and target when it has none. Computed
	// up front because Biome cannot parse a call inside a keyed loop.
	function nodeKey(node: Record<string, unknown>): string {
		const id = node.outcome_graph_node_id;
		return typeof id === "string"
			? id
			: `${nodeText(node, "authored_order")}-${nodeText(node, "node_id")}`;
	}

	function orderOf(node: Record<string, unknown>): number {
		const value = node.authored_order;
		return typeof value === "number" ? value : Number.POSITIVE_INFINITY;
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
		nodes = [],
		link,
	}: {
		row: DocsRowEntryView;
		view: "inline" | "compact" | "full";
		chrome?: boolean;
		sections?: { header?: boolean; details?: boolean };
		/**
		 * This graph's own `outcome_graph_nodes` rows, supplied by the owning
		 * page — `outcome_graph_nodes` is `surface = "owner"` of `outcome_graphs`
		 * in row-kind-coverage.toml, so it never resolves through a `link`
		 * callback of its own and gets no `ReferenceGroup`. Rendered as a real
		 * table in the full view only, when given.
		 */
		nodes?: readonly Record<string, unknown>[];
		/** Resolves a node's `outcome_template_id` to its catalogue href, when one exists. */
		link?: (ref: string) => string | undefined;
	} = $props();

	const showHeader = $derived(sections.header ?? true);
	const showDetails = $derived(sections.details ?? true);
	const reference = $derived({
		ref: row.ref,
		title: row.title,
		...(row.href ? { href: row.href } : {}),
		...(row.description ? { summary: firstSentence(row.description) } : {}),
	});
	const sortedNodes = $derived([...nodes].sort((left, right) => orderOf(left) - orderOf(right)));
	const keyedNodes = $derived(sortedNodes.map((node) => ({ node, key: nodeKey(node) })));
</script>

{#if view === "inline"}
	<EntryInline entry={reference} />
{:else if view === "compact"}
	<EntryCompact {row} />
{:else}
	<article data-testid="outcome-graph-full">
		{#if showHeader}
			<EntryHeading {row} {chrome} />
			<DescriptionField description={row.description ?? ""} field="outcome_graphs.description" />
		{/if}
		{#if showDetails}
			<FieldList fields={row.fields} />
			{#if sortedNodes.length > 0}
				<section class="mt-6 max-w-[65ch]" data-testid="outcome-graph-nodes">
					<h3 class="font-display text-lg font-medium">Nodes ({sortedNodes.length})</h3>
					<div class="mt-2 overflow-x-auto">
						<table class="w-full border-collapse text-sm">
							<thead>
								<tr>
									<th class="border border-border bg-muted-surface px-2 py-1 text-left">#</th>
									<th class="border border-border bg-muted-surface px-2 py-1 text-left">Node</th>
									<th class="border border-border bg-muted-surface px-2 py-1 text-left">Outcome template</th>
									<th class="border border-border bg-muted-surface px-2 py-1 text-left">Terminal</th>
								</tr>
							</thead>
							<tbody>
								{#each keyedNodes as { node, key } (key)}
									{@const templateId = nodeText(node, "outcome_template_id")}
									{@const templateHref = templateId && link ? link(templateId) : undefined}
									<tr>
										<td class="border border-border px-2 py-1">{nodeText(node, "authored_order")}</td>
										<td class="border border-border px-2 py-1"><code>{nodeText(node, "node_id")}</code></td>
										<td class="border border-border px-2 py-1">
											{#if templateId === ""}
												—
											{:else if templateHref}
												<a class="text-primary underline-offset-4 hover:underline" href={templateHref}
													><code>{templateId}</code></a
												>
											{:else}
												<code>{templateId}</code>
											{/if}
										</td>
										<td class="border border-border px-2 py-1">{node.terminal === true ? "Yes" : "No"}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
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
