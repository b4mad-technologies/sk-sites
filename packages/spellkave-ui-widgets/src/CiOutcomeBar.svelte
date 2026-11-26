<script lang="ts">
	/**
	 * How a job's runs in the window ended, as one bar: the total first, then
	 * the share of each outcome, so "48 failures" reads against "671 runs".
	 */
	import { CI_GLOSSARY, conclusionHint } from "./ci-glossary";
	import type { CiOutcomeBarProps } from "./ci-types";
	import InfoHint from "./InfoHint.svelte";

	let { conclusions, window: span }: CiOutcomeBarProps = $props();

	// Fixed order and colours: green work, red work, then the runs that did none.
	const ORDER = ["success", "failure", "cancelled", "skipped"];
	const COLOUR: Record<string, string> = {
		success: "bg-accent",
		failure: "bg-destructive",
		cancelled: "bg-muted-foreground/50",
		skipped: "bg-muted-foreground/20",
	};

	const total = $derived(Object.values(conclusions).reduce((a, b) => a + b, 0));
	const parts = $derived(
		Object.entries(conclusions)
			.filter(([, n]) => n > 0)
			.sort((a, b) => {
				const ia = ORDER.indexOf(a[0]);
				const ib = ORDER.indexOf(b[0]);
				return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
			})
			.map(([name, n]) => ({ name, n, share: total > 0 ? n / total : 0 })),
	);
	const percent = (share: number) => `${share >= 0.1 ? Math.round(share * 100) : (share * 100).toFixed(1)} %`;
</script>

<div class="flex flex-col gap-1.5" data-slot="ci-outcome-bar">
	<p class="flex items-baseline gap-1.5 text-sm">
		<span class="font-mono tabular-nums">{total}</span>
		<span class="text-muted-foreground">{total === 1 ? "run" : "runs"}{span ? ` in ${span}` : ""}</span>
		<InfoHint label={CI_GLOSSARY.runs} />
	</p>
	{#if total > 0}
		<div class="flex h-2.5 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label={parts.map((p) => `${p.name} ${p.n}`).join(", ")}>
			{#each parts as part (part.name)}
				<span class={["h-full", COLOUR[part.name] ?? "bg-primary"]} style:width={`${part.share * 100}%`}></span>
			{/each}
		</div>
		<ul class="flex flex-wrap gap-x-4 gap-y-1 text-xs">
			{#each parts as part (part.name)}
				<li class="flex items-center gap-1.5">
					<span class={["inline-block size-2 rounded-full", COLOUR[part.name] ?? "bg-primary"]} aria-hidden="true"></span>
					<span>{part.name}</span>
					<span class="font-mono tabular-nums text-muted-foreground">{part.n} · {percent(part.share)}</span>
					<InfoHint label={conclusionHint(part.name)} />
				</li>
			{/each}
		</ul>
	{/if}
</div>
