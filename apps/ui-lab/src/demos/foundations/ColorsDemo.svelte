<script lang="ts">
	const colorRows = [
		{ name: "background", swatchClass: "bg-background", use: "Page ground and large canvas." },
		{ name: "foreground", swatchClass: "bg-foreground", use: "Primary readable text." },
		{ name: "card", swatchClass: "bg-card", use: "Raised lab cards and panels." },
		{ name: "primary", swatchClass: "bg-primary", use: "Primary action, active state, and thread." },
		{ name: "secondary", swatchClass: "bg-secondary", use: "Secondary surfaces and quiet panels." },
		{ name: "muted", swatchClass: "bg-muted", use: "Subtle fills and tab hover states." },
		{ name: "accent", swatchClass: "bg-accent", use: "Positive or secondary signal." },
		{ name: "destructive", swatchClass: "bg-destructive", use: "Error and irreversible actions." },
		{ name: "border", swatchClass: "bg-border", use: "Card, tab, and input edges." },
		{ name: "ring", swatchClass: "bg-ring", use: "Keyboard focus and active emphasis." },
	];
</script>

<div class="grid w-full gap-3 sm:grid-cols-2">
	{#each colorRows as row}
		<div class="flex gap-3 rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--background)]/55 p-3">
			<div class={`h-14 w-14 shrink-0 rounded-[var(--radius)] border border-[color:var(--border)] ${row.swatchClass}`}></div>
			<div class="min-w-0">
				<div class="flex items-center gap-2">
					<p class="font-medium text-[color:var(--foreground)]">{row.name}</p>
					<code class="text-xs text-[color:var(--muted-foreground)]">--{row.name}</code>
				</div>
				<p class="mt-1 text-sm leading-6 text-[color:var(--muted-foreground)]">{row.use}</p>
			</div>
		</div>
	{/each}
</div>
