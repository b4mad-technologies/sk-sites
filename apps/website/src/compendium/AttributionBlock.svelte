<script lang="ts">
	import { SRD_5_2_1_CREDIT } from "../lib/attribution";
	import { PIXELLAB_OUTPUT_RIGHTS_NOTE } from "./pixellab";

	let { compact = false }: { compact?: boolean } = $props();
</script>

<footer class="mt-8 border-t border-border pt-4" data-testid="srd-page-attribution">
	<h2 class="text-xs leading-5 font-semibold tracking-tight">Sources &amp; licenses</h2>
	<p class="mt-1 text-xs leading-5 text-[color:var(--muted-foreground)]">
		<a class="text-[color:var(--foreground)] underline underline-offset-4" href="https://www.dndbeyond.com/srd" rel="noreferrer">System Reference Document 5.2.1</a>
		by Wizards of the Coast LLC.
	</p>
	<p class="mt-2 max-w-[65ch] whitespace-pre-wrap break-words text-xs leading-5 text-[color:var(--muted-foreground)]" data-testid="srd-credit">{SRD_5_2_1_CREDIT}</p>
	{#if !compact}
		<p class="mt-2 max-w-[65ch] text-xs leading-5 text-[color:var(--muted-foreground)]">{PIXELLAB_OUTPUT_RIGHTS_NOTE}</p>
	{/if}
</footer>
