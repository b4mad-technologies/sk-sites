<script lang="ts">
	import { initTheme } from "@spellkave/ui/theme";
	import { onMount } from "svelte";
	import DocsLayout from "./docs/DocsLayout.svelte";
	import { findPage } from "./docs/pages";
	import { router, startRouter } from "./docs/router.svelte";
	import RegistryPage from "./pages/RegistryPage.svelte";

	initTheme();

	onMount(() => startRouter());

	const page = $derived(findPage(router.path));
	const PageComponent = $derived(page?.page);
</script>

<svelte:head>
	<title>{page ? `${page.title} · Spellkave UI` : "Spellkave UI Lab"}</title>
	<meta
		name="description"
		content="Component documentation for the shared Spellkave design system."
	/>
</svelte:head>

<div class="min-h-screen bg-[color:var(--background)] text-[color:var(--foreground)]">
	<DocsLayout>
		{#if PageComponent}
			<PageComponent />
		{:else if page}
			<RegistryPage {page} />
		{:else}
			<main class="px-4 py-16" id="main-content">
				<h1 class="[font-family:var(--font-display)] text-3xl">Not found</h1>
				<p class="mt-3 text-[color:var(--muted-foreground)]">No page at {router.path}.</p>
			</main>
		{/if}
	</DocsLayout>
</div>
