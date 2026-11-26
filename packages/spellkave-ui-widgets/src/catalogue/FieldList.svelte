<script lang="ts">
	import DslExpression from "./DslExpression.svelte";
	import { catalogueOpen } from "./navigate";
	/**
	 * Definition list over `DocsRowField[]` — the workhorse detail block
	 * every full view's identity dl (Resource ID, Tag ID, Subject ID, ...)
	 * collapses into. A field with `href` renders as a link, without one
	 * as plain text; `code` marks an id-shaped value to render in `<code>`.
	 *
	 * NOT built on `StatRows`: that component is a numeric stat grid with
	 * uppercase labels and no href support, made for character-sheet stats
	 * — a different job. Don't re-treat it as a base for this one.
	 */
	import type { DocsRowField } from "./types";

	let {
		fields,
		navigate,
	}: {
		fields: DocsRowField[];
		/**
		 * Router for a field's `href`. Default: the docs catalogue's own
		 * `catalogueOpen` plus a scroll to the top of the new page. A caller
		 * that is NOT a docs page (the Maps drawer routes through
		 * `publishMapsLocator`) passes its own; the scroll-to-top belongs to
		 * the page navigation, so it is the default's business, not this
		 * component's.
		 */
		navigate?: (href: string, event: MouseEvent) => void;
	} = $props();

	function open(href: string, event: MouseEvent) {
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		event.preventDefault();
		if (navigate !== undefined) {
			navigate(href, event);
			return;
		}
		catalogueOpen(href);
		window.scrollTo({ top: 0 });
	}
</script>

{#if fields.length > 0}
	<dl class="mt-6 grid w-full max-w-4xl grid-cols-[max-content_minmax(0,1fr)] gap-x-6 gap-y-2 text-sm" data-testid="field-list">
		{#each fields as field (field.label)}
			{#if field.dsl}
				<dt class="col-span-2 font-semibold">{field.label}</dt>
				<dd class="col-span-2 min-w-0">
					<DslExpression source={field.value} tokens={field.dsl.tokens} />
				</dd>
			{:else}
			<dt class="font-semibold">{field.label}</dt>
			<dd class="min-w-0 break-words">
				{#if field.href}
					{@const href = field.href}
					<a class="text-primary underline-offset-4 hover:underline" {href} onclick={(event) => open(href, event)}>
						{#if field.code}<code>{field.value}</code>{:else}{field.value}{/if}
					</a>
				{:else if field.code}
					<code>{field.value}</code>
				{:else}
					{field.value}
				{/if}
			</dd>
			{/if}
		{/each}
	</dl>
{/if}
