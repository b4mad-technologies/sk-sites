<script lang="ts">
	/** Display-only prerequisite clocks and their independently measured sample counts. */
	import type { CiReadinessView } from "./ci-types";

	let {
		view,
		open = false,
	}: {
		view: CiReadinessView;
		open?: boolean;
	} = $props();
</script>

<details {open} class="rounded-lg border border-border p-4">
	<summary class="cursor-pointer text-base font-medium">
		{view.work} · {view.complete_heads} of {view.heads} complete heads
	</summary>
	<div class="mt-4 flex flex-col gap-4">
		<p class="text-sm">{view.workflow}</p>
		<p class="text-sm text-muted-foreground">{view.coverage}</p>
		<table class="w-full text-left text-sm" aria-label={`${view.work} readiness components`}>
			<thead class="border-b border-border text-muted-foreground">
				<tr>
					<th class="py-2 pr-4">Before-start component</th>
					<th class="pr-4">Median</th>
					<th>Measured sample</th>
				</tr>
			</thead>
			<tbody>
				{#each view.parts as part (part.part)}
					<tr class="border-b border-border/40">
						<td class="py-2 pr-4">{part.part}</td>
						<td class="py-2 pr-4 font-mono">{part.median}</td>
						<td class="py-2 text-muted-foreground">{part.samples}</td>
					</tr>
				{/each}
			</tbody>
		</table>
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm" aria-label={`${view.work} observed prerequisite clocks`}>
				<thead class="border-b border-border text-muted-foreground">
					<tr>
						<th class="py-2 pr-4">Observed chain stage</th>
						<th class="pr-4">Own execution</th>
						<th class="pr-4">Created to start</th>
						<th class="pr-4">After declared needs ready</th>
						<th class="pr-4">Creation gap</th>
						<th>Measured clocks</th>
					</tr>
				</thead>
				<tbody>
					{#each view.stages as stage (stage.definition + stage.job + stage.role)}
						<tr class="border-b border-border/40 align-top">
							<td class="py-3 pr-4">
								{stage.job}
								<p class="text-xs text-muted-foreground">
									{stage.role} · {stage.outcomes} · <code>{stage.definition}</code> · {stage.heads} heads
								</p>
							</td>
							<td class="py-3 pr-4 font-mono">{stage.execution}</td>
							<td class="py-3 pr-4 font-mono">{stage.created_to_start}</td>
							<td class="py-3 pr-4 font-mono">{stage.after_ready}</td>
							<td class="py-3 pr-4 font-mono">{stage.creation_gap}</td>
							<td class="py-3 text-xs text-muted-foreground">{stage.samples}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		{#if view.unavailable_reasons.length}
			<ul class="list-disc pl-5 text-sm text-muted-foreground">
				{#each view.unavailable_reasons as reason (reason)}
					<li>{reason}</li>
				{/each}
			</ul>
		{/if}
	</div>
</details>
