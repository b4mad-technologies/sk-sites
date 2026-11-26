<script lang="ts">
	import { Collapsible } from "@spellkave/ui";
	import type { DocsIndexV1, DocsNavGroup, DocsPage } from "./docs-types";
	import { metadataStringDiagnostic } from "./metadata-diagnostics";
	import { pushPath } from "./parse-path";
	import type { CompendiumRoute } from "./types";

	let {
		docsIndex,
		route,
		label = "Documentation",
		onNavigate,
	}: {
		docsIndex: DocsIndexV1 | null;
		route: CompendiumRoute;
		label?: string;
		onNavigate?: () => void;
	} = $props();

	type SidebarLink = { href: string; label: string; current: boolean };
	/** One documentation page's own links, nested inside a `SidebarGroup`. */
	type SidebarBlock = { id: string; title?: string; links: SidebarLink[] };
	/** A collapsible section of the sidebar (`Adventures`, `System reference`, `Technical data`). */
	type SidebarGroup = { id: string; label: string; active: boolean; blocks: SidebarBlock[] };

	/**
	 * Authored group order (sk-fr4 nav_group rework): "All documentation" is a
	 * plain link rendered separately, "Technical data" is always last, and
	 * these two carry every documentation page in between. A page's group is
	 * an authoring decision (`DocsPage.nav_group`), never derived from id or
	 * sort order.
	 */
	const NAV_GROUP_ORDER: readonly DocsNavGroup[] = ["adventure", "reference"];
	const NAV_GROUP_LABELS: Record<DocsNavGroup, string> = {
		adventure: "Adventures",
		reference: "System reference",
	};

	function routePath(current: CompendiumRoute): string {
		return current.page === "index" ? "/docs" : current.pathname;
	}

	function buildPageBlock(
		page: DocsPage,
		currentPath: string,
		articlePath: boolean,
	): { block: SidebarBlock; active: boolean } {
		let active = currentPath === page.href;
		const links: SidebarLink[] = [
			{ href: page.href, label: "Overview", current: currentPath === page.href },
			...page.sections.flatMap((section) => {
				const sectionActive =
					currentPath === section.href || currentPath.startsWith(`${section.href}/`);
				if (sectionActive) active = true;
				return [
					{
						href: section.href,
						label:
							metadataStringDiagnostic(
								section.title,
								`metadata.docs.sections[id=${section.id}].title`,
							) ?? section.title,
						current: currentPath === section.href || (!articlePath && sectionActive),
					},
					...(sectionActive ? (section.pages ?? []) : [])
						.filter(
							(article) => article.featured_reference === undefined && currentPath === article.href,
						)
						.map((article) => ({
							// Non-null: the filter above keeps only non-featured
							// articles, the only ones that carry an href (sk-jay0.7.93).
							href: article.href!,
							label: `— ${article.title}`,
							current: currentPath === article.href,
						})),
					...(sectionActive ? (section.documents ?? []) : [])
						.filter((document) => currentPath === document.href)
						.map((document) => ({
							href: document.href,
							label: `— ${document.title}`,
							current: currentPath === document.href,
						})),
				];
			}),
		];
		return {
			block: {
				id: `page:${page.page_id}`,
				title: metadataStringDiagnostic(page.title, "metadata.docs.title") ?? page.title,
				links,
			},
			active,
		};
	}

	const currentPath = $derived(routePath(route));

	const groups = $derived.by<SidebarGroup[]>(() => {
		if (docsIndex === null) {
			return [
				{
					id: "adventure",
					label: NAV_GROUP_LABELS.adventure,
					active: false,
					blocks: [
						{
							id: "loading",
							title: "Catalog loading",
							links: [{ href: "/docs", label: "Documentation loading", current: false }],
						},
					],
				},
			];
		}
		const articlePath = docsIndex.pages.some((page) =>
			page.sections.some((section) => section.pages?.some((article) => article.href === currentPath)),
		);
		const byGroup = new Map<DocsNavGroup, { blocks: SidebarBlock[]; active: boolean }>(
			NAV_GROUP_ORDER.map((navGroup) => [navGroup, { blocks: [], active: false }]),
		);
		for (const page of docsIndex.pages) {
			const bucket = byGroup.get(page.nav_group);
			if (!bucket) continue;
			const { block, active } = buildPageBlock(page, currentPath, articlePath);
			bucket.blocks.push(block);
			if (active) bucket.active = true;
		}
		for (const bucket of byGroup.values()) {
			bucket.blocks.sort((left, right) => (left.title ?? "").localeCompare(right.title ?? ""));
		}
		const result: SidebarGroup[] = [];
		for (const navGroup of NAV_GROUP_ORDER) {
			const bucket = byGroup.get(navGroup);
			if (!bucket || bucket.blocks.length === 0) continue;
			result.push({ id: navGroup, label: NAV_GROUP_LABELS[navGroup], active: bucket.active, blocks: bucket.blocks });
		}
		const technicalSources = docsIndex.technical_sources ?? [];
		if (technicalSources.length) {
			const links = technicalSources.map((source) => ({
				href: source.href,
				label: `${source.source_id} rows`,
				current: currentPath === source.href || currentPath.startsWith(`${source.href}/`),
			}));
			result.push({
				id: "technical",
				label: "Technical data",
				active: links.some((link) => link.current),
				blocks: [{ id: "technical", links }],
			});
		}
		return result;
	});

	// Which groups are open, keyed by group id. Seeded to the group holding
	// the active route on first render (or whenever a not-yet-touched group
	// becomes active via navigation); once a group has been explicitly
	// toggled, the user's choice sticks.
	let openState = $state<Record<string, boolean>>({});

	$effect(() => {
		for (const group of groups) {
			if (group.active && openState[group.id] === undefined) {
				openState[group.id] = true;
			}
		}
	});

	function go(href: string, event: MouseEvent) {
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		event.preventDefault();
		pushPath(href);
		onNavigate?.();
	}
</script>

{#snippet blockList(blocks: SidebarBlock[])}
	<!--
		A page heading only earns its space when the group holds more than one
		page: with a single page the group label already names it, and
		"System reference / SYSTEM REFERENCE" reads as a stutter.
	-->
	{#each blocks as block (block.id)}
		{#if block.title && blocks.length > 1}<h3>{block.title}</h3>{/if}
		<ul>
			{#each block.links as link (link.href)}
				<li>
					<a
						href={link.href}
						aria-current={link.current ? "page" : undefined}
						onclick={(event) => go(link.href, event)}
					>{link.label}</a>
				</li>
			{/each}
		</ul>
	{/each}
{/snippet}

<nav class="sidebar" aria-label={label}>
	<section class="all-docs">
		<ul>
			<li>
				<a
					href="/docs"
					aria-current={currentPath === "/docs" ? "page" : undefined}
					onclick={(event) => go("/docs", event)}
				>All documentation</a>
			</li>
		</ul>
	</section>
	{#each groups as group (group.id)}
		{#snippet groupContent()}
			{@render blockList(group.blocks)}
		{/snippet}
		<Collapsible
			title={group.label}
			content={groupContent}
			open={openState[group.id] ?? false}
			onOpenChange={(next) => (openState[group.id] = next)}
		/>
	{/each}
</nav>

<style>
	.sidebar { padding: 1.25rem 1rem 3rem 0; border-right: 1px solid var(--border); }
	.sidebar > :global(*) { margin-top: 0; }
	.sidebar > :global(* + *) { margin-top: 0.75rem; }
	h3 { margin: 0 0 0.4rem; padding-left: 0.75rem; color: var(--muted-foreground); font-size: 0.7rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
	h3 + ul { margin-bottom: 0.75rem; }
	ul { margin: 0; padding: 0; list-style: none; }
	.all-docs { padding: 0 0.75rem; }
	a { display: flex; align-items: center; min-height: 44px; padding: 0 0.75rem; border-radius: var(--radius); color: var(--foreground); text-decoration: none; }
	.all-docs a { padding: 0; }
	a[aria-current="page"] { color: var(--primary); background: color-mix(in srgb, var(--primary) 12%, transparent); }
</style>
