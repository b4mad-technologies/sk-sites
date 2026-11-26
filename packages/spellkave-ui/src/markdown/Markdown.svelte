<script lang="ts">
	import { cn } from "../lib/utils";
	import MarkdownTokens from "./MarkdownTokens.svelte";
	import { markdownTokens } from "./markdown";
	import type { MarkdownProps } from "./types";

	let { source, class: className }: MarkdownProps = $props();
	const tokens = $derived(markdownTokens(source));
</script>

<div data-slot="markdown" class={cn("sk-markdown", className)}>
	<MarkdownTokens {tokens} />
</div>

<style>
	.sk-markdown {
		overflow-wrap: anywhere;
		line-height: 1.65;
	}
	.sk-markdown :global(p) {
		margin: 0 0 0.6em;
	}
	.sk-markdown :global(p:last-child) {
		margin-bottom: 0;
	}
	.sk-markdown :global(ul),
	.sk-markdown :global(ol) {
		margin: 0.3em 0 0.6em 1.3em;
		padding: 0;
	}
	.sk-markdown :global(ul) {
		list-style: disc;
	}
	.sk-markdown :global(ol) {
		list-style: decimal;
	}
	.sk-markdown :global(li.md-task) {
		list-style: none;
	}
	.sk-markdown :global(.md-inline),
	.sk-markdown :global(.md-code) {
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 0.88em;
		background: color-mix(in oklab, var(--foreground) 7%, transparent);
		border-radius: calc(var(--radius) / 2);
	}
	.sk-markdown :global(.md-inline) {
		padding: 0 0.3em;
	}
	.sk-markdown :global(.md-code) {
		padding: 0.7em 0.9em;
		margin: 0.4em 0 0.7em;
		overflow-x: auto;
		white-space: pre;
	}
	.sk-markdown :global(blockquote) {
		margin: 0.4em 0;
		padding-left: 0.8em;
		border-left: 2px solid var(--border);
		color: var(--muted-foreground);
	}
	.sk-markdown :global(a) {
		color: var(--primary);
		text-decoration: underline;
	}
	.sk-markdown :global(.md-table) {
		overflow-x: auto;
		margin: 0.4em 0 0.7em;
	}
	.sk-markdown :global(table) {
		border-collapse: collapse;
		font-size: 0.9em;
	}
	.sk-markdown :global(th),
	.sk-markdown :global(td) {
		border: 1px solid var(--border);
		padding: 0.25em 0.6em;
		text-align: left;
	}
	.sk-markdown :global(hr) {
		border: 0;
		border-top: 1px solid var(--border);
		margin: 0.8em 0;
	}
</style>
