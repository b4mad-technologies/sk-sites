<script lang="ts">
	/** Display measured wall-time series and the shared merge comparison. */
	interface Summary {
		count: number;
		meanSeconds: number | null;
		p50Seconds: number | null;
		p95Seconds: number | null;
		mean: string;
		p50: string;
		p95: string;
	}
	interface Day extends Summary {
		date: string;
	}
	interface Marker {
		sha: string;
		at: string;
		pr: number | null;
		subject: string;
	}
	interface Comparison {
		marker: Marker;
		before: Summary;
		after: Summary;
		straddling: number;
		straddlingText?: string;
		changePercent: number | null;
	}
	let {
		name,
		days,
		markers,
		comparison = null,
		sampleUnit = "profiles",
	}: {
		name: string;
		days: readonly Day[];
		markers: readonly Marker[];
		comparison?: Comparison | null;
		sampleUnit?: string;
	} = $props();
	const ceiling = $derived(Math.max(1, ...days.map((day) => day.p95Seconds ?? 0)));
	const start = $derived(Date.parse(`${days[0]?.date ?? "1970-01-01"}T00:00:00Z`));
	const span = $derived(Math.max(1, days.length) * 86400000);
	const x = (at: number) => 52 + ((at - start) / span) * 670;
	const y = (seconds: number) => 182 - (seconds / ceiling) * 150;
	const markerName = (marker: Marker) =>
		marker.pr === null ? marker.sha.slice(0, 7) : `PR #${marker.pr}`;
</script>

<section class="overflow-hidden rounded-lg border border-border bg-card" aria-label="{name} wall time">
	<h3 class="px-4 pt-4 font-medium">{name}</h3>
	<p class="px-4 text-sm text-muted-foreground">Daily p50 bars and p95 ticks, in seconds. Dashed lines mark repository merges. Hover for UTC dates and sample counts.</p>
	<svg viewBox="0 0 760 232" class="h-auto w-full" role="img" aria-label="{name} daily wall seconds with merge markers">
		<title>{name} measured daily wall time</title>
		<line x1="52" x2="722" y1="182" y2="182" class="stroke-border" />
		<text x="44" y="186" text-anchor="end" class="fill-muted-foreground text-xs">0</text>
		<text x="44" y="36" text-anchor="end" class="fill-muted-foreground text-xs">{Math.ceil(ceiling)}s</text>
		{#each days as day (day.date)}
			{@const center = x(Date.parse(`${day.date}T12:00:00Z`))}
			<g>
				<title>{day.date}: {day.p50} p50, {day.p95} p95, {day.count} {sampleUnit}</title>
				{#if day.p50Seconds !== null && day.p95Seconds !== null}
					<rect x={center - Math.min(17, 220 / days.length)} y={y(day.p50Seconds)} width={Math.min(34, 440 / days.length)} height={Math.max(0, 182 - y(day.p50Seconds))} class="fill-primary/70" />
					<line x1={center - 9} x2={center + 9} y1={y(day.p95Seconds)} y2={y(day.p95Seconds)} stroke-width="2" class="stroke-foreground" />
				{:else}
					<text x={center} y="174" text-anchor="middle" class="fill-muted-foreground text-xs">?</text>
				{/if}
				<text x={center} y="202" text-anchor="middle" class="fill-muted-foreground text-xs">{day.date.slice(5)}</text>
				<text x={center} y="218" text-anchor="middle" class="fill-muted-foreground text-xs">n={day.count}</text>
			</g>
		{/each}
		{#each markers as marker (marker.sha)}
			{@const position = x(Date.parse(marker.at))}
			<g>
				<title>{markerName(marker)} · {marker.at} · {marker.subject}</title>
				<line x1={position} x2={position} y1="24" y2="182" stroke-dasharray="3 4" class={comparison?.marker.sha === marker.sha ? "stroke-primary" : "stroke-muted-foreground/40"} />
				{#if comparison?.marker.sha === marker.sha}
					<text x={position + 4} y="18" class="fill-foreground text-xs">{markerName(marker)}</text>
				{/if}
			</g>
		{/each}
	</svg>
	{#if comparison}
		<div class="space-y-2 border-t border-border p-4 text-sm">
			<p>Before / after {markerName(comparison.marker)} · {comparison.marker.at}</p>
			<p class="font-mono">Before: {comparison.before.mean} mean · {comparison.before.p50} p50 · {comparison.before.p95} p95 · n={comparison.before.count}</p>
			<p class="font-mono">After: {comparison.after.mean} mean · {comparison.after.p50} p50 · {comparison.after.p95} p95 · n={comparison.after.count}</p>
			<p>{comparison.changePercent === null ? "Mean change unknown: one side has no samples or a zero baseline." : `${comparison.changePercent.toFixed(1)}% mean wall time`}</p>
			<p class="text-muted-foreground">{comparison.straddlingText ?? `${comparison.straddling} jobs crossing the merge time excluded.`}</p>
		</div>
	{/if}
	<details class="border-t border-border p-4 text-sm">
		<summary class="cursor-pointer">Daily measurements ({days.length} UTC days)</summary>
		<div class="overflow-x-auto">
			<table class="mt-3 w-full text-left tabular-nums">
				<caption class="sr-only">{name} daily wall measurements</caption>
				<thead><tr><th>UTC day</th><th>{sampleUnit}</th><th>Mean</th><th>p50</th><th>p95</th></tr></thead>
				<tbody>
					{#each days as day (day.date)}
						<tr class="border-t border-border/50"><td>{day.date}</td><td>{day.count}</td><td>{day.mean}</td><td>{day.p50}</td><td>{day.p95}</td></tr>
					{/each}
				</tbody>
			</table>
		</div>
	</details>
</section>
