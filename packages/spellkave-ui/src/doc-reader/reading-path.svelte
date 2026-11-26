<script lang="ts">
	/**
	 * A role picker and the documents that role should read, in order. Each
	 * step is a real link with one line on why it comes next, so the path
	 * works with a middle click and without JavaScript routing.
	 */
	import { cn } from "../lib/utils";
	import type { DocNavigate, ReadingRole } from "./types";

	let {
		roles,
		selected = $bindable(roles[0]?.id ?? ""),
		onNavigate,
		class: className,
	}: {
		roles: ReadingRole[];
		/** The `id` of the role shown. */
		selected?: string;
		onNavigate?: DocNavigate;
		class?: string;
	} = $props();

	const role = $derived(roles.find((r) => r.id === selected) ?? roles[0]);
	const headingId = $props.id();
</script>

<section class={cn("flex flex-col gap-4", className)} data-slot="reading-path" aria-labelledby={headingId}>
	<div class="flex flex-col gap-2">
		<h2 id={headingId} class="font-display text-xl">Where do you start?</h2>
		<div class="flex flex-wrap gap-2" role="group" aria-label="Your role">
			{#each roles as item (item.id)}
				<button
					type="button"
					class={[
						"rounded-full border px-3 py-1 text-sm transition-colors",
						item.id === role?.id
							? "border-primary bg-primary/10 text-foreground"
							: "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
					]}
					aria-pressed={item.id === role?.id}
					onclick={() => (selected = item.id)}
				>
					{item.title}
				</button>
			{/each}
		</div>
	</div>
	{#if role}
		<div class="flex flex-col gap-3">
			{#if role.who}<p class="text-sm text-muted-foreground">{role.who}</p>{/if}
			<ol class="flex flex-col">
				{#each role.steps as step, index (step.href)}
					<li class="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 border-b border-border/40 py-2.5 last:border-b-0">
						<span
							class="flex size-7 items-center justify-center rounded-full border border-primary/40 font-mono text-xs text-primary tabular-nums"
							aria-hidden="true">{index + 1}</span
						>
						<span class="flex min-w-0 flex-col gap-0.5">
							<a
								class="text-foreground underline-offset-4 hover:text-primary hover:underline"
								href={step.href}
								onclick={(event) => onNavigate?.(step.href, event)}>{step.title}</a
							>
							<span class="text-sm text-muted-foreground">{step.why}</span>
						</span>
					</li>
				{/each}
			</ol>
		</div>
	{/if}
</section>
