<script lang="ts">
	/** A command to run yourself, with a copy button. */
	let { command, resolved }: { command: string; resolved?: string | undefined } = $props();

	let copied = $state(false);

	async function copy(): Promise<void> {
		try {
			await navigator.clipboard.writeText(command);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {
			copied = false;
		}
	}
</script>

<div class="flex flex-col gap-1" data-slot="ci-copy-command">
	<div class="flex items-start gap-2">
		<code class="min-w-0 flex-1 rounded-sm bg-muted/50 px-2 py-1 font-mono text-xs break-all">{command}</code>
		<button
			type="button"
			class="shrink-0 rounded-sm border border-border px-2 py-1 text-xs hover:border-primary hover:text-foreground"
			onclick={() => void copy()}>{copied ? "copied" : "copy"}</button
		>
	</div>
	{#if resolved}
		<p class="text-xs text-muted-foreground">runs <code class="font-mono text-foreground">{resolved}</code></p>
	{/if}
</div>
