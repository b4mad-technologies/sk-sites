<script lang="ts">
	/**
	 * What runs inside a step that uses a repository composite action: the
	 * action's first description sentence, then its inner steps folded under
	 * "N inner steps". A nested local action with more than one step folds
	 * open one more level. "external" marks a remote action, "sometimes" a
	 * step with an `if:` (the condition shows on hover). Inner-step numbers
	 * sit beside the name when the runner reported them.
	 */
	import CiActionSteps from "./CiActionSteps.svelte";
	import type { CiActionStepView, CiActionView } from "./ci-types";

	let { action, nested = false }: { action: CiActionView; nested?: boolean } = $props();
</script>

{#snippet line(step: CiActionStepView)}
	<span>{step.title}</span>
	{#if step.marks.includes("external")}
		{#if step.link}
			<a class="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline" href={step.link} target="_blank" rel="noreferrer">external</a>
		{:else}
			<span class="text-xs text-muted-foreground">external</span>
		{/if}
	{/if}
	{#if step.condition}
		<span class="cursor-help text-xs text-muted-foreground" title="runs only if: {step.condition}">sometimes</span>
	{/if}
	{#if step.stats}
		<span class={["font-mono text-xs tabular-nums", step.stats.failures > 0 ? "text-destructive" : "text-muted-foreground"]} title="{step.stats.failures} of {step.stats.runs} runs failed">{step.stats.red} · {step.stats.mean}</span>
	{/if}
	{#if step.measurement}
		<span class="text-xs text-muted-foreground">{step.measurement}</span>
	{/if}
{/snippet}

{#snippet list(steps: readonly CiActionStepView[])}
	<ol class={["mt-0.5 flex list-decimal flex-col gap-0.5 text-sm text-foreground", nested ? "pl-4" : "pl-5"]}>
		{#each steps as step, index (index)}
			<li>
				{#if step.action}
					<!-- A nested action folds under its own line; its list follows without a second fold. -->
					<details>
						<summary class="cursor-pointer">
							<span class="inline-flex flex-wrap items-baseline gap-x-1.5">{@render line(step)} <span class="font-mono text-xs text-muted-foreground" title={step.action.name}>{step.action.where}</span> <span class="text-xs text-muted-foreground">· {step.action.summary}</span></span>
						</summary>
						<CiActionSteps action={step.action} nested />
					</details>
				{:else}
					<span class="inline-flex flex-wrap items-baseline gap-x-1.5">{@render line(step)}</span>
				{/if}
			</li>
		{/each}
	</ol>
{/snippet}

{#if nested}
	{@render list(action.steps)}
{:else}
	<div class="flex flex-col gap-0.5 text-xs text-muted-foreground" data-slot="ci-action-steps">
		{#if action.lead}
			<p class="max-w-[72ch] leading-relaxed">{action.lead}</p>
		{/if}
		<details>
			<summary class="cursor-pointer hover:text-foreground">{action.summary}</summary>
			{@render list(action.steps)}
		</details>
	</div>
{/if}
