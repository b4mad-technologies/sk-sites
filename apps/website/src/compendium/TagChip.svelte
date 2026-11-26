<script lang="ts">
	import { firstSentence } from "@spellkave/ui-widgets/catalogue/first-sentence";
	import type { DocsTagLink } from "./docs-types";
	import { pushPath } from "./parse-path";

	let { link }: { link: DocsTagLink } = $props();
	const summary = $derived(link.description ? firstSentence(link.description) : undefined);

	function open(event: MouseEvent) {
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		if (!link.href) return;
		event.preventDefault();
		pushPath(link.href);
		window.scrollTo({ top: 0 });
	}
</script>

{#if link.href}
	<span class="inline-flex flex-wrap items-baseline gap-x-1.5" data-testid="tag-link">
		<a class="[overflow-wrap:anywhere] text-primary underline-offset-4 hover:underline" href={link.href} onclick={open}>{link.display_name ?? link.tag}</a>
		<span class="text-xs text-[color:var(--muted-foreground)]">{link.tag}</span>
		{#if summary}<span class="text-xs text-[color:var(--muted-foreground)]">— {summary}</span>{/if}
	</span>
{:else}
	<span class="[overflow-wrap:anywhere] text-[color:var(--muted-foreground)]" data-testid="tag-chip">{link.tag}</span>
{/if}
