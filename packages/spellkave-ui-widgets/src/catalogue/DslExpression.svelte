<script lang="ts">
	import { CodeBlock, LinkMenu } from "@spellkave/ui";
	import { layoutDsl } from "./layout-dsl";
	import { catalogueOpen } from "./navigate";
	import type { DocsDslToken } from "./types";

	let { source, tokens }: { source: string; tokens: DocsDslToken[] } = $props();
	const pieces = $derived(layoutDsl(source, tokens));

	function open(href: string, event: MouseEvent) {
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
			return;
		event.preventDefault();
		catalogueOpen(href);
		window.scrollTo({ top: 0 });
	}
</script>

<CodeBlock data-testid="dsl-expression"
	>{#each pieces as piece, index (index)}{#if piece.href}{@const href = piece.href}<a
				class="text-primary underline-offset-4 hover:underline {piece.className}"
				{href}
				onclick={(event) => open(href, event)}>{piece.text}</a
			>{:else if piece.targets}{@const targets = piece.targets}<LinkMenu
				items={targets.map((target) => ({
					label: target.title,
					kind: target.kind,
					href: target.href,
				}))}
				onSelect={(item) => {
					if (!item.href) return;
					catalogueOpen(item.href);
					window.scrollTo({ top: 0 });
				}}>{piece.text}</LinkMenu
			>{:else}<span class={piece.className}>{piece.text}</span>{/if}{/each}</CodeBlock
>
