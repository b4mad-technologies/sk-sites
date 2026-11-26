<script lang="ts">
	import { Button } from "@spellkave/ui";

	let {
		label,
		value,
		mono = true,
		secret = false,
	}: { label: string; value: string; mono?: boolean; secret?: boolean } = $props();

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
</script>

<div class="flex flex-col gap-1">
	<span class="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
	<div class="flex items-stretch gap-1.5">
		<code
			class={[
				"min-w-0 flex-1 truncate rounded-md border border-border bg-muted/60 px-2.5 py-1.5 text-sm select-all",
				mono ? "font-mono" : "font-sans",
			]}
			title={value}>{shown}</code
		>
		{#if secret}
			<Button
				variant="outline"
				size="sm"
				aria-label={revealed ? `Hide ${label}` : `Show ${label}`}
				onclick={() => {
					revealed = !revealed;
				}}>{revealed ? "Hide" : "Show"}</Button
			>
		{/if}
		<Button variant="secondary" size="sm" aria-label={`Copy ${label}`} onclick={copy}
			>{copied ? "Copied" : "Copy"}</Button
		>
	</div>
</div>
