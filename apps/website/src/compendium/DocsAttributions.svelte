<script lang="ts">
	import type { DocsPage } from "./docs-types";

	let { attributions }: { attributions: NonNullable<DocsPage["attributions"]> } = $props();
</script>

<footer class="mt-8 border-t border-border pt-4" data-testid="docs-attributions">
	<h2 class="text-xs leading-5 font-semibold tracking-tight">Sources &amp; licenses</h2>
	{#each attributions as attribution (`${attribution.source.path}:${attribution.source.anchor}`)}
		<details class="mt-2 max-w-[65ch] text-xs leading-5 text-[color:var(--muted-foreground)]">
			<summary class="cursor-pointer break-words"><span class="font-semibold text-[color:var(--foreground)]">{attribution.source.anchor}</span> · {attribution.source.license}</summary>
			<div class="mt-2 [&_a]:text-[color:var(--foreground)] [&_a]:underline [&_a]:underline-offset-4 [&_p]:my-1">{#each attribution.blocks as block}{#if block.kind === "html"}{@html block.html}{/if}{/each}</div>
			<p class="mt-1 break-words"><code>{attribution.source.path}</code></p>
		</details>
	{/each}
</footer>
