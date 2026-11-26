<script lang="ts">
	import type { CiEstatePod, CiEstateSizing as EstateSizing } from "./ci-types";

	let { sizing, error = null, pools }: {
		sizing: EstateSizing | null;
		error?: string | null;
		pools: readonly string[];
	} = $props();
	const poolIds = $derived([
		...new Set([...pools, ...(sizing?.pods.map((p) => p.pool ?? "Unattributed") ?? [])]),
	]);
	const observedPoolIds = $derived(poolIds.filter((id) =>
		sizing?.pods.some((p) => (p.pool ?? "Unattributed") === id),
	));
	const missingPoolIds = $derived(poolIds.filter((id) => !observedPoolIds.includes(id)));
	const number = (n: number | null, digits = 2) => n === null ? "unknown" : n.toFixed(digits);
	const bytes = (n: number | null) => n === null ? "unknown" : `${(n / 1024 ** 3).toFixed(2)} GiB`;
	const ratio = (n: number | null) => n === null ? "unknown" : `${(n * 100).toFixed(1)}%`;

	function pressure(pods: CiEstatePod[]) {
		const cpu = pods.filter((p) => p.cpuCores !== null)
			.sort((a, b) => (b.cpuCores ?? 0) - (a.cpuCores ?? 0))[0];
		const memory = pods.filter((p) => p.memoryPeakBytes !== null)
			.sort((a, b) => (b.memoryPeakBytes ?? 0) - (a.memoryPeakBytes ?? 0))[0];
		const ratios = pods.flatMap((p) => p.throttledRatio === null ? [] : [p.throttledRatio]);
		return {
			cpu, memory,
			throttle: ratios.length ? Math.max(...ratios) : null,
			oom: pods.filter((p) => p.oomObserved === true).length,
			oomUnknown: pods.filter((p) => p.oomObserved === null).length,
			restarts: pods.every((p) => p.restarts !== null)
				? pods.reduce((n, p) => n + (p.restarts ?? 0), 0) : null,
		};
	}
</script>

<section aria-labelledby="estate-sizing">
	<header>
		<div><p class="eyebrow">Estate sink · observed</p><h3 id="estate-sizing">Pool sizing</h3></div>
		<span class="badge">Read only</span>
	</header>
	{#if error}
		<p role="status">{error}</p>
	{:else if !sizing}
		<p role="status">Reading estate sizing…</p>
	{:else if sizing.unavailable}
		<p role="status">{sizing.unavailable}</p>
	{:else}
		<p class="muted window">{sizing.from} – {sizing.to} · UTC</p>
		<p class="muted">Runner shells and job pods are shown separately. Maxima are across observed pods. Each limit belongs to the pod with that maximum;
			these are not concurrent pool totals. CPU is a peak five-minute rate; memory is the observed
			lifetime peak including cache, with a marked working-set fallback.</p>
		<details class="method"><summary>How to read these samples</summary><p>{sizing.note}</p></details>
		<div class="pools">
			{#each observedPoolIds as id (id)}
				{@const poolPods = sizing.pods.filter((p) => (p.pool ?? "Unattributed") === id)}
 {#each ["job", "runner", "unknown"] as role (role)}
 {@const pods = poolPods.filter((p) => (p.role ?? "unknown") === role)}
 {#if pods.length}
 {@const stats = pressure(pods)}
 <article aria-label={`${id} ${role} sizing`} data-pool={id} data-role={role}>
 <h4>{id} <small>{role === "job" ? "Job pods" : role === "runner" ? "Runner shells" : "Role unknown"} · {pods.length} observed</small></h4>
					<dl>
						<div title={stats.cpu?.pod}>
							<dt>Highest pod CPU / limit</dt>
							<dd>{number(stats.cpu?.cpuCores ?? null)} / {number(stats.cpu?.cpuLimit ?? null)} <small>cores</small></dd>
						</div>
						<div><dt>Highest pod throttling</dt><dd>{ratio(stats.throttle)}</dd></div>
						<div title={stats.memory?.pod}>
							<dt>Largest pod memory / limit</dt>
							<dd>{bytes(stats.memory?.memoryPeakBytes ?? null)} / {bytes(stats.memory?.memoryLimitBytes ?? null)}<small class="source">{stats.memory?.memorySource ?? "unknown"}</small></dd>
						</div>
						<div><dt>OOMKilled observed</dt><dd>{stats.oom} pods <small>({stats.oomUnknown} unknown)</small></dd></div>
						<div><dt>Restarts · estimated increases</dt><dd>{number(stats.restarts, 1)}</dd></div>
					</dl>
					<details>
						<summary>Observed pods and sample times</summary>
						<div class="table-scroll"><table>
							<thead><tr><th>Pod</th><th>CPU / limit · cores</th><th>Throttled / periods</th><th>Memory / limit</th><th>OOMKilled</th><th>Restarts</th></tr></thead>
							<tbody>
								{#each pods as pod (pod.namespace + "/" + pod.pod)}
									<tr>
										<th>{pod.pod}{#if pod.derivedFrom}<small class="derived">ARC attribution derived from {pod.derivedFrom}</small>{/if}<small>{pod.namespace} · {pod.node ?? "node unknown"}</small><small>Newest pod-info sample: {pod.newest ?? "unknown"}</small></th>
										<td>{number(pod.cpuCores)} / {number(pod.cpuLimit)}</td>
										<td>{ratio(pod.throttledRatio)}</td>
										<td>{bytes(pod.memoryPeakBytes)} / {bytes(pod.memoryLimitBytes)}<small>{pod.memorySource}</small></td>
										<td>{pod.oomObserved === null ? "unknown" : pod.oomObserved ? "observed" : "not observed"}</td>
										<td>{number(pod.restarts, 1)}</td>
									</tr>
								{/each}
							</tbody>
						</table></div>
					</details>
				</article>
 {/if}
 {/each}
			{/each}
		</div>
		{#if missingPoolIds.length}
			<details><summary>{missingPoolIds.length} pools without estate samples · sizing unknown</summary><p class="muted">{missingPoolIds.join(", ")}</p></details>
		{/if}
	{/if}
	<p class="muted attribution">{sizing?.attribution ?? "Per-job estate attribution is unavailable without a verified pod-to-job join key."}</p>
</section>

<style>
	section { display: grid; gap: 0.8rem; }
	header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
	h3, h4, p { margin: 0; }
	h3 { font-size: 1.2rem; }
	h4 { font-family: var(--font-code); font-size: 0.85rem; }
	h4 small { font-family: var(--font-body); font-weight: 400; margin-left: 0.7rem; }
	.eyebrow, .badge { font-family: var(--font-code); text-transform: uppercase; font-size: 0.6rem; letter-spacing: 0.08em; color: var(--accent); }
	.badge { border: 1px solid var(--border); border-radius: 1rem; padding: 0.3rem 0.5rem; }
	.muted, small { color: var(--muted-foreground); font-size: 0.75rem; }
	.window { font-family: var(--font-code); font-size: 0.65rem; }
	.pools { display: grid; gap: 0.6rem; }
	article { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 1rem; }
	dl { display: grid; grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr)); gap: 0.8rem; margin: 1rem 0; }
	dt { font-size: 0.65rem; color: var(--muted-foreground); margin-bottom: 0.4rem; }
	dd { margin: 0; font-family: var(--font-code); font-size: 0.85rem; }
	dd small { font-size: 0.6rem; }
	.derived { color: var(--accent); }
	.source { display: block; margin-top: 0.3rem; }
	summary { cursor: pointer; font-size: 0.7rem; color: var(--primary); }
	summary:focus-visible { outline: 2px solid var(--ring); outline-offset: 3px; }
	.method p { font-size: 0.75rem; color: var(--muted-foreground); margin-top: 0.5rem; }
	.attribution { border-left: 2px solid var(--accent); padding-left: 0.7rem; }
	.table-scroll { overflow: auto; margin-top: 0.7rem; }
	table { border-collapse: collapse; width: 100%; min-width: 54rem; font-size: 0.7rem; }
	th, td { text-align: left; vertical-align: top; padding: 0.6rem; border-bottom: 1px solid var(--border); }
	th small, td small { display: block; font-weight: 400; font-size: 0.6rem; margin-top: 0.3rem; }
</style>
