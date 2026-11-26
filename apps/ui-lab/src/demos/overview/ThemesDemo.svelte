<script lang="ts">
	import { DEFAULT_THEME_ID, THEMES } from "@spellkave/ui/theme";
</script>

<div class="grid w-full gap-3 md:grid-cols-3">
	{#each THEMES as entry}
		<article class="rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--background)]/55 p-4">
			<div class="flex items-baseline justify-between gap-2">
				<h3 class="font-medium text-[color:var(--foreground)]">{entry.label}</h3>
				<code class="text-xs text-[color:var(--muted-foreground)]">{entry.id}</code>
			</div>
			<p class="mt-1 text-sm text-[color:var(--foreground)]">{entry.world}</p>
			<p class="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">{entry.description}</p>
			<p class="mt-2 text-xs uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
				{entry.scheme}{#if entry.id === DEFAULT_THEME_ID} · default{/if}
			</p>
			<p class="mt-1 text-xs text-[color:var(--muted-foreground)]">{entry.faces.display} · {entry.faces.body}</p>
			<div class="mt-3 flex gap-1" aria-hidden="true">
				{#each entry.swatches as swatch}
					<span
						class="size-6 rounded-[var(--radius)] border border-[color:var(--border)]"
						style="background-color: {swatch};"
					></span>
				{/each}
			</div>
		</article>
	{/each}
</div>
