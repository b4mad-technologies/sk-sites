<script lang="ts">
	import { DocsPageHeader } from "@spellkave/ui";
	import type { Snippet } from "svelte";
	import { tick } from "svelte";
	import DocsPager from "./DocsPager.svelte";
	import { router } from "./router.svelte";
	import Toc from "./Toc.svelte";
	import { headingsToToc, type TocItem } from "./toc";

	let {
		title,
		description,
		children,
	}: {
		title: string;
		description: string;
		children: Snippet;
	} = $props();

	let mainEl = $state<HTMLElement | null>(null);
	let toc = $state<TocItem[]>([]);

	$effect(() => {
		void title;
		const section = router.section;
		let active = true;
		void tick().then(() => {
			if (!active) return;
			toc = headingsToToc(mainEl);
			if (section) document.getElementById(section)?.scrollIntoView({ block: "start" });
		});
		return () => { active = false; };
	});
</script>

<div class="relative flex flex-row-reverse pl-4 pr-4 pt-8 sm:pt-16 md:pl-0 lg:gap-10 xl:grid xl:grid-cols-[1fr_220px]">
	<aside class="order-2 hidden text-sm xl:block">
		<div class="sticky top-[70px] -mt-16 flex h-[calc(100vh-70px)] flex-col gap-4 overflow-hidden pt-6">
			{#key toc}
				<Toc {toc} />
			{/key}
		</div>
	</aside>
	<div class="order-1 mx-auto w-full min-w-0 md:max-w-[760px]">
		<main class="docs-prose pb-24" id="main-content" bind:this={mainEl}>
			<DocsPageHeader {title} {description} />
			{@render children()}
			<DocsPager />
		</main>
	</div>
</div>
