<script lang="ts">
	import { DocsPageHeader } from "@spellkave/ui";
	import { rowViewFor } from "@spellkave/ui-widgets/catalogue";
	import AttachmentBlock from "./AttachmentBlock.svelte";
	import CatalogueFacets from "./CatalogueFacets.svelte";
	import DescriptionField from "./DescriptionField.svelte";
	import type {
		DocsCatalogueEntry,
		DocsCatalogueEntrySummary,
		DocsFact,
		DocsPage,
		DocsSection,
	} from "./docs-types";
	import ReferenceCard from "./ReferenceCard.svelte";
	import ResourceView from "./ResourceView.svelte";
	import { resourceBlock } from "./resource-block";
	import SubjectView from "./SubjectView.svelte";
	import { groupSrdCatalogueEntries } from "./srd-catalogue-groups";
	import TagList from "./TagList.svelte";
	import TagView from "./TagView.svelte";

	let {
		entry,
		page,
		section,
		catalogue = [],
		familyHeadings = {},
		familyNouns = {},
		identityNamespaces = {},
	}: {
		entry: DocsCatalogueEntry;
		page: DocsPage;
		section: DocsSection;
		/** The current section's own catalogue listing — same data `DocsPageOverview` groups, reused here to find entries that carry {@link entry}'s own identity tag (sk-jay0.3.5.65). */
		catalogue?: DocsCatalogueEntrySummary[];
		familyHeadings?: Record<string, string>;
		familyNouns?: Record<string, { singular: string; plural: string }>;
		/** The tag namespace that names an entity of a given family — `sections.toml`'s `[[identity_namespaces]]` (sk-jay0.3.5.65). */
		identityNamespaces?: Record<string, string>;
	} = $props();

	/**
	 * A "belongs to this entity" group collapses behind a closed `<details>`
	 * once it would otherwise push the page well past one screenful of
	 * cards (sk-jay0.3.5.65) — chosen to match the "about 20" ballpark the
	 * originating report already used, and it lands exactly on the
	 * boundary the barbarian class page exercises: 29 class features
	 * collapse, 1 subclass stays open.
	 */
	/**
	 * The reader component owning this entry's row kind, with the row already
	 * projected. `undefined` for the three kinds that still have their own
	 * typed views above, and for kinds deliberately classified as having no
	 * page — those fall through to the technical dump at the bottom.
	 *
	 * Field values that name another row become links through
	 * `referenceHrefs`, which is built from the same reference graph that
	 * produced the blocks below — so a route shown in a field and a route shown
	 * in a reference group can never disagree.
	 */
	/**
	 * Referenced id -> route, from this entry's own outgoing reference groups.
	 * Href resolution stays at build time; this only reads what the projection
	 * already decided.
	 */
	const referenceHrefs = $derived.by(() => {
		const hrefs = new Map<string, string>();
		for (const group of entry.references ?? [])
			for (const reference of group.entries)
				if (reference.href) hrefs.set(reference.ref, reference.href);
		return hrefs;
	});

	const rowView = $derived.by(() => {
		const registration = rowViewFor(entry.kind);
		if (registration === undefined) return undefined;
		// The resolved display name is merged in under `title`. A kind whose
		// manifest table has no `display_name` column — measured: all 478
		// consequence_templates rows — gets compiler-derived copy on the
		// catalogue entry, not on the row, so a projector reading only the raw
		// row would render an untitled page. Passing it here keeps every
		// projector's input one object.
		const record: Record<string, unknown> = {
			title: entry.display_name,
			...(entry.record ?? {}),
		};
		const row = registration.project(record, entry.href, (ref) => referenceHrefs.get(ref));
		const dsl = entry.dsl;
		const fields = dsl
			? row.fields.map((field) => {
					for (const [key, stream] of Object.entries(dsl)) {
						if (record[key] === field.value) return { ...field, dsl: stream };
					}
					return field;
				})
			: row.fields;
		return {
			registration,
			row: {
				...row,
				fields,
				...(entry.references?.length ? { references: entry.references } : {}),
				...(entry.referenced_by?.length ? { referenced_by: entry.referenced_by } : {}),
			},
		};
	});

	const RELATED_GROUP_COLLAPSE_THRESHOLD = 20;

	/**
	 * The tag that names this entity itself, as opposed to a tag this
	 * entity merely carries as vocabulary/linkage. Matching on the slug
	 * alone is a coincidence detector, not an authored rule — the spell
	 * "Divination" carries `srd.spell.school.divination` as ordinary school
	 * membership, and that tag's last segment happens to equal the spell's
	 * own slug too. Both conditions are required: the tag's NAMESPACE
	 * (everything before the last dot segment) must be exactly the
	 * namespace `sections.toml`'s `[[identity_namespaces]]` declares for
	 * this entity's own family (`srd.class` on the Barbarian class,
	 * `srd.subclass` on Path of the Berserker), AND the tag's last segment
	 * must equal this entity's own slug. A family absent from
	 * `identityNamespaces` (e.g. `class-feature` — the same feature id can
	 * legitimately appear once per class that grants it, sk-jay0.3.5.61)
	 * never has an identity tag, so it never owns a "belongs to" block. The
	 * same tag string can still appear on OTHER entities purely as linkage
	 * (every barbarian class feature also carries `srd.class.barbarian`) —
	 * that collision is exactly what this rule needs to detect, not avoid:
	 * those other entities are what "belongs to" this one.
	 */
	const identityTag = $derived.by(() => {
		const namespace = identityNamespaces[entry.family];
		if (namespace === undefined) return undefined;
		return (entry.tags ?? []).find((tag) => {
			const segments = tag.split(".");
			return segments.slice(0, -1).join(".") === namespace && segments.at(-1) === entry.slug;
		});
	});

	/**
	 * Every other catalogue entry that carries this entity's own identity
	 * tag — never entries that merely share some other, non-identity tag.
	 * Never includes the entity itself. Alphabetical for now (sorted by
	 * display name); level-aware ordering needs tag vocabulary that does
	 * not exist yet — sk-jay0.3.5.63.
	 */
	const ownedEntries = $derived(
		identityTag === undefined
			? []
			: catalogue
					.filter((candidate) => candidate.ref !== entry.ref && (candidate.tags ?? []).includes(identityTag))
					.toSorted((left, right) => left.display_name.localeCompare(right.display_name)),
	);
	// Grouped the same way a section page groups its own secondary
	// catalogue families (sk-jay0.3.5.64): passing an empty primary-family
	// list puts every owned entry into a family group, reusing the same
	// authored `family_headings`/`family_nouns` instead of a parallel table.
	// Ordered by that same table's own declaration order in `sections.toml`
	// (`Object.keys` on an object built from an ordered TOML array preserves
	// authored order) rather than incidentally by whichever family's
	// alphabetically-first member sorts earliest overall — a family with no
	// authored heading sorts after every declared one, alphabetically among
	// themselves as a stable tie-break.
	const familyDeclarationOrder = $derived(Object.keys(familyHeadings));
	/** Shared by every family-grouped block below (`ownedGroups`, `memberGroups`) so groups render in `sections.toml`'s authored family order rather than incidental alphabetical family order. */
	function byFamilyDeclarationOrder(order: readonly string[]) {
		return (left: { family: string }, right: { family: string }) => {
			const leftIndex = order.indexOf(left.family);
			const rightIndex = order.indexOf(right.family);
			if (leftIndex === -1 && rightIndex === -1) return left.family.localeCompare(right.family);
			if (leftIndex === -1) return 1;
			if (rightIndex === -1) return -1;
			return leftIndex - rightIndex;
		};
	}
	const ownedGroups = $derived(
		groupSrdCatalogueEntries([], familyHeadings, familyNouns, ownedEntries).secondary.toSorted(
			byFamilyDeclarationOrder(familyDeclarationOrder),
		),
	);

	/**
	 * A tag id can be BOTH a real tag and a namespace — `srd.alignment`
	 * exists as its own tag AND `srd.alignment.chaotic-evil` exists beneath
	 * it (sk-jay0.3.5.66). That is not a collision: this entry's own page
	 * (below) additionally lists every catalogue entry whose slug nests
	 * directly or transitively under this one's own slug, reusing the same
	 * `catalogue` prop and `ReferenceCard` idiom `ownedGroups` above already
	 * uses for "belongs to this entity". A path that is only a prefix and
	 * never itself a tag renders through the namespace listing instead
	 * (`DocsPageOverview`'s `namespacePrefix` mode) — this block only fires
	 * for the tag's own entry page.
	 */
	const childTags = $derived(
		entry.family === "tag"
			? catalogue
					.filter(
						(candidate) =>
							candidate.kind === "tag_value_definition" && candidate.slug.startsWith(`${entry.slug}/`),
					)
					.toSorted((left, right) => left.slug.localeCompare(right.slug))
			: [],
	);

	/**
	 * The reverse of `childTags`: every catalogue entry across the whole
	 * corpus that CARRIES this tag, precomputed at projection time onto
	 * `entry.members` (see project-metadata-docs.ts, sk-jay0.3.5.67) since
	 * `catalogue` above only ever holds this ONE section's own listing and
	 * a tag's members routinely live in other sections (a monster's tag
	 * page needs monsters, not other tags). Grouped by family the same way
	 * `ownedGroups` groups "belongs to" entries.
	 */
	const memberGroups = $derived(
		groupSrdCatalogueEntries([], familyHeadings, familyNouns, entry.members ?? []).secondary.toSorted(
			byFamilyDeclarationOrder(familyDeclarationOrder),
		),
	);

	const profileLabels: Record<string, string> = {
		spell: "Spell profile",
		monster: "Creature profile",
		item: "Equipment profile",
		weapon: "Equipment profile",
		armor: "Equipment profile",
		"magic-item": "Equipment profile",
		class: "Class profile",
		subclass: "Class profile",
		feat: "Feat profile",
	};
	const sourceHref = $derived(
		entry.source && page.source_base
			? new URL(entry.source.path, page.source_base.endsWith("/") ? page.source_base : `${page.source_base}/`).href
			: undefined,
	);
	// The generic row views (`ActionView`, `ConsequenceView`, … — every kind with
	// no resource/subject/tag carrier) print the description again under their own
	// manifest column, exactly as the three carriers above do. So they belong in
	// this chain: while they were missing from it, 1335 catalogue pages — every
	// action, consequence, capability and condition — showed the identical prose
	// twice, once as "Docs summary" and once as the manifest field.
	const componentDescription = $derived(
		entry.resource?.description ??
			entry.subject?.description ??
			entry.tag?.description ??
			rowView?.row.description,
	);
	// A docs summary that is just the leading text of the component description (an
	// authored excerpt, trailing ellipsis and all) is a near-duplicate: suppress the
	// second block rather than showing the same prose twice.
	const docsSummaryLead = $derived(entry.description.replace(/[\s…]+$/u, ""));
	const hasDistinctDocsSummary = $derived(
		componentDescription === undefined ||
			(entry.description !== componentDescription &&
				!componentDescription.startsWith(docsSummaryLead)),
	);
	// resource_definition relations render as dense inline rows (own value + first
	// sentence of the resource description); everything else keeps the existing
	// compact-card / bare-link list.
	// A carrier's tags and attachments are rendered by this page, not by the
	// carrier component, so that every page kind shows them in the same two
	// places — chips at the top, attachments at the bottom.
	const carrierTagLinks = $derived.by(() => {
		const carrier = entry.subject ?? entry.resource;
		if (carrier !== undefined) return carrier.tag_links ?? carrier.tags.map((tag) => ({ tag }));
		return entry.tag_links ?? (entry.tags ?? []).map((tag) => ({ tag }));
	});
	const carrierAttachments = $derived(
		entry.subject?.attachments ?? entry.resource?.attachments ?? entry.attachments ?? [],
	);
	const resourceRelations = $derived((entry.relations ?? []).filter((relation) => relation.resource));
	// A family whose source prints its values in a known shape gets that shape.
	// The order is authored in srd-cc's `sections.toml` and projected onto the
	// entry (`resource_block`) by the Node-side projector; a family without such
	// a block keeps the plain related-definitions list below, which is why this
	// is `undefined` on most pages.
	const statBlock = $derived(resourceBlock(entry.resource_block, resourceRelations));
	const otherRelations = $derived((entry.relations ?? []).filter((relation) => !relation.resource));
</script>

<article class="min-w-0 space-y-8">
	<nav aria-label="Breadcrumb" class="text-sm text-[color:var(--muted-foreground)]">
		<a href={page.href}>{page.title}</a> / <a href={section.href}>{section.title}</a>
	</nav>
	<DocsPageHeader title={entry.display_name} />
	{#if hasDistinctDocsSummary}
		<DescriptionField
			description={entry.description}
			field="docs catalogue entry.description"
			heading="Docs summary"
			context="Documentation projection"
		/>
	{/if}
	{#if entry.source}
		<p class="text-xs leading-5 text-[color:var(--muted-foreground)]">
			Source: {#if sourceHref}<a href={sourceHref}>{entry.source.path}</a>{:else}<code>{entry.source.path}</code>{/if} · {entry.source.anchor} · {entry.source.license}
		</p>
	{/if}
	{#if entry.resource}
		<ResourceView resource={entry.resource} view="full" {page} {section} chrome={false} sections={{ details: false }} />
	{:else if entry.subject}
		<SubjectView subject={entry.subject} view="full" {page} {section} chrome={false} sections={{ details: false }} />
	{:else if entry.tag}
		<TagView tag={entry.tag} view="full" chrome={false} sections={{ details: false }} />
	{:else if rowView}
		<rowView.registration.component row={rowView.row} view="full" chrome={false} sections={{ details: false }} />
	{/if}
	<!--
		The tags this entry carries, in the same place on every page kind: right
		under the entry's identity. A creature's size, type and alignment ARE tags,
		and a reader looks for them beside the name, not below the related
		definitions — so `ResourceView`/`SubjectView` hand their carrier's chips
		over here (`sections.tags`) instead of printing them inside their own
		details block (sk-jay0.3.5.86; the block itself is sk-jay0.3.5.71.4).
	-->
	<TagList links={carrierTagLinks} />
	<!--
		A grant runs tag -> capability, the opposite direction from every other tag
		junction, so it gets its own heading on each end rather than being folded
		into "Tags" or "Tagged with" — a capability is not wearing the tag, the tag
		is handing the capability out.
	-->
	{#if entry.granting_tags?.length}
		<TagList links={entry.granting_tags} heading="Granted by" />
	{/if}
	{#if entry.facts.length > 0}
		<section aria-labelledby="catalogue-profile">
			<h2 id="catalogue-profile" class="mb-3 text-xl [font-family:var(--font-display)]">
				{profileLabels[entry.family] ?? "Reference profile"}
			</h2>
			<dl class="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
				{#each entry.facts as fact}
					<div class="min-w-0 border-t border-[color:var(--border)] pt-2">
						<dt class="text-xs uppercase tracking-wide text-[color:var(--muted-foreground)]">{fact.label}</dt>
						<dd class="[overflow-wrap:anywhere]">{#if fact.href}<a class="text-primary underline-offset-4 hover:underline" href={fact.href}>{fact.value}</a>{:else}{fact.value}{/if}</dd>
					</div>
				{/each}
			</dl>
		</section>
	{/if}
	{#if statBlock}
		<section aria-labelledby="catalogue-statistics" data-testid="stat-block">
			<h2 id="catalogue-statistics" class="mb-3 text-xl [font-family:var(--font-display)]">{statBlock.heading}</h2>
			{#each statBlock.groups as group (group.title)}
				<section class="mt-4">
					<h3 class="font-display text-lg font-medium">{group.title}</h3>
					<div class="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
						{#each group.entries as relation (`${relation.kind}:${relation.ref}`)}
							{#if relation.resource}
								<div class="min-w-0 border-t border-[color:var(--border)] pt-2"><ResourceView resource={relation.resource} view="inline" value={relation.value_int ?? relation.value_bool} /></div>
							{/if}
						{/each}
					</div>
				</section>
			{/each}
		</section>
	{/if}
	{#if otherRelations.length || (statBlock === undefined && resourceRelations.length > 0)}
		<section aria-labelledby="catalogue-relations">
			<h2 id="catalogue-relations" class="mb-3 text-xl [font-family:var(--font-display)]">Related definitions</h2>
			{#if statBlock === undefined && resourceRelations.length}
				<div class="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
					{#each resourceRelations as relation (`${relation.kind}:${relation.ref}`)}
						{#if relation.resource}
							<div class="min-w-0 border-t border-[color:var(--border)] pt-2"><ResourceView resource={relation.resource} view="inline" value={relation.value_int ?? relation.value_bool} /></div>
						{/if}
					{/each}
				</div>
			{/if}
			{#if otherRelations.length}
				<ul class="mt-4 grid gap-2 sm:grid-cols-2">
					{#each otherRelations as relation (`${relation.kind}:${relation.ref}`)}
						<li class="min-w-0 border-t border-[color:var(--border)] pt-2">
							{#if relation.subject}
								<SubjectView subject={relation.subject} view="compact" />
							{:else if relation.href}<a class="[overflow-wrap:anywhere] text-primary underline-offset-4 hover:underline" href={relation.href}>{relation.label ?? relation.ref}</a>
							{:else}<span class="[overflow-wrap:anywhere]">{relation.label ?? relation.ref}</span>{/if}
							{#if !relation.subject}
								<span class="block text-xs text-[color:var(--muted-foreground)]">{relation.kind} · {relation.ref}</span>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/if}
	{#if ownedGroups.length > 0}
		<section aria-labelledby="catalogue-owned">
			<h2 id="catalogue-owned" class="mb-3 text-xl [font-family:var(--font-display)]">Belongs to {entry.display_name}</h2>
			{#each ownedGroups as group (group.family)}
				{#if group.entries.length > RELATED_GROUP_COLLAPSE_THRESHOLD}
					<details class="mt-4">
						<summary class="cursor-pointer font-display text-lg font-medium">{group.heading} ({group.entries.length})</summary>
						{@render ownedGroupList(group.entries, group.noun.singular)}
					</details>
				{:else}
					<div class="mt-4">
						<h3 class="font-display text-lg font-medium">{group.heading} ({group.entries.length})</h3>
						{@render ownedGroupList(group.entries, group.noun.singular)}
					</div>
				{/if}
			{/each}
		</section>
	{/if}
	{#if childTags.length > 0}
		<section aria-labelledby="catalogue-child-tags">
			<h2 id="catalogue-child-tags" class="mb-3 text-xl [font-family:var(--font-display)]">Tag vocabulary under {entry.display_name}</h2>
			{@render ownedGroupList(childTags, "tag")}
		</section>
	{/if}
	{#if entry.granted_capabilities?.length}
		<section aria-labelledby="catalogue-grants">
			<h2 id="catalogue-grants" class="mb-3 text-xl [font-family:var(--font-display)]">Capabilities granted by {entry.display_name}</h2>
			{@render ownedGroupList(entry.granted_capabilities, "capability")}
		</section>
	{/if}
	{#if memberGroups.length > 0}
		<!-- After the child-tag taxonomy, not before: child tags are this tag's own
		     abstract vocabulary structure, members are the concrete entries wearing
		     it, so the page reads taxonomy-first, instances-second. -->
		<section aria-labelledby="catalogue-members">
			<h2 id="catalogue-members" class="mb-3 text-xl [font-family:var(--font-display)]">Tagged with {entry.display_name}</h2>
			{#each memberGroups as group (group.family)}
				{#if group.entries.length > RELATED_GROUP_COLLAPSE_THRESHOLD}
					<details class="mt-4">
						<summary class="cursor-pointer font-display text-lg font-medium">{group.heading} ({group.entries.length})</summary>
						{@render ownedGroupList(group.entries, group.noun.singular)}
					</details>
				{:else}
					<div class="mt-4">
						<h3 class="font-display text-lg font-medium">{group.heading} ({group.entries.length})</h3>
						{@render ownedGroupList(group.entries, group.noun.singular)}
					</div>
				{/if}
			{/each}
		</section>
	{/if}
	{#if entry.resource}
		<ResourceView resource={entry.resource} view="full" {page} {section} chrome={false} sections={{ header: false, tags: false, attachments: false }} />
	{:else if entry.subject}
		<SubjectView subject={entry.subject} view="full" {page} {section} chrome={false} sections={{ header: false, tags: false, attachments: false }} />
	{:else if entry.tag}
		<TagView tag={entry.tag} view="full" chrome={false} sections={{ header: false }} />
	{:else if rowView}
		<rowView.registration.component row={rowView.row} view="full" chrome={false} sections={{ header: false }} />
	{:else}
		<details class="border-t border-[color:var(--border)] pt-4">
			<summary>Technical definition</summary>
			<pre class="mt-3 overflow-x-auto text-xs">{JSON.stringify(entry.record, null, 2)}</pre>
		</details>
	{/if}
	<CatalogueFacets facets={entry.facets ?? []} />
	{#if carrierAttachments.length}
		<!--
			Last, and deliberately so. The SRD reference attachment reprints the
			printed source block a reader may want to check ours against; it is the
			original to compare with, not the page's own answer, so everything this
			bundle authors comes first and the quotation closes the page. The same
			block carries every other kind's `metadata_attachments` rows (a place
			graph's `place.note`, an affordance template's `ui.affordance_group`),
			which is why one section serves all page kinds (sk-jay0.3.5.76).
		-->
		<section aria-labelledby="catalogue-attachments">
			<h2 id="catalogue-attachments" class="mb-3 text-xl [font-family:var(--font-display)]">Attachments</h2>
			<div class="space-y-4">
				{#each carrierAttachments as attachment (`${attachment.bundle_id}:${attachment.namespace}`)}
					<AttachmentBlock {attachment} />
				{/each}
			</div>
		</section>
	{/if}
	{#if entry.provenance?.length}
		<details class="border-t border-[color:var(--border)] pt-4 text-sm">
			<summary>Source records</summary>
			<ul class="mt-3 space-y-2">
				{#each entry.provenance as source (`${source.bundle_id}:${source.namespace}:${source.source ?? ""}`)}
					<li><strong>{source.namespace}</strong>{source.source ? ` · ${source.source}` : ""}{source.payload_source ? ` · ${source.payload_source}` : ""}{source.license ? ` · ${source.license}` : ""}</li>
				{/each}
			</ul>
		</details>
	{/if}
</article>

{#snippet ownedGroupList(
	entries: {
		ref: string;
		href: string;
		display_name: string;
		description: string;
		facts?: DocsFact[];
		art?: { href: string };
	}[],
	noun: string,
)}
	<ul class="mt-3 grid list-none gap-3 p-0 sm:grid-cols-2">
		{#each entries as owned (owned.ref)}
			<li><ReferenceCard href={owned.href} title={owned.display_name} description={owned.description} label={noun} facts={owned.facts} art={owned.art ? { href: owned.art.href } : undefined} /></li>
		{/each}
	</ul>
{/snippet}
