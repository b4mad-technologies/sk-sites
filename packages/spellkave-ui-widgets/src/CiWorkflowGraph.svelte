<script lang="ts">
	/** Display-only workflow jobs with outcomes, measured duration and selected-job wiring. */
	import CiIconGlyph from "./CiIconGlyph.svelte";
	import { formatRate } from "./ci-format";
	import { HEALTH_DOT } from "./ci-health";
	import type { CiWorkflowGraphProps } from "./ci-types";

	let {
		jobs,
		selectedJobId = null,
		onSelectJob,
		alertAt = 0.2,
		durationScale = 0,
	}: CiWorkflowGraphProps = $props();
	/** A share of the duration bar: the slowest job's mean fills it. */
	const ofScale = (seconds: number) =>
		`${durationScale > 0 ? Math.min(100, (seconds / durationScale) * 100) : 0}%`;
	const BOX_W = 216;
	const BOX_H = 56;
	const COL_GAP = 64;
	const ROW_GAP = 14;
	// Columns by `needs` depth, like GitHub's own workflow graph: a job sits one
	// column right of the deepest job it needs. Cycles cannot occur in valid
	// workflows; a guard keeps a broken file from hanging the page.
	const layout = $derived.by(() => {
		const ids = new Set(jobs.map((j) => j.id));
		const byId = new Map(jobs.map((j) => [j.id, j]));
		const depth = new Map<string, number>();
		const depthOf = (id: string, guard = 0): number => {
			const known = depth.get(id);
			if (known !== undefined) return known;
			const needs = (byId.get(id)?.needs ?? []).filter((n) => ids.has(n));
			const d =
				guard > jobs.length || needs.length === 0
					? 0
					: 1 + Math.max(...needs.map((n) => depthOf(n, guard + 1)));
			depth.set(id, d);
			return d;
		};
		const columns: string[][] = [];
		for (const job of jobs) {
			const d = depthOf(job.id);
			const column = columns[d] ?? [];
			column.push(job.id);
			columns[d] = column;
		}
		const boxes = new Map<
			string,
			{
				x: number;
				y: number;
			}
		>();
		columns.forEach((column, c) => {
			column.forEach((id, r) => {
				boxes.set(id, { x: c * (BOX_W + COL_GAP), y: r * (BOX_H + ROW_GAP) });
			});
		});
		const rows = Math.max(1, ...columns.map((c) => c.length));
		const edges = jobs.flatMap((job) =>
			job.needs
				.filter((n) => boxes.has(n))
				.map((n) => {
					const from = boxes.get(n) as {
						x: number;
						y: number;
					};
					const to = boxes.get(job.id) as {
						x: number;
						y: number;
					};
					const x1 = from.x + BOX_W;
					const y1 = from.y + BOX_H / 2;
					const x2 = to.x;
					const y2 = to.y + BOX_H / 2;
					const bend = COL_GAP / 2;
					return {
						key: `${n}->${job.id}`,
						d: `M${x1},${y1} C${x1 + bend},${y1} ${x2 - bend},${y2} ${x2},${y2}`,
						active: selectedJobId === job.id || selectedJobId === n,
					};
				}),
		);
		return {
			boxes,
			edges,
			width: columns.length * BOX_W + (columns.length - 1) * COL_GAP,
			height: rows * BOX_H + (rows - 1) * ROW_GAP,
		};
	});
</script>

<div class="overflow-x-auto pb-2" data-slot="ci-workflow-graph">
	<div class="relative" style:width={`${layout.width}px`} style:height={`${layout.height}px`}>
		<svg class="pointer-events-none absolute inset-0" width={layout.width} height={layout.height} aria-hidden="true">
			{#each layout.edges as edge (edge.key)}
				<path d={edge.d} fill="none" class={edge.active ? "stroke-primary" : "stroke-border"} stroke-width={edge.active ? 2 : 1.5} />
			{/each}
		</svg>
		{#each jobs as job (job.id)}
			{@const box = layout.boxes.get(job.id)}
			{@const alert = job.redRate !== null && job.redRate >= alertAt}
			{#if box}
				{@const few = job.state === "too few runs"}
				<!-- A box with health is laid out top down in fixed rows so every title sits at the
				     same height and the content fits the box: 20 px title, two 11 px rows. -->
				<button
					type="button"
					class={[
						"absolute flex flex-col rounded-[var(--radius)] border bg-card px-3 text-left text-sm hover:bg-muted/60",
						job.state ? "justify-start py-[3px]" : "justify-center gap-0.5",
						job.calls || few ? "border-dashed" : "",
						few ? "opacity-60" : "",
						selectedJobId === job.id ? "border-primary ring-1 ring-primary" : alert ? "border-destructive/60" : "border-border",
					]}
					style:left={`${box.x}px`}
					style:top={`${box.y}px`}
					style:width={`${BOX_W}px`}
					style:height={`${BOX_H}px`}
					aria-pressed={selectedJobId === job.id}
					title={job.counts?.join("\n")}
					onclick={() => onSelectJob?.(job.id)}
					data-box={job.id}
				>
					<span class="flex h-5 min-w-0 items-center gap-1.5 leading-5">
						{#if job.state}
							<span class={["size-2 shrink-0 rounded-full", HEALTH_DOT[job.state]]} title={job.state} aria-label={job.state} data-health={job.state}></span>
						{:else if job.liveNode === true}
							<span class="size-2 shrink-0 rounded-full bg-primary" aria-label="live node"></span>
						{/if}
						<span class="min-w-0 truncate" title={job.name}>{job.name}</span>
						{#if job.state && job.liveNode === true}
							<span class="shrink-0 text-muted-foreground" title="live node: starts a SpacetimeDB node" aria-label="live node" data-live-node><CiIconGlyph name="live" class="size-2.5" /></span>
						{/if}
					</span>
					{#if job.state && job.runs_note}
						<span class="mt-[3px] font-mono text-[10px] leading-[11px] text-muted-foreground">{job.runs_note}<br />{job.red_caveat}</span>
					{:else if job.state}
						<span class="mt-[3px] flex flex-col gap-0.5">
							<span class="flex h-[11px] items-center gap-2">
								<span class="relative block h-1 flex-1 rounded-full bg-muted"><span class="block h-full rounded-full bg-destructive" style:width={`${Math.max(job.redRate ?? 0, job.redRate ? 0.015 : 0) * 100}%`}></span></span>
								<span class="w-12 shrink-0 text-right font-mono text-[10px] leading-none tabular-nums text-muted-foreground">{job.red}</span>
							</span>
							<span class="flex h-[11px] items-center gap-2">
								<span class="relative block h-1 flex-1 rounded-full bg-muted">
									<span class="block h-full rounded-full bg-primary/70" style:width={ofScale(job.meanSeconds ?? 0)}></span>
									{#if job.p95Seconds != null}
										<span class="absolute -top-0.5 -bottom-0.5 w-0.5 bg-foreground/70" title={`p95 ${job.p95 ?? ""}`} style:left={ofScale(job.p95Seconds)}></span>
									{/if}
								</span>
								<span class="w-12 shrink-0 text-right font-mono text-[10px] leading-none tabular-nums text-muted-foreground">{job.mean}</span>
							</span>
						</span>
					{:else}
						<span class="flex justify-between font-mono text-xs text-muted-foreground">
							<span class="truncate">{job.calls ? `→ ${job.calls}` : job.id.slice(job.id.indexOf("/") + 1)}</span>
							<span class={alert ? "text-destructive" : ""}>{job.summary ?? (job.redRate === null ? "" : formatRate(job.redRate))}</span>
						</span>
					{/if}
				</button>
			{/if}
		{/each}
	</div>
</div>
