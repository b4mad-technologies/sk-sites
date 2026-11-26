<script lang="ts">
	import CiIconGlyph from "./CiIconGlyph.svelte";
	import CiJobGlyphs from "./CiJobGlyphs.svelte";
	import { worstRate } from "./ci-format";
	import { HEALTH_DOT } from "./ci-health";
	import type { CiRouteBoardProps } from "./ci-types";

	let {
		lanes,
		selectedJobId = null,
		onSelectJob,
		onOpenWorkflow,
		onOpenPackage,
		alertAt = 0.2,
		durationScale = 0,
		glyphParts,
	}: CiRouteBoardProps = $props();

	// The slowest mean on the board fills a duration bar, unless the caller gives a scale.
	const scale = $derived(
		durationScale > 0
			? durationScale
			: Math.max(0, ...lanes.flatMap((l) => l.groups.flatMap((g) => g.jobs.map((j) => j.meanSeconds ?? 0)))),
	);
	const MAX_PACKAGES = 5;
	const shortName = (name: string) => name.replace(/^@spellkave\//, "");
</script>

<div class="flex flex-col gap-10" data-slot="ci-route-board">
	{#each lanes as lane (lane.id)}
		<section class="flex flex-col gap-4" aria-labelledby={`lane-${lane.id}`}>
			<header class="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-border pb-2">
				<h3 id={`lane-${lane.id}`} class="font-display text-2xl tracking-tight">{lane.title}</h3>
				<p class="font-mono text-xs text-muted-foreground">{lane.entry}</p>
			</header>
			<div class="grid gap-4 sm:grid-cols-[repeat(auto-fill,minmax(19rem,1fr))]">
				{#each lane.groups as group (group.id)}
					{@const worst = worstRate(group.jobs)}
					<article
						class={[
							"flex flex-col rounded-[var(--radius)] border bg-card",
							worst >= alertAt ? "border-destructive/50" : "border-border",
						]}
					>
						<header class="flex flex-col gap-1.5 border-b border-border/60 px-4 pt-3 pb-2.5">
							<div class="flex items-baseline justify-between gap-2">
								<h4 class="font-display text-lg leading-tight">
									{#if onOpenWorkflow && group.workflowId}
										<button type="button" class="text-left underline-offset-4 hover:underline" onclick={() => onOpenWorkflow?.(group.workflowId as string)}>{group.title}</button>
									{:else}
										{group.title}
									{/if}
								</h4>
								<span class="shrink-0 text-xs text-muted-foreground">{group.jobs.length} {group.jobs.length === 1 ? "job" : "jobs"}</span>
							</div>
							{#if group.workflowName !== group.title}
								<p class="truncate text-xs text-muted-foreground" title={group.workflowPath}>
									runs {group.workflowName}
								</p>
							{/if}
							{#if group.packages && group.packages.length > 0}
								{@const shown = group.packages.slice(0, MAX_PACKAGES)}
								<p class="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground" title={group.packages.join(", ")}>
									<CiIconGlyph name="package" />
									<span>checks</span>
									{#each shown as name, index (name)}
										<span>{#if onOpenPackage}<button type="button" class="text-primary underline-offset-2 hover:underline" onclick={() => onOpenPackage?.(name)}>{shortName(name)}</button>{:else}{shortName(name)}{/if}{index < shown.length - 1 ? "," : ""}</span>
									{/each}
									{#if group.packages.length > shown.length}<span>+{group.packages.length - shown.length}</span>{/if}
								</p>
							{/if}
						</header>
						<ul class="flex flex-col py-1">
							{#each group.jobs as job (job.id)}
								<li>
									<button
										type="button"
										class={[
											"flex w-full flex-col gap-1 px-4 py-1.5 text-left text-sm hover:bg-muted/60",
											selectedJobId === job.id && "bg-muted",
										]}
										aria-pressed={selectedJobId === job.id}
										title={job.failures === null ? undefined : `${job.failures} failed of ${job.runs} runs`}
										onclick={() => onSelectJob?.(job.id)}
									>
										<span class="flex min-w-0 items-center gap-1.5">
											{#if job.state}
												<span class={["size-2 shrink-0 rounded-full", HEALTH_DOT[job.state]]} title={job.state} aria-label={job.state} data-health={job.state}></span>
											{:else if job.liveNode === true}
												<span
													class="size-2 shrink-0 rounded-full bg-primary"
													title="Needs a live SpacetimeDB node"
													aria-label="live node"
												></span>
											{/if}
											<span class="truncate" title={job.name}>{job.name}</span>
											{#if job.state && job.liveNode === true}
												<span class="shrink-0 text-muted-foreground" title="live node: starts a SpacetimeDB node" aria-label="live node"><CiIconGlyph name="live" class="size-3" /></span>
											{/if}
										</span>
										<CiJobGlyphs parts={glyphParts} summary={job.summary} p95Seconds={job.p95Seconds} triggerShare={job.triggerShare ?? null} redRate={job.redRate} meanSeconds={job.meanSeconds ?? null} scaleSeconds={scale} {alertAt} />
									</button>
								</li>
							{/each}
						</ul>
					</article>
				{/each}
			</div>
		</section>
	{/each}
</div>
