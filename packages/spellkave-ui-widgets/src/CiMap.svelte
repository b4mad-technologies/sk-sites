<script lang="ts">
	import CiEstateHistoryPanel from "./CiEstateHistory.svelte";
	import CiEstatePanel from "./CiEstateSizing.svelte";
	import CiStat from "./CiStat.svelte";
	/** A live Gantt and a linked, compact view of declared CI capabilities. */
	import type {
		CiEstateHistory,
		CiEstateSizing,
		CiMapRuns,
		CiMapStepSelection,
		CiMapStepTelemetry,
		CiMapTopology,
	} from "./ci-types";

	let {
		topology,
		runs,
		runsError = null,
		metrics = [],
		stepTelemetry = null,
		estateSizing = null,
		estateHistory = null,
		estateHistoryError = null,
		estateError = null,
		onInspectJob,
	}: {
		topology: CiMapTopology;
		runs: CiMapRuns | null;
		runsError?: string | null;
		metrics?: readonly { id: string; red: string; p95: string }[];
		stepTelemetry?: CiMapStepTelemetry | null;
		estateSizing?: CiEstateSizing | null;
		estateHistory?: CiEstateHistory | null;
		estateHistoryError?: string | null;
		estateError?: string | null;
		onInspectJob?: (id: Omit<CiMapStepSelection, "range"> | null) => void;
	} = $props();
	type Run = CiMapRuns["runs"][number];
	type Job = Run["jobs"][number];
	type Store = CiMapTopology["stores"][number];
	let selectedRun = $state("");
	let selection = $state<{ kind: "job" | "store" | "pool"; id: string } | null>(null);
	let tier = $state("all");
	let panel: HTMLElement;
	const successfulRun = $derived(
		runs?.runs.find(
			(r) =>
				r.selection &&
				r.conclusion === "success" &&
				r.origin !== null &&
				r.end !== null &&
				r.end > r.origin,
		),
	);
	const run = $derived(
		runs?.runs.find((r) => `${r.id}:${r.attempt}` === selectedRun) ??
			successfulRun ??
			runs?.runs.find((r) => r.origin !== null && r.end !== null && r.end > r.origin) ??
			runs?.runs[0],
	);
	const skipped = $derived(run?.jobs.filter((job) => job.conclusion === "skipped") ?? []);
	const executed = $derived(run?.jobs.filter((job) => job.conclusion !== "skipped") ?? []);
	const span = $derived(
		run?.origin !== null && run?.end !== null && run?.origin !== undefined && run?.end !== undefined
			? Math.max(1, run.end - run.origin)
			: 1,
	);
	const execution = $derived(
		selection?.kind === "job"
			? run?.jobs.find((job) => job.id === selection?.id || job.definition === selection?.id)
			: selection === null
				? [...executed].sort((a, b) => duration(b) - duration(a))[0]
				: undefined,
	);
	const definition = $derived(
		topology.jobs.find(
			(job) =>
				job.id === (execution?.definition ?? (selection?.kind === "job" ? selection.id : null)),
		),
	);
	const store = $derived(
		selection?.kind === "store"
			? topology.stores.find((store) => store.id === selection?.id)
			: undefined,
	);
	const pool = $derived(
		selection?.kind === "pool"
			? topology.pools.find((pool) => pool.id === selection?.id)
			: undefined,
	);
	const tiers = $derived([...new Set(topology.stores.map((store) => store.tier))]);
	const nodes = $derived([
		...new Set([
			...topology.pools.map((pool) => pool.node ?? "Node not recorded"),
			...topology.stores.flatMap((store) => (store.node ? [store.node] : [])),
		]),
	]);
	const ticks = [0, 1, 2, 3, 4, 5, 6];
	const colors = [
		"var(--primary)",
		"var(--accent)",
		"var(--destructive)",
		"color-mix(in srgb, var(--foreground) 65%, var(--accent))",
		"color-mix(in srgb, var(--primary) 45%, var(--accent))",
		"color-mix(in srgb, var(--foreground) 50%, var(--primary))",
	];
	const color = (id: string | undefined) =>
		id
			? colors[
					Math.max(
						0,
						topology.pools.findIndex((pool) => pool.id === id),
					) % colors.length
				]
			: "var(--muted-foreground)";
	const jobDefinition = (job: Job) =>
		topology.jobs.find((definition) => definition.id === job.definition);
	const duration = (job: Job) =>
		job.started === null || job.completed === null || job.completed < job.started
			? 0
			: job.completed - job.started;
	const seconds = (start: number | null | undefined, end: number | null | undefined) =>
		start === null || end === null || start === undefined || end === undefined || end < start
			? "unknown"
			: `${Math.round((end - start) / 1000)} s`;
	const minutes = (ms: number) => `${(ms / 60000).toFixed(ms >= 600000 ? 0 : 1)} min`;
	const percent = (at: number) =>
		run?.origin === null || run?.origin === undefined
			? 0
			: Math.max(0, Math.min(100, (100 * (at - run.origin)) / span));
	const waitStart = (job: Job) => job.ready ?? job.created ?? null;
	const validExecution = (job: Job) =>
		run?.origin !== null &&
		run?.origin !== undefined &&
		job.started !== null &&
		job.completed !== null &&
		job.completed >= job.started &&
		job.started >= run.origin;
	const hasWait = (job: Job) =>
		waitStart(job) !== null &&
		job.started !== null &&
		(waitStart(job) ?? 0) < job.started &&
		run?.origin !== null &&
		run?.origin !== undefined &&
		(waitStart(job) ?? 0) >= run.origin;
	const role = (id: string | null | undefined) => ({
		writer: !!id && !!store?.writers.includes(id),
		reader: !!id && !!store?.readers.includes(id),
	});
	const storeRole = (item: Store) => ({
		writer: !!definition && item.writers.includes(definition.id),
		reader: !!definition && item.readers.includes(definition.id),
	});
	const selected = (job: Job) => !!execution && execution.id === job.id;
	const relatedPool = (job: Job) => !!pool && !!jobDefinition(job)?.pools.includes(pool.id);
	const metric = $derived(metrics.find((metric) => metric.id === definition?.id));
	$effect(() => {
		onInspectJob?.(
			definition && execution && run
				? {
						job: definition.id,
						run: run.id,
						attempt: run.attempt,
						name: execution.name,
					}
				: null,
		);
	});
	const stepClock = (name: string) => {
		if (
			!stepTelemetry ||
			stepTelemetry.job !== definition?.id ||
			stepTelemetry.run !== run?.id ||
			stepTelemetry.attempt !== run?.attempt ||
			stepTelemetry.name !== execution?.name
		)
			return undefined;
		if (
			stepTelemetry.steps.filter((step) => step.name === name).length !== 1 ||
			definition?.steps?.filter((step) => step.name === name).length !== 1
		)
			return undefined;
		return stepTelemetry.steps.find((step) => step.name === name);
	};
	const maxStepClock = $derived(
		Math.max(1, ...(stepTelemetry?.steps.map((step) => step.seconds ?? 0) ?? [])),
	);
	function choose(kind: "job" | "store" | "pool", id: string, reveal = false) {
		selection = { kind, id };
		if (reveal && panel) panel.scrollIntoView?.({ block: "nearest", behavior: "auto" });
	}
	function resourceText(resources: Record<string, number> | null) {
		if (!resources) return "Resources unknown";
		const labels: Record<string, string> = {
			ephemeralRequestGiB: "ephemeral request",
			ephemeralLimitGiB: "ephemeral limit",
			runnerCpuRequest: "runner CPU request",
			runnerCpuLimit: "runner CPU limit",
			runnerMemoryRequestGiB: "runner RAM request",
			runnerMemoryLimitGiB: "runner RAM limit",
			jobCpuRequest: "job CPU request",
			jobCpuLimit: "job CPU limit",
			jobMemoryRequestGiB: "job RAM request",
			jobMemoryLimitGiB: "job RAM limit",
			jobEphemeralRequestGiB: "job ephemeral request",
			jobEphemeralLimitGiB: "job ephemeral limit",
			cpuLimit: "CPU limit",
			cpuRequest: "CPU request",
			memoryLimitGiB: "RAM limit",
			memoryRequestGiB: "RAM request",
			workPVCGiB: "work PVC",
			writableLayerLimitGiB: "scratch",
			spacetimeTmpfsGiB: "Spacetime tmpfs",
			nvmeEmptyDirGiB: "NVMe",
		};
		return Object.entries(resources)
			.map(([key, value]) => `${value}${key.endsWith("GiB") ? " GiB" : ""} ${labels[key] ?? key}`)
			.join(" · ");
	}
</script>

<section class="map" aria-label="CI map">
	<header class="map-heading">
		<p class="eyebrow">
			Live runs · repository topology · {topology.revision?.slice(0, 10) ?? "working tree"}
		</p>
		<h2>CI map</h2>
		<p class="intro">
			Follow a run from publication to its last job. Select a bar, pool or store to trace the work
			and its inputs.
		</p>
	</header>
	<div class="stat-tiles">
		<CiStat
			icon="clock"
			value={run?.origin !== null &&
			run?.end !== null &&
			run?.origin !== undefined &&
			run?.end !== undefined
				? minutes(span)
				: "—"}
			label="Selected run · observed wall"
			hint="First retained job creation to last retained completion, including gaps."
			tone="info"
		/>
		<CiStat
			icon="job"
			value={String(executed.length)}
			label="Non-skipped jobs"
			hint={`${skipped.length} skipped; retained jobs only, not a proof of complete delivery.`}
			tone="info"
		/>
		<CiStat
			icon="runner"
			value={String(topology.pools.length)}
			label="Runner pools"
			hint={`${topology.jobs.length} repository job definitions. Declared defaults and candidates, not observed historic placement.`}
			tone="info"
		/>
		<CiStat
			icon="package"
			value={String(topology.stores.length)}
			label="Caches and stores"
			hint={`Topology reviewed ${topology.reviewedAt}. Unconfirmed estate facts remain unknown.`}
			tone="info"
		/>
	</div>

	<section aria-labelledby="map-timeline">
		<div class="section-heading">
			<div>
				<p class="eyebrow">
					{run ? `Run ${run.id} · attempt ${run.attempt}` : "Live completion records"}
				</p>
				<h3 id="map-timeline">Timeline and critical chain</h3>
			</div>
			{#if runs?.runs.length}<label class="run-picker"
					>Run attempt <select
						aria-label="Run attempt"
						value={run ? `${run.id}:${run.attempt}` : ""}
						onchange={(event) => {
							selectedRun = event.currentTarget.value;
							selection = null;
						}}
						>{#each runs.runs as item (`${item.id}:${item.attempt}`)}<option
								value={`${item.id}:${item.attempt}`}
								>{item.id} / {item.attempt} · {item.conclusion ?? "outcome unknown"} · {item.workflow}</option
							>{/each}</select
					></label
				>{/if}
		</div>
		{#if runsError}<p role="alert">
				Run timings unavailable: {runsError}
			</p>{:else if !runs}<p role="status">Reading live run completions…</p>{:else if !run}<p>
				No retained runs in this window.
			</p>{/if}
		{#if run && !successfulRun}<p class="note">
				No successful CI selection completion is retained in this window. Showing an available
				attempt; all outcomes remain selectable.
			</p>{/if}
		<div class="legend" aria-label="Timeline legend">
			{#each topology.pools as item (item.id)}<button
					type="button"
					onclick={() => choose("pool", item.id)}
					aria-pressed={pool?.id === item.id}
					><i style:background={color(item.id)}></i>{item.id}</button
				>{/each}<span><i class="critical-key"></i>critical chain</span><span
				><i class="wait-key"></i>before-start delay</span
			>
		</div>
		<div class="split">
			<div class="gantt-shell">
				{#if run}
					{#snippet timelineLane(job: Job)}
						{@const access = role(job.definition)}
						{@const jobPools = jobDefinition(job)?.pools ?? []}
						<button
							type="button"
							class={[
								"gantt-row",
								selected(job) && "selected",
								access.writer && "writer",
								access.reader && "reader",
								relatedPool(job) && "pool-related",
							]}
							style:--pool-color={color(jobPools[0])}
							onclick={() => choose("job", job.id)}
							aria-pressed={selected(job)}
							aria-label={`${job.name} · ${job.conclusion}`}
						>
							<span class="job-label" title={job.name}
								><i style:background={color(jobPools[0])}></i><span>{job.name}</span
								>{#if access.writer || access.reader}<small
										>{access.writer ? "W" : ""}{access.reader ? "R" : ""}</small
									>{/if}</span
							>
							<span class="track">
								{#if hasWait(job)}<span
										class="wait"
										style:left={`${percent(waitStart(job) ?? 0)}%`}
										style:width={`${Math.max(0, percent(job.started ?? 0) - percent(waitStart(job) ?? 0))}%`}
										title={job.ready === null || job.ready === undefined
											? "Observed created-to-start delay: includes upstream work and scheduling"
											: "Observed scheduling delay after declared readiness"}
									></span>{/if}
								{#if validExecution(job)}<span
										class={["bar", job.critical && "critical"]}
										style:left={`${percent(job.started ?? 0)}%`}
										style:width={`${Math.max(0.35, percent(job.completed ?? 0) - percent(job.started ?? 0))}%`}
										title={`${jobPools.length > 1 ? "Pool candidates: " : "Declared pool: "}${jobPools.join(", ") || "unknown"}`}
										><span>{seconds(job.started, job.completed)}</span></span
									>{:else}<span class="unknown-clock">{job.conclusion} · clocks unavailable</span
									>{/if}
							</span>
							<span class="duration">{seconds(job.started, job.completed)}</span>
						</button>
					{/snippet}
					<div class="gantt-scroll">
						<div class="gantt" aria-label="Observed job execution timeline">
							<div class="gantt-axis">
								<span>Job</span>
								<div>
									{#each ticks as tick (tick)}<span style:left={`${(tick / 6) * 100}%`}
											>{minutes((span * tick) / 6)}</span
										>{/each}
								</div>
								<span>Wall</span>
							</div>
							{#each executed as job (job.id)}{@render timelineLane(job)}{/each}
							{#if skipped.length}{#key `${run.id}:${run.attempt}`}<details class="skipped-jobs">
										<summary>{skipped.length} skipped</summary
										>{#each skipped as job (job.id)}{@render timelineLane(job)}{/each}
									</details>{/key}{/if}
						</div>
					</div>
					<p class="note timeline-caption">
						{run.chainComplete
							? "Ring: inferred latest-finish critical chain."
							: "Ring: known critical-chain segments; the chain is incomplete."} Hatching is observed
						delay before execution, including upstream work when readiness is unavailable. Pool colors
						show declared candidates, not historic runner placement.
					</p>
					<details class="evidence">
						<summary
							>Run evidence and coverage{#if !run.chainComplete}
								· {run.chainReasons.length} gaps{/if}</summary
						>
						<p class="note">{runs?.note}</p>
						<p class="note">
							Window: {runs?.from} – {runs?.to}. Invalid: {runs?.invalid}; conflicts: {runs?.conflicts}.
						</p>
						<ul>
							{#each run.chainReasons as reason (reason)}<li class="note">
									{reason}
								</li>{/each}
						</ul>
					</details>
				{/if}
			</div>
			<aside class="detail-panel" aria-label="Map details" bind:this={panel} aria-live="polite">
				{#if store}
					<p class="eyebrow">Store · {store.tier}</p>
					<h4>{store.name ?? store.id}</h4>
					<p>{store.summary ?? store.kind ?? store.tier}</p>
					<code class="location">{store.location}</code>
					<dl>
						<dt>Keying</dt>
						<dd>{store.keying}</dd>
						<dt>Retention</dt>
						<dd>{store.retention ?? "Unknown"}</dd>
					</dl>
					<p class="note">{store.note}</p>
					<div class="access-lists">
						{#each ["writers", "readers"] as access (access)}<h5>
								{access === "writers" ? "Writers · solid" : "Readers · dashed"}
							</h5>
							{#each access === "writers" ? store.writers : store.readers as id (id)}<button
									type="button"
									class={["link-chip", access === "readers" && "dashed"]}
									onclick={() => choose("job", id)}
									>{topology.jobs.find((job) => job.id === id)?.name ?? id}</button
								>{/each}{/each}
					</div>
				{:else if pool}
					<p class="eyebrow">Runner pool · configured</p>
					<h4>{pool.id}</h4>
					<CiEstateHistoryPanel history={estateHistory} pool={pool.id} error={estateHistoryError} />
					<dl>
						<dt>Node</dt>
						<dd>{pool.node ?? "Unknown"}</dd>
						<dt>Mode / capacity</dt>
						<dd>{pool.mode} · {pool.slots ?? "unknown"} slots</dd>
						<dt>Resources</dt>
						<dd>{resourceText(pool.resources)}</dd>
						{#if pool.note}<dt>Storage policy</dt>
							<dd>{pool.note}</dd>{/if}
					</dl>
					<h5>Declared jobs</h5>
					{#each topology.jobs.filter((job) => job.pools.includes(pool.id)) as job (job.id)}<button
							type="button"
							class="link-chip"
							onclick={() => choose("job", job.id)}>{job.name}</button
						>{/each}
				{:else if execution || definition}
					<p class="eyebrow">
						Job · {execution?.conclusion ?? "repository definition"}
					</p>
					<h4>{execution?.name ?? definition?.name}</h4>
					<p class="note">
						{definition?.id ?? "Definition attribution unavailable"}
					</p>
					<div class="pool-chips">
						{#each definition?.pools ?? [] as id (id)}<button
								type="button"
								class="pool-chip"
								style:--pool-color={color(id)}
								onclick={() => choose("pool", id)}>{id}</button
							>{/each}
					</div>
					<p class="note">
						{(definition?.pools.length ?? 0) > 1
							? "Conditional pool candidates from the selected revision; the run’s actual pool is not recorded here."
							: "Pool placement is declared at the selected revision, not observed from this run."}
					</p>
					<dl class="job-metrics">
						<dt>This execution</dt>
						<dd>{seconds(execution?.started, execution?.completed)}</dd>
						<dt>Red / p95 · selected window</dt>
						<dd>{metric?.red ?? "unknown"} / {metric?.p95 ?? "unknown"}</dd>
						{#if execution}<dt>Delay basis</dt>
							<dd>
								{execution.ready !== null && execution.ready !== undefined
									? "Declared needs ready → start"
									: "Created → start; upstream / scheduling unsplit"}
							</dd>
							<dt>Before-start delay</dt>
							<dd>{seconds(waitStart(execution), execution.started)}</dd>{/if}
					</dl>
					{#if execution}<a class="external" href={execution.url} target="_blank" rel="noreferrer"
							>Open this job on GitHub ↗</a
						>{/if}
					<h5>Job steps <span class="note">· selected repository ref</span></h5>
					{#if definition?.steps?.length}<p class="note">
							Step bars show retained step clocks for this run, attempt and exact job name.
							Missing bars mean no unique matching step clock; repository steps may differ from this
							historical run.
						</p>
						{#if stepTelemetry?.sourceNote}<p class="note">{stepTelemetry.sourceNote}</p>{/if}
						{#if stepTelemetry?.unavailable}<p class="note">
								Selected-run step clocks unavailable.
							</p>
							<details>
								<summary>Source response</summary>
								<p class="note">{stepTelemetry.unavailable}</p>
							</details>{/if}
						<ol class="steps">
							{#each definition.steps as step, index (index)}<li>
									<span>{step.name}</span>
									{#if stepClock(step.name)?.seconds !== null && stepClock(step.name)?.seconds !== undefined}<div
											class="step-stat"
										>
											<span
												style:width={((stepClock(step.name)?.seconds ?? 0) / maxStepClock) * 100 +
													"%"}
											></span><small>{Math.round(stepClock(step.name)?.seconds ?? 0)} s</small>
										</div>{/if}{#if step.uses}<code>{step.uses}</code>{/if}{#if step.run}<details>
											<summary>Command</summary>
											<pre>{step.run}</pre>
										</details>{/if}{#if step.condition}<small>Conditional: {step.condition}</small
										>{/if}
								</li>{/each}
						</ol>{:else}<p class="note">Steps unavailable for this definition.</p>{/if}
					<h5>Stores</h5>
					<div class="store-links">
						{#each topology.stores.filter((item) => definition && (item.writers.includes(definition.id) || item.readers.includes(definition.id))) as item (item.id)}{@const access =
								storeRole(item)}<button
								type="button"
								class={["link-chip", !access.writer && access.reader && "dashed"]}
								onclick={() => choose("store", item.id)}
								>{access.writer ? "writes" : "reads"}
								{item.name ?? item.id}</button
							>{/each}
					</div>
				{:else}<p class="eyebrow">Trace the map</p>
					<h4>Select a job, pool or store</h4>
					<p class="note">
						Execution clocks, repository steps and declared writers/readers appear here.
					</p>{/if}
			</aside>
		</div>
	</section>

	<CiEstatePanel sizing={estateSizing} error={estateError} pools={topology.pools.map((p) => p.id)} />
	<section aria-labelledby="map-pools">
		<div class="section-heading">
			<div>
				<p class="eyebrow">Where the work runs</p>
				<h3 id="map-pools">Pools by node</h3>
			</div>
			<span class="note">Configured capacity · unknown is unknown</span>
		</div>
		<div class="nodes">
			{#each nodes as node (node)}<article class="node-card">
					<header>
						<h4>{node}</h4>
						<small
							>{topology.pools.filter((pool) => (pool.node ?? "Node not recorded") === node).length} pools</small
						>
					</header>
					{#each topology.pools.filter((pool) => (pool.node ?? "Node not recorded") === node) as item (item.id)}<button
							type="button"
							class={["pool-card", pool?.id === item.id && "selected"]}
							style:--pool-color={color(item.id)}
							aria-pressed={pool?.id === item.id}
							onclick={() => choose("pool", item.id, true)}
							><b>{item.id}</b><span>{item.mode} · {item.slots ?? "unknown"} slots</span><small
								>{item.resources ? "View resource requests and limits →" : "Resources unknown"}</small
							></button
						>{/each}
					{#if topology.stores.some((store) => store.node === node)}<p class="note">
							Declared storage host · {topology.stores.filter((store) => store.node === node)
								.length} stores
						</p>
						<div class="store-links">
							{#each topology.stores.filter((store) => store.node === node) as item (item.id)}<button
									type="button"
									class="link-chip"
									onclick={() => choose("store", item.id, true)}>{item.name ?? item.id}</button
								>{/each}
						</div>{/if}
				</article>{/each}
		</div>
	</section>

	<section aria-labelledby="map-stores">
		<div class="section-heading">
			<div>
				<p class="eyebrow">External caches and stores</p>
				<h3 id="map-stores">What lies where</h3>
			</div>
			<div class="filters" role="group" aria-label="Store tier">
				<button type="button" aria-pressed={tier === "all"} onclick={() => (tier = "all")}
					>All tiers</button
				>{#each tiers as value (value)}<button
						type="button"
						aria-pressed={tier === value}
						onclick={() => (tier = value)}>{value}</button
					>{/each}
			</div>
		</div>
		<p class="note">
			Select a store to highlight writers with a solid outline and readers with a dashed outline.
		</p>
		<div class="stores">
			{#each topology.stores.filter((store) => tier === "all" || store.tier === tier) as item (item.id)}{@const access =
					storeRole(item)}<button
					type="button"
					aria-label={item.name ?? item.id}
					class={[
						"store-card",
						store?.id === item.id && "selected",
						access.writer && "writer",
						access.reader && "reader",
					]}
					aria-pressed={store?.id === item.id}
					onclick={() => choose("store", item.id, true)}
					><b>{item.name ?? item.id}</b><span class="kind">{item.kind ?? item.tier}</span><code
						>{item.location}</code
					><span class="summary">{item.summary ?? item.keying}</span><small
						>{item.writers.length} writers · {item.readers.length} readers</small
					>{#if access.writer || access.reader}<span class="access-badge"
							>{access.writer ? "writes" : ""}{access.writer && access.reader
								? " + "
								: ""}{access.reader ? "reads" : ""}</span
						>{/if}</button
				>{/each}
		</div>
	</section>

	{#if topology.cacheFillLanes?.length}<section aria-labelledby="map-cache-fill">
			<p class="eyebrow">Declared fill routes · main writers and PR readers</p>
			<h3 id="map-cache-fill">How the caches get filled</h3>
			<p class="note">
				Transfer relationships from the topology handoff. These lanes are not an observed schedule
				and their durations must not be added.
			</p>
			<div class="fill-lanes">
				{#each topology.cacheFillLanes as lane (lane.id)}<article class="fill-lane">
						<h4>{lane.name} <small>{lane.trigger}</small></h4>
						<div class="fill-stages">
							{#each lane.stages as stage, index (index)}<button
									type="button"
									onclick={() =>
										stage.job
											? choose("job", stage.job, true)
											: stage.store
												? choose("store", stage.store, true)
												: undefined}
									><b>{stage.label}</b><span
										>{stage.job
											? (topology.jobs.find((job) => job.id === stage.job)?.name ?? stage.job)
											: (topology.stores.find((store) => store.id === stage.store)?.name ??
												stage.store)}</span
									>{#if stage.note}<small>{stage.note}</small>{/if}</button
								>{/each}
						</div>
					</article>{/each}
			</div>
		</section>{/if}

	{#if topology.levers?.length}<section aria-labelledby="map-levers">
			<p class="eyebrow">Work and configuration</p>
			<h3 id="map-levers">Levers</h3>
			<p class="note">
				Checked-in notes reviewed {topology.reviewedAt}; rollout state and performance improvements
				are not inferred from this table.
			</p>
			<div class="table-scroll">
				<table>
					<thead><tr><th>Lever</th><th>Effect</th><th>State</th><th>Where</th></tr></thead><tbody
						>{#each topology.levers as lever (lever.id)}<tr
								><th scope="row">{lever.name}</th><td>{lever.effect}</td><td
									><span class="state">{lever.state}</span></td
								><td
									>{#if lever.url}<a href={lever.url} target="_blank" rel="noreferrer"
											>{lever.where}</a
										>{:else}{lever.where}{/if}</td
								></tr
							>{/each}</tbody
					>
				</table>
			</div>
		</section>{/if}
	<footer class="note">
		Topology reviewed {topology.reviewedAt}. {topology.note}
	</footer>
</section>

<style>
	.step-stat {
		position: relative;
		height: 1.25rem;
		margin: 0.2rem 0;
	}
	.step-stat > span {
		display: block;
		position: absolute;
		bottom: 0;
		height: 2px;
		background: var(--destructive);
	}
	.step-stat > small {
		font-family: var(--font-code);
		text-align: right;
	}
	.map {
		display: grid;
		gap: 2rem;
		width: 100%;
		min-width: 0;
	}
	.map section,
	.map header,
	.split > *,
	.section-heading > *,
	.gantt-shell,
	.fill-lane {
		min-width: 0;
	}
	.map-heading h2 {
		font-family: var(--font-display);
		font-size: 2.5rem;
		line-height: 1.1;
		margin: 0.25rem 0;
	}
	.intro {
		max-width: 80ch;
		font-size: 0.9rem;
		color: var(--muted-foreground);
	}
	.eyebrow {
		font-family: var(--font-code);
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--muted-foreground);
		margin: 0 0 0.35rem;
	}
	.stat-tiles {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.75rem;
	}
	.section-heading {
		display: flex;
		justify-content: space-between;
		align-items: end;
		gap: 1rem;
		flex-wrap: wrap;
		margin-bottom: 0.7rem;
	}
	h3 {
		font-family: var(--font-display);
		font-size: 1.6rem;
		margin: 0;
	}
	h4 {
		font-weight: 650;
		margin: 0 0 0.5rem;
	}
	h5 {
		font-weight: 650;
		margin: 1.1rem 0 0.4rem;
		font-size: 0.8rem;
	}
	.note,
	small {
		font-size: 0.75rem;
		line-height: 1.5;
		color: var(--muted-foreground);
	}
	p {
		margin: 0.5rem 0;
	}
	.run-picker {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.7rem;
		max-width: 100%;
	}
	select {
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 0.4rem;
		background: var(--card);
		color: var(--foreground);
		max-width: 100%;
		width: 27rem;
	}
	.legend {
		display: flex;
		gap: 0.5rem 0.8rem;
		flex-wrap: wrap;
		font-size: 0.65rem;
		color: var(--muted-foreground);
		margin: 0.6rem 0 0.9rem;
	}
	.legend button,
	.legend > span {
		display: inline-flex;
		gap: 0.3rem;
		align-items: center;
	}
	.legend i,
	.job-label i {
		display: inline-block;
		width: 0.55rem;
		height: 0.55rem;
		flex-shrink: 0;
		border-radius: 0.1rem;
	}
	.critical-key {
		border: 2px solid var(--destructive);
	}
	.wait-key {
		background: repeating-linear-gradient(
			125deg,
			var(--muted-foreground) 0 1px,
			transparent 1px 4px
		);
	}
	.split {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 20rem;
		gap: 1rem;
		align-items: start;
	}
	.gantt-scroll {
		overflow: auto;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--card);
	}
	.gantt {
		min-width: 40rem;
		padding: 0.65rem;
	}
	.gantt-row,
	.gantt-axis {
		display: grid;
		grid-template-columns: minmax(10rem, 28%) 1fr 3.6rem;
		gap: 0.65rem;
		align-items: center;
		width: 100%;
		padding: 0.2rem 0.25rem;
	}
	.gantt-axis {
		padding-bottom: 0.85rem;
		font-size: 0.65rem;
		color: var(--muted-foreground);
	}
	.gantt-axis > div {
		position: relative;
		height: 1rem;
		margin-right: 0.3rem;
	}
	.gantt-axis > div > span {
		position: absolute;
		transform: translateX(-50%);
		white-space: nowrap;
	}
	.gantt-axis > div > span:first-child {
		transform: none;
	}
	.gantt-axis > div > span:last-child {
		transform: translateX(-100%);
	}
	.gantt-row {
		text-align: left;
		min-height: 2.1rem;
		border-radius: 0.2rem;
		margin: 0.1rem 0;
	}
	.gantt-row:hover {
		background: color-mix(in srgb, var(--foreground) 5%, transparent);
	}
	.job-label {
		font-size: 0.73rem;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		min-width: 0;
	}
	.job-label > span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.job-label small {
		margin-left: auto;
		color: var(--primary);
	}
	.duration {
		font-family: var(--font-code);
		font-size: 0.65rem;
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	.track {
		position: relative;
		display: block;
		height: 1.3rem;
		background: repeating-linear-gradient(
			to right,
			color-mix(in srgb, var(--foreground) 15%, transparent) 0 1px,
			transparent 1px calc(100% / 6)
		);
	}
	.bar,
	.wait {
		position: absolute;
		top: 0.2rem;
		height: 0.9rem;
		border-radius: 0.12rem;
		min-width: 2px;
	}
	.bar {
		background: var(--pool-color);
		color: var(--background);
		overflow: hidden;
	}
	.bar > span {
		font-family: var(--font-code);
		font-size: 0.6rem;
		position: relative;
		display: block;
		margin-left: 0.3rem;
		white-space: nowrap;
	}
	.bar.critical {
		outline: 2px solid var(--destructive);
		outline-offset: 2px;
	}
	.wait {
		background: repeating-linear-gradient(
			125deg,
			color-mix(in srgb, var(--pool-color) 70%, transparent) 0 1px,
			transparent 1px 4px
		);
	}
	.unknown-clock {
		font-size: 0.62rem;
		color: var(--muted-foreground);
	}
	.skipped-jobs > summary {
		font-size: 0.75rem;
		color: var(--muted-foreground);
		padding: 0.6rem 0.25rem;
	}
	.timeline-caption {
		margin: 0.7rem 0;
	}
	.evidence {
		font-size: 0.75rem;
	}
	.evidence summary {
		cursor: pointer;
		color: var(--muted-foreground);
	}
	.detail-panel {
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 1rem;
		font-size: 0.8rem;
		position: sticky;
		top: 1rem;
		max-height: 48rem;
		overflow: auto;
		overflow-wrap: anywhere;
	}
	.detail-panel h4 {
		font-size: 1.1rem;
	}
	.location {
		display: block;
		overflow-wrap: anywhere;
		font-size: 0.7rem;
		margin: 0.6rem 0;
	}
	dl {
		display: grid;
		grid-template-columns: 7rem 1fr;
		gap: 0.45rem 0.6rem;
		margin: 0.8rem 0;
		font-size: 0.75rem;
	}
	dt {
		color: var(--muted-foreground);
	}
	dd {
		margin: 0;
	}
	.pool-chips,
	.store-links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
	}
	.pool-chip {
		border: 1px solid var(--pool-color);
		border-left: 4px solid var(--pool-color);
		border-radius: 0.2rem;
		padding: 0.25rem 0.4rem;
		font-size: 0.65rem;
		text-align: left;
	}
	.link-chip {
		display: inline-block;
		border: 1px solid var(--border);
		border-radius: 1rem;
		padding: 0.15rem 0.45rem;
		font-family: var(--font-code);
		font-size: 0.65rem;
		text-align: left;
		margin: 0.15rem 0.2rem 0.15rem 0;
		overflow-wrap: anywhere;
	}
	.dashed {
		border-style: dashed;
	}
	.external,
	a {
		color: var(--primary);
	}
	.steps {
		padding-left: 1.1rem;
	}
	.steps > li {
		font-size: 0.75rem;
		padding: 0.4rem 0;
		border-bottom: 1px solid color-mix(in srgb, var(--border) 45%, transparent);
	}
	.steps code,
	.steps small {
		display: block;
		font-size: 0.65rem;
		color: var(--muted-foreground);
	}
	pre {
		font-size: 0.65rem;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		background: var(--background);
		padding: 0.5rem;
	}
	.steps summary {
		color: var(--primary);
		cursor: pointer;
		font-size: 0.65rem;
	}
	.nodes {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
		gap: 0.8rem;
		align-items: start;
	}
	.node-card {
		padding: 0.8rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--card);
	}
	.node-card header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}
	.node-card header h4 {
		font-size: 0.8rem;
	}
	.node-card header small {
		font-family: var(--font-code);
		text-transform: uppercase;
		font-size: 0.55rem;
	}
	.pool-card {
		display: block;
		width: 100%;
		text-align: left;
		border: 1px solid color-mix(in srgb, var(--border) 45%, transparent);
		border-left: 4px solid var(--pool-color);
		border-radius: 0.2rem;
		padding: 0.5rem;
		margin-top: 0.4rem;
	}
	.pool-card b {
		display: block;
		font-family: var(--font-code);
		font-size: 0.68rem;
	}
	.pool-card span,
	.pool-card small {
		display: block;
		font-size: 0.65rem;
		color: var(--muted-foreground);
	}
	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
	}
	.filters button {
		border: 1px solid var(--border);
		border-radius: 1rem;
		padding: 0.3rem 0.65rem;
		font-size: 0.65rem;
	}
	.filters button[aria-pressed="true"] {
		background: var(--primary);
		color: var(--primary-foreground);
		border-color: var(--primary);
	}
	.stores {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.65rem;
	}
	.store-card {
		position: relative;
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 0.8rem;
		text-align: left;
		display: flex;
		flex-direction: column;
		align-items: start;
		gap: 0.3rem;
		min-height: 10rem;
		overflow: hidden;
	}
	.store-card b {
		font-size: 0.8rem;
	}
	.kind {
		font-family: var(--font-code);
		font-size: 0.55rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--accent);
	}
	.store-card code {
		font-size: 0.6rem;
		line-height: 1.4;
		color: var(--muted-foreground);
		overflow-wrap: anywhere;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.store-card .summary {
		font-size: 0.72rem;
	}
	.store-card small {
		font-size: 0.6rem;
		margin-top: auto;
	}
	.access-badge {
		font-family: var(--font-code);
		font-size: 0.6rem;
		color: var(--primary);
	}
	.selected,
	.pool-related {
		outline: 2px solid var(--primary);
		outline-offset: -2px;
	}
	.writer {
		outline: 2px solid var(--primary);
		outline-offset: -2px;
	}
	.reader:not(.writer) {
		outline: 2px dashed var(--primary);
		outline-offset: -2px;
	}
	.writer.reader {
		border-bottom: 2px dashed var(--primary);
	}
	.fill-lanes {
		display: grid;
		gap: 0.6rem;
		margin-top: 0.75rem;
	}
	.fill-lane {
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 0.75rem;
		background: var(--card);
	}
	.fill-lane h4 {
		font-family: var(--font-code);
		font-size: 0.7rem;
	}
	.fill-lane h4 small {
		font-family: var(--font-body);
		font-size: 0.65rem;
		font-weight: 400;
		display: inline;
		margin-left: 0.5rem;
	}
	.fill-stages {
		display: flex;
		gap: 1.1rem;
		overflow: auto;
		padding: 0.15rem;
	}
	.fill-stages > button {
		position: relative;
		border: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
		border-radius: 0.2rem;
		padding: 0.5rem;
		min-width: 8.5rem;
		max-width: 13rem;
		text-align: left;
		flex: 1;
	}
	.fill-stages > button + button:before {
		content: "→";
		position: absolute;
		left: -1rem;
		top: 35%;
		color: var(--muted-foreground);
	}
	.fill-stages b {
		display: block;
		font-size: 0.72rem;
	}
	.fill-stages span,
	.fill-stages small {
		display: block;
		font-size: 0.65rem;
		color: var(--muted-foreground);
	}
	.table-scroll {
		overflow: auto;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		margin-top: 0.6rem;
		background: var(--card);
	}
	table {
		border-collapse: collapse;
		width: 100%;
		font-size: 0.75rem;
		min-width: 42rem;
	}
	th,
	td {
		text-align: left;
		padding: 0.65rem 0.8rem;
		border-bottom: 1px solid color-mix(in srgb, var(--border) 40%, transparent);
		vertical-align: top;
	}
	thead th {
		font-family: var(--font-code);
		font-size: 0.6rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--muted-foreground);
	}
	tbody th {
		font-weight: 500;
		width: 23%;
	}
	.state {
		display: inline-block;
		border: 1px solid var(--border);
		border-radius: 1rem;
		padding: 0.1rem 0.4rem;
		font-size: 0.6rem;
		white-space: nowrap;
		color: var(--accent);
	}
	footer {
		border-top: 1px solid var(--border);
		padding-top: 0.8rem;
	}
	button,
	summary {
		cursor: pointer;
	}
	button:focus-visible,
	a:focus-visible,
	summary:focus-visible,
	select:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 3px;
	}
	@media (max-width: 1150px) {
		.split {
			grid-template-columns: minmax(0, 1fr) 17rem;
		}
		.stores {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
	@media (max-width: 800px) {
		.split {
			grid-template-columns: 1fr;
		}
		.detail-panel {
			position: static;
			max-height: none;
		}
		.stat-tiles {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.stores {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.run-picker {
			width: 100%;
		}
		select {
			width: 100%;
		}
	}
	@media (max-width: 480px) {
		.stores {
			grid-template-columns: 1fr;
		}
		.map {
			gap: 1.5rem;
		}
		.map-heading h2 {
			font-size: 2rem;
		}
		.stat-tiles {
			gap: 0.4rem;
		}
		.fill-lane h4 small {
			display: block;
			margin-left: 0;
		}
	}
</style>
