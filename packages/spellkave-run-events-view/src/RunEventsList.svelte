<script lang="ts">
	import {
		compactParams,
		formatClock,
		type RunEventStep,
		stepHeadline,
	} from "./steps";

	let {
		steps,
		/** Newest first when true (website spectator default). */
		newestFirst = true,
		emptyMessage = "Nothing recorded yet.",
		showActor = false,
	}: {
		steps: RunEventStep[];
		newestFirst?: boolean;
		emptyMessage?: string;
		showActor?: boolean;
	} = $props();

	const visible = $derived(newestFirst ? [...steps].reverse() : steps);

	function actorTitle(step: RunEventStep): string | undefined {
		if (step.identity && step.world_slug) return `identity ${step.identity} · ${step.world_slug}`;
		if (step.identity) return `identity ${step.identity}`;
		if (step.world_slug) return step.world_slug;
		return undefined;
	}

	function labelClass(step: RunEventStep): string {
		return step.is_error ? "font-semibold text-destructive" : "font-semibold text-primary";
	}

	function metaLine(step: RunEventStep): string {
		const bits = [step.tool];
		if (step.duration_ms !== null) bits.push(`${step.duration_ms} ms`);
		if (step.correlation_id) bits.push(step.correlation_id);
		if (step.world_slug) bits.push(step.world_slug);
		return bits.join(" · ");
	}
</script>

{#if steps.length === 0}
	<p class="px-2 py-6 text-center font-sans text-sm text-muted-foreground">
		{emptyMessage}
	</p>
{:else}
	<ol class="flex flex-col gap-1 font-mono text-[0.8rem] leading-relaxed">
		{#each visible as step, i (step.correlation_id || `step-${i}`)}
			<li>
				<details class="group rounded-md px-2 py-1 hover:bg-muted/50 open:bg-muted/40">
					<summary
						class="flex cursor-pointer list-none flex-wrap items-baseline gap-x-2 select-none"
					>
						<span class="tabular-nums text-muted-foreground">{formatClock(step.ts)}</span>
						{#if showActor && step.actor_id}
							<span class="font-mono text-xs text-muted-foreground" title={actorTitle(step)}>
								{step.actor_id}
							</span>
						{/if}
						<span class={labelClass(step)}>{step.label}</span>
						{#if compactParams(step.params)}
							<span class="truncate text-muted-foreground">{compactParams(step.params)}</span>
						{/if}
						<span class="text-muted-foreground">→</span>
						<span class="min-w-0 flex-1 truncate">{stepHeadline(step)}</span>
					</summary>
					<div class="mt-2 grid gap-2 border-l-2 border-border pl-3">
						{#if step.text}
							<pre class="overflow-x-auto whitespace-pre-wrap font-sans text-sm">{step.text}</pre>
						{/if}
						{#if step.observation !== null && step.observation !== undefined}
							<pre class="overflow-x-auto text-xs text-muted-foreground">{JSON.stringify(step.observation, null, 2)}</pre>
						{/if}
						<p class="text-xs text-muted-foreground">{metaLine(step)}</p>
					</div>
				</details>
			</li>
		{/each}
	</ol>
{/if}
