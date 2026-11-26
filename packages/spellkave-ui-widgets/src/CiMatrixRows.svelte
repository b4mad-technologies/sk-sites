<script lang="ts">
	import type { CiMatrixRowsProps } from "./ci-types";

	/** Display-only matrix facts. The shared report supplies every number and denominator text. */
	let { rows }: CiMatrixRowsProps = $props();
</script>

<div class="overflow-x-auto rounded-[var(--radius)] border border-border bg-card">
	<table class="w-full text-left text-sm">
		<caption class="sr-only">Matrix job rows</caption>
		<thead class="border-b border-border text-muted-foreground">
			<tr>
				<th class="px-3 py-2 font-medium">Row</th>
				<th class="px-3 py-2 text-right font-medium">Runs</th>
				<th class="px-3 py-2 text-right font-medium">Failures</th>
				<th class="px-3 py-2 text-right font-medium">Red rate</th>
				<th class="px-3 py-2 text-right font-medium">Mean</th>
				<th class="px-3 py-2 text-right font-medium">p95</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as row (row.name)}
				<tr class="border-b border-border/50" title={row.counts.join("\n")}>
					<th scope="row" class="px-3 py-2 text-left font-medium">{row.name}{#if row.note}<span class="block text-xs font-normal text-muted-foreground">{row.note}</span>{/if}</th>
					<td class="px-3 py-2 text-right font-mono tabular-nums">{row.runs}</td>
					<td class="px-3 py-2 text-right font-mono tabular-nums">{row.failures}</td>
					<td class="px-3 py-2 text-right font-mono tabular-nums">{row.red}</td>
					<td class="px-3 py-2 text-right font-mono tabular-nums">{row.mean}</td>
					<td class="px-3 py-2 text-right font-mono tabular-nums">{row.p95 ?? "—"}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
