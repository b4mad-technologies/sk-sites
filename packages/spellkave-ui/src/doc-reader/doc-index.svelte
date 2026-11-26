<script lang="ts">
	/**
	 * A grouped list of documents (ADRs by theme, capabilities by name) with
	 * a status pill, a one-line summary and related links per entry. The
	 * filter matches id, title and summary; empty groups hide while it is set.
	 */
	import { cn } from "../lib/utils";
	import { TONE_CLASSES } from "./tones";
	import type { DocIndexGroup, DocNavigate } from "./types";

	let {
		groups,
		filterLabel = "Filter",
		onNavigate,
		class: className,
	}: {
		groups: DocIndexGroup[];
		filterLabel?: string;
		onNavigate?: DocNavigate;
		class?: string;
	} = $props();

	let query = $state("");
	const needle = $derived(query.trim().toLowerCase());
	const shown = $derived(
		groups
			.map((group) => ({
				...group,
				entries: needle
					? group.entries.filter((entry) =>
							[entry.label, entry.title, entry.summary, entry.status?.label]
								.filter(Boolean)
								.some((text) => (text as string).toLowerCase().includes(needle)),
						)
					: group.entries,
			}))
			.filter((group) => group.entries.length > 0),
	);
	const total = $derived(shown.reduce((sum, group) => sum + group.entries.length, 0));
	const inputId = $props.id();
</script>

<div class={cn("flex flex-col gap-5", className)} data-slot="doc-index">
	<div class="flex flex-wrap items-center gap-3">
		<label class="text-sm text-muted-foreground" for={inputId}>{filterLabel}</label>
		<input
			id={inputId}
			type="search"
			class="min-w-56 flex-1 rounded-[var(--radius)] border border-input bg-background px-3 py-1.5 text-sm sm:max-w-sm"
			bind:value={query}
		/>
		<span class="text-xs text-muted-foreground tabular-nums" aria-live="polite">{total} shown</span>
	</div>
	{#each shown as group (group.title)}
		<section class="flex flex-col gap-1">
			<h2 class="flex items-baseline gap-2 font-display text-lg">
				{group.title}
				<span class="font-sans text-xs text-muted-foreground tabular-nums">{group.entries.length}</span>
			</h2>
			{#if group.note}<p class="text-sm text-muted-foreground">{group.note}</p>{/if}
			<ul class="flex flex-col">
				{#each group.entries as entry (entry.key)}
					<li class="flex flex-col gap-1 border-b border-border/40 py-2 last:border-b-0">
						<div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
							{#if entry.label}<span class="font-mono text-xs text-muted-foreground">{entry.label}</span>{/if}
							<a
								class="min-w-0 text-foreground underline-offset-4 hover:text-primary hover:underline"
								href={entry.href}
								onclick={(event) => onNavigate?.(entry.href, event)}>{entry.title}</a
							>
							{#if entry.status}
								<span class={["rounded-full border px-2 py-0.5 text-xs whitespace-nowrap", TONE_CLASSES[entry.status.tone]]}>{entry.status.label}</span>
							{/if}
						</div>
						{#if entry.summary}<p class="text-sm text-muted-foreground">{entry.summary}</p>{/if}
						{#if entry.links?.length}
							<p class="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
								{#each entry.links as link, index (index)}
									<span>
										{#if link.relation}{link.relation}{" "}{/if}<a
											class="text-primary underline-offset-2 hover:underline"
											href={link.href}
											onclick={(event) => onNavigate?.(link.href, event)}>{link.label}</a
										>
									</span>
								{/each}
							</p>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	{:else}
		<p class="text-sm text-muted-foreground">Nothing matches “{query}”.</p>
	{/each}
</div>
