<script lang="ts">
	import { DocsPageHeader } from "@spellkave/ui";
	import { firstSentence } from "@spellkave/ui-widgets/catalogue/first-sentence";
	import AttachmentBlock from "./AttachmentBlock.svelte";
	import DescriptionField from "./DescriptionField.svelte";
	import type { DocsPage, DocsResource, DocsSection } from "./docs-types";
	import { pushPath } from "./parse-path";
	import ReferenceCard from "./ReferenceCard.svelte";
	import TagList from "./TagList.svelte";

	let {
		resource,
		view,
		page,
		section,
		chrome = true,
		value,
		sections = {},
	}: {
		resource: DocsResource;
		view: "compact" | "full" | "inline";
		page?: DocsPage;
		section?: DocsSection;
		chrome?: boolean;
		value?: number | boolean;
		/** See `SubjectView` for why `tags` and `attachments` are separable. */
		sections?: { header?: boolean; details?: boolean; tags?: boolean; attachments?: boolean };
	} = $props();
	const showHeader = $derived(sections.header ?? true);
	const showDetails = $derived(sections.details ?? true);
	const showTags = $derived(sections.tags ?? true);
	const showAttachments = $derived(sections.attachments ?? true);
	const summary = $derived(firstSentence(resource.description));
	const tagLinks = $derived(resource.tag_links ?? resource.tags.map((tag) => ({ tag })));
	const hasProvenance = $derived(
		resource.attachments.some(
			(attachment) =>
				typeof attachment.payload.source === "string" &&
				typeof attachment.payload.license === "string",
		),
	);

	function openPath(href: string, event: MouseEvent) {
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		event.preventDefault();
		pushPath(href);
		window.scrollTo({ top: 0 });
	}

	function open(event: MouseEvent) {
		openPath(resource.href, event);
	}
</script>

{#if view === "compact"}
	<div class="my-5 max-w-[65ch]" data-testid="resource-compact"><ReferenceCard href={resource.href} title={resource.display_name} description={resource.description} label="Spellkave resource definition" facts={[{ label: "Default", value: String(resource.initial_value ?? "—") }, { label: "Kind", value: resource.value_kind }, ...(resource.min_value !== undefined || resource.max_value !== undefined ? [{ label: "Range", value: `${resource.min_value ?? "—"}–${resource.max_value ?? "—"}` }] : [])]} /></div>
{:else if view === "inline"}
	<div class="min-w-0" data-testid="resource-inline">
		<p class="flex items-baseline justify-between gap-3">
			<a class="[overflow-wrap:anywhere] text-primary underline-offset-4 hover:underline" href={resource.href} onclick={open}>{resource.display_name}</a>
			{#if value !== undefined}<strong class="tabular-nums">{typeof value === "boolean" ? (value ? "yes" : "no") : value}</strong>{/if}
		</p>
		{#if summary}<p class="mt-1 text-xs text-[color:var(--muted-foreground)]">{summary}</p>{/if}
	</div>
{:else}
	<article data-testid="resource-full">
		{#if chrome && page && section}
			<nav class="mb-2 flex flex-wrap items-center gap-2 text-sm text-[color:var(--muted-foreground)]" aria-label="Breadcrumb">
				<a class="text-[color:var(--foreground)] underline underline-offset-4" href={page.href} onclick={(event) => openPath(page.href, event)}>{page.title}</a>
				<span aria-hidden="true">·</span>
				<a class="text-[color:var(--foreground)] underline underline-offset-4" href={section.href} onclick={(event) => openPath(section.href, event)}>{section.title}</a>
				<span aria-hidden="true">·</span>
				<span>{resource.display_name}</span>
			</nav>
		{/if}
		{#if chrome}<DocsPageHeader title={resource.display_name} description="Spellkave resource definition" />{/if}
		{#if showHeader}
			<DescriptionField description={resource.description} field="resource_definitions.description" />
			<dl class="mt-6 grid max-w-[65ch] grid-cols-[max-content_minmax(0,1fr)] gap-x-6 gap-y-2 text-sm">
				<dt class="font-semibold">Definition ID</dt><dd class="min-w-0 break-words"><code>{resource.ref}</code></dd>
				<dt class="font-semibold">Value kind</dt><dd>{resource.value_kind}</dd>
				<dt class="font-semibold">Definition default</dt><dd>{resource.initial_value ?? "Not authored"}</dd>
				<dt class="font-semibold">Allowed range</dt><dd>{resource.min_value ?? "—"}–{resource.max_value ?? "—"}</dd>
				<dt class="font-semibold">Recovery</dt><dd>{resource.recovery_rule ?? "Not authored"}</dd>
			</dl>
		{/if}
		{#if showDetails}
			{#if showTags && tagLinks.length > 0}
				<TagList links={tagLinks} />
			{/if}
			{#if showAttachments}<section class="mt-8 max-w-[65ch]" data-testid="resource-provenance">
				<h2 class="font-display text-xl font-medium">Attachments</h2>
				{#if hasProvenance}<p class="mt-2 text-xs leading-5 text-[color:var(--muted-foreground)]">Provenance is listed with each attachment.</p>
				{:else}<p class="mt-2 text-sm text-[color:var(--destructive)]">No source provenance is authored for this resource.</p>{/if}
				{#if resource.attachments.length}<div class="mt-4 space-y-4">{#each resource.attachments as attachment (`${attachment.bundle_id}:${attachment.namespace}`)}<AttachmentBlock {attachment} />{/each}</div>{/if}
			</section>{/if}
		{/if}
	</article>
{/if}
