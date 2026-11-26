<script lang="ts">
	import { radius, space } from "@spellkave/ui";

	const spaceRows = [
		{ label: "xs", value: space.xs },
		{ label: "sm", value: space.sm },
		{ label: "md", value: space.md },
		{ label: "base", value: space.base },
		{ label: "lg", value: space.lg },
		{ label: "xl", value: space.xl },
	];
</script>

<div class="grid w-full gap-4 sm:grid-cols-2">
	<div class="rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--background)]/55 p-4">
		<p class="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--muted-foreground)]">Spacing</p>
		<div class="mt-4 flex flex-wrap items-end gap-3">
			{#each spaceRows as row}
				<div class="flex flex-col items-center gap-2">
					<div class="border border-[color:var(--border)] bg-[color:var(--primary)]/20" style={`width:${row.value};height:${row.value}`}></div>
					<code class="text-[11px] text-[color:var(--muted-foreground)]">{row.label} · {row.value}</code>
				</div>
			{/each}
		</div>
	</div>
	<div class="rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--background)]/55 p-4">
		<p class="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--muted-foreground)]">Radius</p>
		<div class="mt-4 flex flex-wrap gap-3">
			{#each Object.entries(radius) as [name, value]}
				<div class="rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--secondary)] px-3 py-2 text-sm">
					<div class="font-medium text-[color:var(--foreground)]">{name}</div>
					<code class="text-xs text-[color:var(--muted-foreground)]">{value}</code>
				</div>
			{/each}
		</div>
	</div>
</div>
