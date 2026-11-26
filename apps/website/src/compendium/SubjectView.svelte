<script lang="ts">
	import { DocsPageHeader } from "@spellkave/ui";
	import AttachmentBlock from "./AttachmentBlock.svelte";
	import DescriptionField from "./DescriptionField.svelte";
	import type { DocsPage, DocsSection, DocsSubject } from "./docs-types";
	import { pushPath } from "./parse-path";
	import ReferenceCard from "./ReferenceCard.svelte";
	import TagList from "./TagList.svelte";

	let {
		subject,
		view,
		page,
		section,
		chrome = true,
		sections = {},
	}: {
		subject: DocsSubject;
		view: "compact" | "full";
		page?: DocsPage;
		section?: DocsSection;
		chrome?: boolean;
		/**
		 * `tags` and `attachments` let a page that composes several carriers
		 * place those two blocks itself: a catalogue entry leads with the tag
		 * chips and closes with the SRD reference, so both have to leave this
		 * component's own order. Standalone use keeps them.
		 */
		sections?: { header?: boolean; details?: boolean; tags?: boolean; attachments?: boolean };
	} = $props();
	const showHeader = $derived(sections.header ?? true);
	const showDetails = $derived(sections.details ?? true);
	const showTags = $derived(sections.tags ?? true);
	const showAttachments = $derived(sections.attachments ?? true);
	const label = $derived(subject.kind === "entity" ? "Seeded entity instance" : "Entity definition");
	const equipment = $derived(subject.facets.find((facet) => facet.label === "Modifier definitions")?.rows ?? []);
	const placement = $derived(subject.facets.find((facet) => facet.label === "Placement")?.rows ?? []);
	const initialState = $derived(subject.facets.find((facet) => facet.label === "Initial state")?.rows ?? []);
	const art = $derived(subject.attachments.filter((attachment) => attachment.asset_href !== undefined).toSorted((left, right) => `${left.payload.path}:${left.payload.hash}:${left.payload.license}`.localeCompare(`${right.payload.path}:${right.payload.hash}:${right.payload.license}`)));
	const descriptionField = $derived(
		subject.kind === "entity" ? "entities.description" : "entity_definitions.description",
	);
	const tagLinks = $derived(subject.tag_links ?? subject.tags.map((tag) => ({ tag })));
	function openPath(href: string, event: MouseEvent) {
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		event.preventDefault();
		pushPath(href);
		window.scrollTo({ top: 0 });
	}
</script>

{#if view === "compact"}
	<div class="my-5 max-w-[65ch]" data-testid="subject-compact"><ReferenceCard href={subject.href} title={subject.display_name} description={subject.description} {label} art={art[0]?.asset_href ? { href: art[0].asset_href } : undefined} facts={[...(subject.kind === "entity" ? [{ label: "Initial definition", value: subject.definition_ref ?? "Not authored" }] : []), ...(subject.facets.some((facet) => facet.label === "Equipment modifier links") ? [{ label: "Equipment", value: "Authored modifier details available" }] : [])]} /></div>
{:else}
	<article data-testid="subject-full">
		{#if chrome && page && section}<nav class="mb-2 flex flex-wrap items-center gap-2 text-sm text-[color:var(--muted-foreground)]" aria-label="Breadcrumb"><a href={page.href} onclick={(event) => openPath(page.href, event)}>{page.title}</a><span>·</span><a href={section.href} onclick={(event) => openPath(section.href, event)}>{section.title}</a><span>·</span><span>{subject.display_name}</span></nav>{/if}
		{#if chrome}<DocsPageHeader title={subject.display_name} description={label} />{/if}
		{#if showHeader}
			<DescriptionField description={subject.description} field={descriptionField} />
			{#if art.length}<div class="mt-5 flex flex-wrap gap-3">{#each art as attachment (`${attachment.bundle_id}:${attachment.namespace}`)}{#if attachment.asset_href}<figure><img class="h-32 w-32 rounded-[var(--radius)] border border-border object-contain" src={attachment.asset_href} alt={`${subject.display_name} — ${attachment.bundle_id}`} /><figcaption class="mt-1 max-w-32 break-words text-xs text-[color:var(--muted-foreground)]">{attachment.bundle_id} · {String(attachment.payload.license ?? "Missing license")}</figcaption></figure>{/if}{/each}</div>{/if}
			<dl class="mt-6 grid max-w-[65ch] grid-cols-[max-content_minmax(0,1fr)] gap-x-6 gap-y-2 text-sm"><dt class="font-semibold">Subject ID</dt><dd class="min-w-0 break-words"><code>{subject.ref}</code></dd><dt class="font-semibold">Owning bundle</dt><dd>{subject.bundle_id}</dd>{#if subject.definition_ref}<dt class="font-semibold">Definition</dt><dd class="min-w-0 break-words"><code>{subject.definition_ref}</code></dd>{/if}</dl>
		{/if}
		{#if showDetails}
			{#if showTags}<TagList links={tagLinks} />{/if}
			{#if equipment.length}<section class="mt-8 max-w-[65ch]"><h2 class="font-display text-xl font-medium">Equipment effect</h2>{#each equipment as modifier}<article class="mt-3 border-l-2 border-primary pl-4"><h3 class="font-semibold">{String(modifier.display_name ?? modifier.modifier_template_id)}</h3><p class="mt-1 text-sm leading-6">{String(modifier.description ?? "Missing authored modifier description")}</p><dl class="mt-2 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-4 text-xs"><dt class="font-semibold">Applies to</dt><dd class="break-words"><code>{String(modifier.applies_to ?? "Not authored")}</code></dd><dt class="font-semibold">Modifier expression</dt><dd class="break-words"><code>{String(modifier.modifier_expression_source ?? "Not authored")}</code></dd><dt class="font-semibold">Predicate</dt><dd class="break-words"><code>{String(modifier.predicate_source || "None authored")}</code></dd></dl></article>{/each}<p class="mt-2 text-xs text-[color:var(--muted-foreground)]">These are authored definition rules; no effective character value is calculated here.</p></section>{/if}
			{#if subject.kind === "entity"}<section class="mt-8 max-w-[65ch]"><h2 class="font-display text-xl font-medium">Initial placement and state</h2>{#if placement.length}{#each placement as row}<p class="mt-2 text-sm">Placed at <code class="break-words">{String(row.place_node_id ?? "Not authored")}</code>.</p>{/each}{:else}<p class="mt-2 text-sm text-[color:var(--destructive)]">No initial placement is authored.</p>{/if}{#if initialState.length}<div class="mt-3 overflow-x-auto"><table class="w-full border-collapse text-sm"><thead><tr><th class="border border-border px-2 py-1 text-left">State</th><th class="border border-border px-2 py-1 text-left">Boolean field</th><th class="border border-border px-2 py-1 text-left">Integer field</th></tr></thead><tbody>{#each initialState as row}<tr><td class="border border-border px-2 py-1"><code>{String(row.state_id ?? "Missing state ID")}</code></td><td class="border border-border px-2 py-1">{typeof row.value_bool === "boolean" ? String(row.value_bool) : "Not authored"}</td><td class="border border-border px-2 py-1">{typeof row.value_int === "number" ? row.value_int : "Not authored"}</td></tr>{/each}</tbody></table></div>{:else}<p class="mt-2 text-sm text-[color:var(--destructive)]">No initial state is authored.</p>{/if}<p class="mt-2 text-xs text-[color:var(--muted-foreground)]">Manifest seed fields only—not current live-world state. Both typed fields are shown exactly as authored.</p></section>{/if}
			{#if showAttachments}<section class="mt-8 max-w-[65ch]" aria-label="Attachments"><h2 class="font-display text-xl font-medium">Attachments</h2>{#if subject.attachments.length === 0}<p class="mt-2 text-sm text-[color:var(--muted-foreground)]">No attachments are authored for this subject.</p>{:else}<div class="mt-3 space-y-4">{#each subject.attachments as attachment (`${attachment.bundle_id}:${attachment.namespace}`)}<AttachmentBlock {attachment} />{/each}</div>{/if}</section>{/if}
			<section class="mt-8"><h2 class="font-display text-xl font-medium">Authored facets</h2>{#each subject.facets as facet}<details class="mt-3 max-w-[65ch]"><summary class="cursor-pointer font-semibold">{facet.label} ({facet.rows.length})</summary><pre class="mt-2 overflow-x-auto whitespace-pre-wrap text-xs">{JSON.stringify(facet.rows, null, 2)}</pre></details>{/each}</section>
		{/if}
	</article>
{/if}
