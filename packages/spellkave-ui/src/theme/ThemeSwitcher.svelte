<script lang="ts">
	import { cn } from "../lib/utils";
	import { Select } from "../select";
	import { setTheme, theme } from "./theme.svelte";
	import { THEMES } from "./themes";

	let {
		class: className,
		label = "Theme",
		compact = false,
	}: { class?: string; label?: string; compact?: boolean } = $props();

	const items = THEMES.map((entry) => ({ value: entry.id, label: entry.label }));
</script>

<label
	data-slot="theme-switcher"
	class={cn("inline-flex items-center gap-2 text-sm text-[color:var(--foreground)]", className)}
>
	<span class={compact ? "sr-only" : "shrink-0"}>{label}</span>
	<Select
		items={items}
		bind:value={() => theme.id, (value) => setTheme(value)}
		name="sk-theme"
		class={compact ? "min-w-[9rem]" : undefined}
	/>
</label>
