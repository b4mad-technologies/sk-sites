<script lang="ts">
	import { formatDuration, formatRate } from "./ci-format";
	import type { CiJobSortKey, CiJobTableProps, CiJobTableRow } from "./ci-types";

	let {
		rows,
		selectedJobId = null,
		onSelectJob,
		alertAt = 0.2,
		caption = "CI jobs, worst red rate first",
	}: CiJobTableProps = $props();

	let sortKey = $state<CiJobSortKey>("redRate");
	let descending = $state(true);

	const columns: { key: CiJobSortKey; label: string; numeric: boolean }[] = [
		{ key: "name", label: "Job", numeric: false },
		{ key: "runs", label: "Runs", numeric: true },
		{ key: "redRate", label: "Red rate", numeric: true },
		{ key: "p95", label: "p95", numeric: true },
	];

	function value(row: CiJobTableRow, key: CiJobSortKey): number | string | null {
		if (key === "name") return `${row.workflowName} ${row.name}`;
		if (key === "runs") return row.runs;
		if (key === "redRate") return row.redRate;
		return row.p95Seconds;
	}

	// "No data" always sorts last, whichever direction: it is not a small number.
	const sorted = $derived(
		[...rows].sort((a, b) => {
			const va = value(a, sortKey);
			const vb = value(b, sortKey);
			if (va === null && vb === null) return a.id.localeCompare(b.id);
			if (va === null) return 1;
			if (vb === null) return -1;
			const order = typeof va === "string" ? va.localeCompare(vb as string) : va - (vb as number);
			return descending ? -order : order;
		}),
	);

	function sortBy(key: CiJobSortKey): void {
		if (sortKey === key) descending = !descending;
		else {
			sortKey = key;
			descending = key !== "name";
		}
	}
</script>

<div class="overflow-x-auto rounded-[var(--radius)] border border-border bg-card" data-slot="ci-job-table">
	<table class="w-full min-w-[40rem] text-left text-sm">
		<caption class="sr-only">{caption}</caption>
		<thead class="border-b border-border text-muted-foreground">
			<tr>
				{#each columns as column (column.key)}
					<th class="px-1 py-1 font-medium" aria-sort={sortKey === column.key ? (descending ? "descending" : "ascending") : "none"}>
						<button
							type="button"
							class={[
								"w-full rounded-sm px-2 py-1 hover:bg-muted hover:text-foreground",
								column.numeric ? "text-right" : "text-left",
							]}
							onclick={() => sortBy(column.key)}
						>
							{column.label}{sortKey === column.key ? (descending ? " ↓" : " ↑") : ""}
						</button>
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each sorted as row (row.id)}
				{@const alert = row.redRate !== null && row.redRate >= alertAt}
				<tr
					class={["border-b border-border/50 hover:bg-muted/60", selectedJobId === row.id && "bg-muted"]}
				>
					<td class="px-3 py-1.5">
						<button type="button" class="flex flex-col text-left" onclick={() => onSelectJob?.(row.id)}>
							<span>
								{#if row.liveNode === true}<span class="mr-1 inline-block size-2 rounded-full bg-primary" aria-label="live node"></span>{/if}{row.name}
							</span>
							<span class="font-mono text-xs text-muted-foreground">{row.workflowName} · {row.id}</span>
						</button>
					</td>
					<td class="px-3 py-1.5 text-right font-mono tabular-nums">{row.runs ?? "—"}</td>
					<td
						class={[
							"px-3 py-1.5 text-right font-mono tabular-nums",
							alert ? "text-destructive" : row.redRate === null ? "text-muted-foreground" : "",
						]}
					>
						{formatRate(row.redRate)}
						{#if row.failures !== null && row.failures > 0}
							<span class="text-xs text-muted-foreground">({row.failures})</span>
						{/if}
					</td>
					<td class="px-3 py-1.5 text-right font-mono tabular-nums">
						{formatDuration(row.p95Seconds, row.p95AtCap)}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
	{#if rows.length === 0}
		<p class="p-4 text-muted-foreground">No jobs.</p>
	{/if}
</div>
