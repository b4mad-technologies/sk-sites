<script lang="ts">
	import { Button } from "@spellkave/ui";

	let {
		label,
		value,
		mono = true,
		secret = false,
		tone = "midnight",
	}: {
		label: string;
		value: string;
		mono?: boolean;
		secret?: boolean;
		tone?: "midnight" | "paper";
	} = $props();

	let copied = $state(false);
	let revealed = $state(false);

	async function copy() {
		try {
			await navigator.clipboard.writeText(value);
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 1400);
		} catch {
			// Clipboard can be unavailable (insecure context); the value stays selectable.
		}
	}

	const shown = $derived(secret && !revealed ? "•".repeat(Math.min(value.length, 24)) : value);
	const onPaper = $derived(tone === "paper");
</script>

<div class="flex flex-col gap-1">
	<span
		class={[
			"text-xs font-semibold tracking-[0.08em] uppercase",
			onPaper ? "text-background" : "text-muted-foreground",
		]}>{label}</span
	>
	<div class="flex items-stretch gap-1.5">
		<code
			class={[
				"min-h-11 min-w-0 flex-1 truncate rounded-[var(--radius)] border border-border px-2.5 py-1.5 text-sm select-all",
				mono ? "font-mono" : "font-sans",
				onPaper ? "bg-background/5 text-background" : "bg-muted/60 text-foreground",
			]}
			title={value}>{shown}</code
		>
		{#if secret}
			<Button
				variant="woven-secondary"
				aria-label={revealed ? `Hide ${label}` : `Show ${label}`}
				aria-pressed={revealed}
				onclick={() => {
					revealed = !revealed;
				}}>{revealed ? "Hide" : "Show"}</Button
			>
		{/if}
		<Button variant="woven-secondary" aria-label={`Copy ${label}`} onclick={copy}
			>{copied ? "Copied" : "Copy"}</Button
		>
	</div>
</div>
