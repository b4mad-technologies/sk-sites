<script lang="ts">
	import type { DocsPageHeaderProps } from "./types";

	let { title, description, intro }: DocsPageHeaderProps = $props();
</script>

<header class="relative mb-8" data-slot="docs-page-header">
	<h1
		class="sk-title scroll-m-20 text-4xl font-normal tracking-[-0.02em] text-[color:var(--foreground)] sm:text-5xl"
	>
		{title}
	</h1>
	{#if intro}
		<div class="mt-3 max-w-[65ch] text-lg leading-7 text-[color:var(--muted-foreground)]">
			{@render intro()}
		</div>
	{:else if description}
		<p class="mt-3 max-w-[65ch] text-lg leading-7 text-[color:var(--muted-foreground)]">
			{description}
		</p>
	{/if}
</header>
