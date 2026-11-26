<script lang="ts">
	import type { DocsResource } from "./docs-types";
	import { pushPath } from "./parse-path";
	import RenderedMarkdown from "./RenderedMarkdown.svelte";

	let {
		resources,
		nameLabel,
		descriptionLabel,
	}: { resources: DocsResource[]; nameLabel: string; descriptionLabel: string } = $props();

	function open(href: string, event: MouseEvent) {
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		event.preventDefault();
		pushPath(href);
		window.scrollTo({ top: 0 });
	}
</script>

<div class="my-5 max-w-[65ch] overflow-x-auto" data-testid="resource-table">
	<table class="w-full border-collapse text-left">
		<thead>
			<tr>
				<th class="border border-border bg-muted-surface px-3 py-2 font-semibold">{nameLabel}</th>
				<th class="border border-border bg-muted-surface px-3 py-2 font-semibold">{descriptionLabel}</th>
			</tr>
		</thead>
		<tbody>
			{#each resources as resource (resource.ref)}
				<tr>
					<td class="border border-border px-3 py-2 align-top font-semibold"><a class="text-primary underline-offset-4 hover:underline" href={resource.href} onclick={(event) => open(resource.href, event)}>{resource.display_name}</a></td>
					<td class="border border-border px-3 py-2 align-top"><RenderedMarkdown value={resource.description} compact /></td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
