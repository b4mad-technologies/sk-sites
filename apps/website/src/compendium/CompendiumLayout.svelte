<script lang="ts">
	import { ProductMasthead, type ProductNavItem } from "@spellkave/ui";
	import type { Snippet } from "svelte";
	import { LOGIN_PATH } from "../lib/auth-routes";
	import CompendiumSearch from "./CompendiumSearch.svelte";
	import CompendiumSidebar from "./CompendiumSidebar.svelte";
	import type { DocsIndexV1, DocsSearchEntry } from "./docs-types";
	import type { CompendiumRoute } from "./types";

	let {
		route,
		docsIndex,
		searchRows,
		children,
	}: {
		route: CompendiumRoute;
		docsIndex: DocsIndexV1 | null;
		searchRows: DocsSearchEntry[];
		children: Snippet;
	} = $props();

	const navigation = $derived<ProductNavItem[]>([
		{ label: "Worlds", href: "/", icon: "worlds" },
		{ label: "Connect", href: "/#connect", icon: "settings" },
		{ label: "Maps", href: "https://maps.spellkave.com", icon: "maps" },
		{ label: "Docs", href: "/docs", icon: "docs", current: true },
	]);
	let mobileSidebarOpen = $state(false);
</script>

<ProductMasthead brandHref="/" {navigation} signInLabel="Sign in" signInHref={LOGIN_PATH} />

<div class="toolbar">
	<CompendiumSearch rows={searchRows} searchHref={docsIndex?.search_href} />
</div>

<details class="mobile-sidebar" bind:open={mobileSidebarOpen}>
	<summary>Browse documentation</summary>
	<CompendiumSidebar
		{docsIndex}
		{route}
		label="Documentation navigation"
		onNavigate={() => (mobileSidebarOpen = false)}
	/>
</details>

<div class="frame">
	<CompendiumSidebar {docsIndex} {route} />
	<div class="main">
		{@render children()}
	</div>
</div>

<style>
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem 1rem;
		width: min(100% - 2rem, 96rem);
		margin: 0 auto;
		padding: 1rem 0 0.5rem;
	}

	.mobile-sidebar {
		width: min(100% - 2rem, 96rem);
		margin: 0 auto;
		padding: 0.25rem 0 0.5rem;
	}

	.mobile-sidebar summary {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		padding: 0 0.8rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		color: inherit;
		background: var(--card);
		text-decoration: none;
		cursor: pointer;
	}

	.mobile-sidebar :global(.sidebar) {
		margin-top: 0.5rem;
		padding: 0.5rem 0 0;
		border-top: 1px solid var(--border);
		border-right: 0;
	}

	.frame {
		display: grid;
		grid-template-columns: 1fr;
		width: min(100% - 2rem, 96rem);
		margin: 0 auto;
		min-height: calc(100svh - 10rem);
	}

	@media (max-width: 767px) {
		.frame > :global(.sidebar) {
			display: none;
		}
	}

	.main {
		min-width: 0;
		padding: 1.25rem 0 3rem;
	}

	@media (min-width: 768px) {
		.mobile-sidebar {
			display: none;
		}

		.frame {
			grid-template-columns: 220px minmax(0, 1fr);
			gap: 1.5rem;
		}

		.main {
			padding-left: 0.5rem;
		}
	}

	@media (min-width: 1024px) {
		.frame {
			grid-template-columns: 250px minmax(0, 1fr);
			gap: 2.5rem;
		}
	}
</style>
