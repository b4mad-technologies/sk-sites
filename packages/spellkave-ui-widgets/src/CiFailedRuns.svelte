<script lang="ts">
	/**
	 * The failed runs of one step, newest first, folded under one line: when,
	 * on main or which PR, the inner step that failed, the last output lines
	 * before the error, and a link to the run on GitHub.
	 */
	import type { CiFailedRunsView } from "./ci-types";

	let { failed }: { failed: CiFailedRunsView } = $props();
</script>

<details class="text-xs" data-slot="ci-failed-runs">
	<summary class="cursor-pointer text-destructive hover:underline">{failed.summary}</summary>
	<ol class="mt-1 flex flex-col gap-2">
		{#each failed.runs as run (run.url)}
			<li class="flex flex-col gap-0.5 border-l border-destructive/40 pl-2">
				<p class="flex flex-wrap items-baseline gap-x-2">
					<span class="font-mono tabular-nums">{run.date}</span>
					<span class="text-muted-foreground">{run.where}</span>
					{#if run.failing}<span>{run.failing}</span>{/if}
					<a class="text-primary underline-offset-2 hover:underline" href={run.url} target="_blank" rel="noreferrer">run on GitHub</a>
				</p>
				{#if run.error}
					<pre class="max-h-32 overflow-auto rounded-sm bg-muted/40 p-1.5 font-mono whitespace-pre-wrap text-muted-foreground">{run.error}</pre>
				{/if}
			</li>
		{/each}
	</ol>
</details>
