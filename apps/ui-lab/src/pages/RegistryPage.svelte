<script lang="ts">
	import type { Component } from "svelte";
	import ComponentContract from "../docs/ComponentContract.svelte";
	import ComponentPreview from "../docs/ComponentPreview.svelte";
	import DocPage from "../docs/DocPage.svelte";
	import Guidance from "../docs/Guidance.svelte";
	import type { DocPageDef } from "../docs/pages";

	let { page }: { page: DocPageDef } = $props();
</script>

<DocPage title={page.title} description={page.description}>
	{#each page.demos ?? [] as demo, index (demo.fileName)}
		{@const Demo = demo.component as Component}
		<section class="mt-4">
			<h2
				id={index === 0 ? "preview" : demo.name}
				class="mb-1 scroll-m-20 [font-family:var(--font-display)] text-2xl font-normal tracking-[-0.02em] text-[color:var(--foreground)]"
			>
				{index === 0 ? "Preview" : demo.fileName.replace(/Demo\.svelte$/, "")}
			</h2>
			<ComponentPreview name={demo.name} fileName={demo.fileName} source={demo.source} size={demo.size}>
				{#snippet preview()}
					<Demo />
				{/snippet}
			</ComponentPreview>
		</section>
	{/each}
	{#if page.contract}<ComponentContract contract={page.contract} />{/if}
	{#if page.designHeading}
		<Guidance heading={page.designHeading} />
	{/if}
</DocPage>
