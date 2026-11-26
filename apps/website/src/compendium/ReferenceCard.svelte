<script lang="ts">
	import { ReferenceCard as UiReferenceCard } from "@spellkave/ui";
	import type { DocsFact } from "./docs-types";
	import { pushPath } from "./parse-path";
	import RenderedMarkdown from "./RenderedMarkdown.svelte";

	let {
		href,
		title,
		description = "",
		label,
		facts = [],
		art,
	}: {
		href?: string;
		title: string;
		description?: string;
		label: string;
		facts?: DocsFact[];
		art?: { href: string; alt?: string };
	} = $props();

	function open(event: MouseEvent) {
		if (!href) return;
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		event.preventDefault();
		pushPath(href);
		window.scrollTo({ top: 0 });
	}
</script>

<UiReferenceCard {label} {title} {href} {facts} {art} onNavigate={href ? open : undefined}>
	{#if description}
		<RenderedMarkdown value={description} compact />
	{/if}
</UiReferenceCard>
