<script lang="ts">
	import { typography } from "@spellkave/ui";

	const typeRows = [
		{
			label: "Display",
			sample: "The shared design system",
			value: typography.families.serif,
			style: "font-size:clamp(2rem,4vw,3.25rem);line-height:0.95;letter-spacing:-0.04em;",
		},
		{
			label: "Body",
			sample: "Buttons, tabs, and checkboxes keep the same grammar across apps.",
			value: typography.families.sans,
			style: "font-size:1rem;line-height:1.75;letter-spacing:0;",
		},
		{
			label: "Label",
			sample: "Section label",
			value: typography.families.sans,
			style: "font-size:0.875rem;line-height:1.5;letter-spacing:0.03em;",
		},
	];
</script>

<div class="grid w-full gap-4">
	{#each typeRows as row}
		<div class="rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--background)]/55 p-4">
			<p class="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--muted-foreground)]">{row.label}</p>
			<p class="mt-2 text-[color:var(--foreground)]" style={`font-family:${row.value};${row.style}`}>
				{row.sample}
			</p>
			<p class="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">{row.value}</p>
		</div>
	{/each}
</div>
