<script lang="ts">
	import { Button } from "@spellkave/ui";

	let {
		url,
		copy,
	}: {
		url: string;
		copy: (text: string) => Promise<boolean>;
	} = $props();

	let copied = $state(false);
	let failed = $state(false);

	async function onCopy(): Promise<void> {
		const ok = await copy(url);
		copied = ok;
		failed = !ok;
	}
</script>

<div class="flex flex-col gap-1" data-testid="copy-locator">
	<Button size="xs" variant="outline" onclick={() => void onCopy()}>
		{copied ? "Copied" : "Copy link"}
	</Button>
	<code class="break-all text-[0.65rem] leading-snug text-muted-foreground">{url}</code>
	{#if failed}
		<p class="text-xs text-destructive">Select the link and copy it.</p>
	{/if}
</div>
