<script lang="ts">
	import { renderAttachmentMarkdown } from "./docs-markdown";

	let {
		value,
		renderedHtml,
		compact = false,
		testId,
	}: { value: string; renderedHtml?: string; compact?: boolean; testId?: string } = $props();

	// Projected HTML comes from the same sanitized Markdown pipeline during export.
	const rendered = $derived(renderedHtml ?? renderAttachmentMarkdown(value));
</script>

<div
	class={[
		"rendered-markdown min-w-0 overflow-x-auto leading-7 [&_h2]:text-xl [&_h3]:text-lg [&_h4]:text-lg [&_table]:text-sm",
		compact ? "compact text-sm leading-6" : "",
	]}
	data-testid={testId}
>
	{@html rendered}
</div>

<style>
	.rendered-markdown :global(:first-child) {
		margin-top: 0;
	}

	.rendered-markdown :global(:last-child) {
		margin-bottom: 0;
	}

	.rendered-markdown :global(p),
	.rendered-markdown :global(ul),
	.rendered-markdown :global(ol),
	.rendered-markdown :global(blockquote),
	.rendered-markdown :global(table),
	.rendered-markdown :global(hr) {
		margin-block: 0.75rem;
	}

	.rendered-markdown :global(h2),
	.rendered-markdown :global(h3),
	.rendered-markdown :global(h4) {
		margin-block: 1.25rem 0.5rem;
		font-family: var(--font-display);
		font-weight: 500;
	}

	.rendered-markdown :global(blockquote) {
		padding-left: 1rem;
		border-left: 2px solid var(--primary);
	}

	.rendered-markdown :global(table) {
		width: 100%;
		border-collapse: collapse;
	}

	.rendered-markdown :global(th),
	.rendered-markdown :global(td) {
		padding: 0.35rem 0.5rem;
		border: 1px solid var(--border);
		text-align: left;
	}

	.rendered-markdown :global(a) {
		color: var(--primary);
		text-decoration: underline;
		text-underline-offset: 0.2em;
	}

	.rendered-markdown.compact :global(p),
	.rendered-markdown.compact :global(ul),
	.rendered-markdown.compact :global(ol) {
		margin-block: 0.25rem;
	}
</style>
