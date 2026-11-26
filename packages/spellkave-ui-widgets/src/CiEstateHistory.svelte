<script lang="ts">
	import {
		ESTATE_LINE_PODS,
		type EstateField,
		estateBand,
		estateChartSeries,
		estatePath,
	} from "./ci-estate-chart.ts";
	import type { CiEstateHistory } from "./ci-types.ts";

	let {
		history,
		pool,
		error = null,
	}: { history: CiEstateHistory | null; pool: string; error?: string | null } = $props();
	const coverage = $derived(history?.poolCoverage?.find(row => row.pool === pool));
 const pods = $derived(history?.pods.filter((pod) => pod.pool === pool && pod.role === "job") ?? []);
	let fit = $state(false);
	const bounds = $derived.by(() => {
		const full = [
			Date.parse(history?.from ?? "") / 1000,
			Date.parse(history?.to ?? "") / 1000,
		] as const;
		if (!fit) return full;
		const times = pods.flatMap((p) =>
			p.points
				.filter((p) => p.cpuCores !== null || p.memoryBytes !== null || p.throttledRatio !== null)
				.map((p) => p.at),
		);
		return times.length
			? ([
					Math.max(full[0], Math.min(...times)),
					Math.min(full[1], Math.max(...times) + (history?.stepSeconds ?? 300)),
				] as const)
			: full;
	});
	const from = $derived(bounds[0]);
	const to = $derived(bounds[1]);
	const charts: {
		label: string;
		field: EstateField;
		limit?: EstateField;
		unit: string;
		divisor: number;
	}[] = [
		{ label: "CPU cores used", field: "cpuCores", limit: "cpuLimit", unit: "cores", divisor: 1 },
		{ label: "Throttled ratio", field: "throttledRatio", unit: "%", divisor: 0.01 },
		{
			label: "Memory working set",
			field: "memoryBytes",
			limit: "memoryLimit",
			unit: "GiB",
			divisor: 1073741824,
		},
	];
	const colors = [
		"var(--primary)",
		"var(--foreground)",
		"var(--accent)",
		"var(--destructive)",
		"var(--muted-foreground)",
	];
	const date = (at: number) => new Date(at * 1000).toISOString().slice(5, 16).replace("T", " ");
	const peak = (points: { value: number | null }[]) =>
		points.reduce((n, p) => Math.max(n, p.value ?? 0), 0);
</script>

<section class="history" aria-label={`${pool} job pod resource history`}>
	<h5>Job pods over time</h5>
	{#if error || history?.unavailable}
		<p role="status">{error ?? history?.unavailable}</p>
	{:else if !history}
		<p role="status">Reading estate history…</p>
	{:else if !pods.length}
		<p>No attributed job pod samples in this window. Resource history is unknown.</p>
	{:else}
		<label><input type="checkbox" bind:checked={fit} /> Fit observed job span</label>
  {#if fit}<p class="muted">Showing observed pod samples within the selected window.</p>{/if}
  <p class="muted">{pods.length} job pods · {Math.round(history.stepSeconds/60)} min sampling · {(history.rateWindowSeconds ?? 300)/60} min rates · UTC</p>
		{#if coverage && coverage.observedPods > coverage.selectedPods}<p class="muted">Newest {coverage.selectedPods} of {coverage.observedPods} observed job pods; older histories omitted.</p>{/if}
  {#if pods.length > ESTATE_LINE_PODS}<p class="muted">Median and maximum of pods sampled at each time; the cohort changes as pods start and stop.</p>{/if}
		{#each charts as chart (chart.field)}
			{@const series = estateChartSeries(pods, chart.field)}
			{@const limits = chart.limit ? estateChartSeries(pods, chart.limit) : []}
			{@const ceiling = Math.max(chart.field === "throttledRatio" ? 1 : chart.divisor, ...[...series, ...limits].map(s => peak(s.points)))}
			<figure>
				<figcaption>{chart.label} <span class="muted">({chart.unit})</span></figcaption>
				<svg viewBox="0 0 360 192" role="img" aria-label={`${pool}: ${chart.label} over time, ${chart.unit}. ${limits.length ? 'Dashed lines show observed pod limits.' : `${(history.rateWindowSeconds ?? 300)/60}-minute throttled periods divided by total periods.`}`}>
					<title>{pool} · {chart.label} · {history.from} to {history.to}</title>
					<line x1="44" x2="344" y1="150" y2="150" class="axis" />
					<line x1="44" x2="344" y1="26" y2="26" class="grid" />
					<text x="38" y="154" text-anchor="end">0</text>
					<text x="38" y="30" text-anchor="end">{(ceiling/chart.divisor).toFixed(chart.unit === "%" ? 0 : 1)}</text>
					{#if pods.length > ESTATE_LINE_PODS}
 <path d={estateBand(series[0]!.points, series[1]!.points, from, to, ceiling, history.stepSeconds)} style:fill="var(--primary)" fill-opacity="0.14"><title>Median to maximum across sampled job pods</title></path>
 {/if}
 {#each limits as line, i (line.id)}
						<path d={estatePath(line.points, from, to, ceiling, history.stepSeconds)} stroke={colors[i%colors.length]} stroke-dasharray="5 4" stroke-width="1.4"><title>{line.label} · observed limit up to {(peak(line.points)/chart.divisor).toFixed(2)} {chart.unit}</title></path>
					{/each}
					{#each series as line, i (line.id)}
						<path d={estatePath(line.points, from, to, ceiling, history.stepSeconds)} stroke={colors[i%colors.length]} stroke-width={line.id === "maximum" ? 1 : 2} stroke-dasharray={i >= colors.length ? "2 2" : undefined}><title>{line.label} · {chart.label}</title></path>
						{#each line.points.filter(p => p.value !== null && p.at >= from && p.at <= to) as point (point.at)}
							<circle cx={44+(point.at-from)/Math.max(1,to-from)*300} cy={150-(point.value ?? 0)/ceiling*124} r="1.5" fill={colors[i%colors.length]}><title>{line.label} · {date(point.at)} UTC · {((point.value ?? 0)/chart.divisor).toFixed(2)} {chart.unit}</title></circle>
						{/each}
					{/each}
					<text x="44" y="175">{date(from)}</text><text x="344" y="175" text-anchor="end">{date(to)}</text>
				</svg>
				<p class="muted">Lines: usage{chart.limit ? " · dashed: observed limits" : ""}{pods.length > ESTATE_LINE_PODS ? " · bold: median · thin: maximum" : ""}. Gaps are unknown.</p>
				{#if !series.some(s => s.points.some(p => p.value !== null))}<p>No {chart.label.toLowerCase()} samples.</p>{/if}
				{#if chart.limit && !limits.some(s => s.points.some(p => p.value !== null))}<p class="muted">Observed limits unknown.</p>{/if}
			</figure>
		{/each}
		<details><summary>{pods.length > ESTATE_LINE_PODS ? "Observed pods and sampled peaks" : "Pod legend and sampled peaks"} ({pods.length})</summary>
			{#each pods as pod, i (`${pod.namespace}/${pod.pod}`)}
				<p class="pod"><b style:color={pods.length > ESTATE_LINE_PODS ? "var(--foreground)" : colors[i%colors.length]}>{i+1}. {pod.namespace}/{pod.pod}{pods.length <= ESTATE_LINE_PODS && i >= colors.length ? " (dotted usage)" : ""}</b><br />
					{#each charts as chart (chart.field)}
						{@const values = pod.points.flatMap(p => p[chart.field] === null ? [] : [p[chart.field]!])}
						<span>{chart.label}: {values.length ? `${(Math.max(...values)/chart.divisor).toFixed(2)} ${chart.unit}` : "unknown"} · </span>
					{/each}
				</p>
			{/each}
		</details>
		<p class="muted">{history.note}</p>
	{/if}
</section>

<style>
	.history { min-width: 0; margin-top: 1rem; }
	h5 { font-size: 1rem; font-weight: 600; }
	label { font-size: 0.75rem; display: flex; gap: 0.4rem; align-items: center; margin: 0.5rem 0; }
 p, summary { font-size: 0.75rem; line-height: 1.5; overflow-wrap: anywhere; }
	.muted { color: var(--muted-foreground); }
	figure { margin: 0.75rem 0; border: 1px solid var(--border); border-radius: 0.5rem; padding: 0.5rem; background: var(--card); }
	figcaption { font-size: 0.875rem; font-weight: 600; }
	svg { display: block; width: 100%; height: auto; }
	path { fill: none; }
	text { fill: var(--muted-foreground); font-size: 11px; }
	.axis, .grid { stroke: var(--border); }
	.grid { stroke-dasharray: 2 4; }
	.pod { padding: 0.4rem 0; border-top: 1px solid var(--border); }
</style>
