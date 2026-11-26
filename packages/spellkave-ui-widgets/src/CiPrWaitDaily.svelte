<script lang="ts">
	/** Display the shared UTC creation cohorts without recomputing their medians. */
	import type { CiPrWaitDailyView } from "./ci-types";

	let { view }: { view: CiPrWaitDailyView } = $props();
	const ceiling = $derived(Math.max(1, ...view.days.map(day => day.median_seconds ?? 0)));
	const start = $derived(Date.parse(view.days[0]?.from ?? "1970-01-01T00:00:00Z"));
	const end = $derived(Date.parse(view.days.at(-1)?.to ?? "1970-01-02T00:00:00Z"));
	const x = (at: number) => 52 + (at - start) / Math.max(1, end - start) * 670;
	const y = (seconds: number) => 182 - seconds / ceiling * 150;
</script>

<section class="space-y-3 rounded-lg border border-border bg-card p-4" data-report="pr-wait-daily">
	<h3 class="font-display text-xl">{view.title}</h3>
	<p class="text-sm">{view.clock}</p>
	<p class="text-sm text-muted-foreground">{view.coverage}</p>
	{#if view.unavailable}<p role="status">{view.unavailable}</p>{/if}
	<p class="text-xs text-muted-foreground">Bars show daily medians in seconds. A question mark means unavailable. Dashed lines mark repository merges; UTC dates and head counts are in the table.</p>
	<svg viewBox="0 0 760 230" class="h-auto w-full" role="img" aria-label="Daily median observed PR time to green with repository merge markers">
		<title>{view.title}</title>
		<line x1="52" x2="722" y1="182" y2="182" class="stroke-border" />
		<text x="44" y="186" text-anchor="end" class="fill-muted-foreground text-xs">0</text>
		<text x="44" y="36" text-anchor="end" class="fill-muted-foreground text-xs">{Math.ceil(ceiling)}s</text>
		{#each view.days as day (day.date)}
			{@const center = x((Date.parse(day.from) + Date.parse(day.to)) / 2)}
			<g>
				<title>{day.date}: {day.median} median; {day.observed_heads} observed, {day.measured_heads} measured, {day.unavailable_heads} unavailable heads</title>
				{#if day.median_seconds !== null}
					<rect x={center - Math.min(17, 220 / view.days.length)} y={y(day.median_seconds)} width={Math.min(34, 440 / view.days.length)} height={Math.max(0, 182 - y(day.median_seconds))} class="fill-primary/70" />
				{:else}
					<text x={center} y="174" text-anchor="middle" class="fill-muted-foreground text-xs">?</text>
				{/if}
				<text x={center} y="204" text-anchor="middle" class="fill-muted-foreground text-xs">{day.date.slice(5)}</text>
			</g>
		{/each}
		{#each view.markers as marker (marker.sha)}
			<g>
				<title>{marker.at} · {marker.pr === null ? marker.sha.slice(0, 7) : `PR #${marker.pr}`} · {marker.subject}</title>
				<line x1={x(Date.parse(marker.at))} x2={x(Date.parse(marker.at))} y1="24" y2="182" stroke-dasharray="3 4" class="stroke-muted-foreground/40" />
			</g>
		{/each}
	</svg>
	<div class="overflow-x-auto">
		<table class="w-full text-left text-sm tabular-nums" aria-label="Daily observed PR time to green">
			<thead class="border-b border-border"><tr><th>UTC day and bounds</th><th>Observed heads</th><th>Measured heads</th><th>Unavailable heads</th><th>Median</th><th>Median seconds</th><th>Partial UTC day</th></tr></thead>
			<tbody>
				{#each view.days as day (day.date)}
					<tr class="border-b border-border/40 align-top">
						<td class="py-3 pr-4">{day.date}<p class="text-xs text-muted-foreground">{day.from} – {day.to}</p></td>
						<td>{day.observed_heads}</td><td>{day.measured_heads}</td><td>{day.unavailable_heads}</td>
						<td>{day.median}</td><td>{day.median_seconds ?? "unavailable"}</td><td>{String(day.partial_window)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<details class="text-sm">
		<summary class="cursor-pointer">Repository merge markers ({view.markers.length})</summary>
		{#if view.markers_unavailable}<p>{view.markers_unavailable}</p>{/if}
		<ul class="mt-2 space-y-2">
			{#each view.markers as marker (marker.sha)}
				<li>{marker.at} · PR {marker.pr ?? "unavailable"} · {marker.subject} <code>{marker.sha}</code></li>
			{/each}
		</ul>
	</details>
	<p class="text-sm text-muted-foreground">{view.note}</p>
</section>
