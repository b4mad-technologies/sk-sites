<script lang="ts">
	import type { DocsIndexV1 } from "./docs-types";
	import { metadataStringDiagnostic } from "./metadata-diagnostics";
	import { pushPath } from "./parse-path";
	import { renderSheetHtml } from "./sheet-html";

	let { index, title = "Documentation", eyebrow = "Spellkave documentation" }: { index: DocsIndexV1; title?: string; eyebrow?: string } = $props();

	function open(href: string, event: MouseEvent) {
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		event.preventDefault();
		pushPath(href);
	}

	function titleDiagnostic(value: unknown): string | null {
		return metadataStringDiagnostic(value, "metadata.docs.title");
	}

	function introDiagnostic(value: unknown): string | null {
		return metadataStringDiagnostic(value, "metadata.docs.intro", { allowEmpty: true });
	}
</script>

<section data-testid="docs-overview">
	<header>
		<p class="eyebrow">{eyebrow}</p>
		<h1>{title}</h1>
	</header>

	<div class="cards">
		{#each index.pages as page (page.page_id)}
			<article>
				<h2><a href={page.href} onclick={(event) => open(page.href, event)}>{titleDiagnostic(page.title) ?? page.title}</a></h2>
				{#if introDiagnostic(page.intro)}<p class="diagnostic">{introDiagnostic(page.intro)}</p>
				{:else if page.intro !== ""}<div class="intro">{@html renderSheetHtml(page.intro, "markdown")}</div>{/if}
			</article>
		{/each}
	</div>
</section>

<style>
	.eyebrow {
		margin: 0 0 0.5rem;
		color: var(--muted-foreground);
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	h1 {
		margin: 0 0 0.75rem;
		font-family: var(--font-display);
		font-size: clamp(2.3rem, 5vw, 4.4rem);
		font-weight: 500;
	}

	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
		gap: 1rem;
	}

	.cards article {
		display: flex;
		flex-direction: column;
		min-height: 11rem;
		padding: 1.25rem 1.35rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		color: inherit;
		background: var(--card);
		text-decoration: none;
	}

	.cards article:has(a:hover),
	.cards article:has(a:focus-visible) {
		border-color: var(--primary);
	}

	h2 {
		margin: 0 0 0.55rem;
		font-family: var(--font-display);
		font-size: 1.5rem;
		font-weight: 500;
	}

	h2 a { color: inherit; text-decoration: none; }

	.cards p, .intro :global(p) {
		margin: 0;
		color: var(--muted-foreground);
		line-height: 1.5;
	}

	.diagnostic { color: var(--destructive) !important; }
</style>
