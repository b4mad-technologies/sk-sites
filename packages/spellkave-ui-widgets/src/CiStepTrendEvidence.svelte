<script lang="ts">
	/** Display-only clock limits and coverage for the shared recorded-step trend report. */
	import type { CiStepTrendEvidenceView } from "./ci-types";

	let {
		info,
	}: {
		info: CiStepTrendEvidenceView;
	} = $props();
</script>

<section class="space-y-2 rounded-lg border border-border bg-card p-4 text-sm" data-report="step-trend-coverage">
	<h3 class="font-medium">Recorded step: {info.title}</h3>
	<p>{info.clock}</p>
	<ul>
		{#each info.coverageText as line (line)}
			<li>{line}</li>
		{/each}
	</ul>
</section>
