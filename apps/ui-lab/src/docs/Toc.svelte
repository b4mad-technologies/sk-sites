<script lang="ts">
	import { onMount } from "svelte";
	import Icon from "./Icon.svelte";
	import TocTree from "./TocTree.svelte";
	import type { TocItem } from "./toc";

	let { toc }: { toc: TocItem[] } = $props();

	let activeUrl = $state<string | null>(null);

	onMount(() => {
		const root = document.getElementById("main-content");
		if (!root) return;
		const elements = Array.from(root.querySelectorAll("h2, h3"));
		const sections = new Map<Element, string>();
		let currentSectionId: string | null = null;
		for (const element of elements) {
			if (element.closest('[data-slot="component-preview"]')) continue;
			if (element.id && (element.tagName === "H2" || element.tagName === "H3")) {
				currentSectionId = element.id;
			}
			if (!currentSectionId) continue;
			sections.set(element, `#${currentSectionId}`);
		}

		const visibleElements = new Set<Element>();
		const callback = (entries: IntersectionObserverEntry[]) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					visibleElements.add(entry.target);
				} else {
					visibleElements.delete(entry.target);
				}
			}
			const firstVisibleSection = Array.from(sections.entries()).find(([element]) =>
				visibleElements.has(element),
			);
			if (!firstVisibleSection) return;
			activeUrl = firstVisibleSection[1];
		};

		const observer = new IntersectionObserver(callback, { rootMargin: "-70px 0px" });
		for (const element of sections.keys()) observer.observe(element);
		return () => observer.disconnect();
	});
</script>

{#if toc.length}
	<nav class="w-[220px] max-w-[220px] space-y-2 text-sm" aria-label="On this page">
		<div class="-ml-px flex items-center gap-1.5 text-[color:var(--muted-foreground)]">
			<Icon name="list" class="size-4 shrink-0" />
			<p class="text-sm text-[color:var(--muted-foreground)]">On this page</p>
		</div>
		<div class="relative mt-4">
			<TocTree tree={toc} {activeUrl} />
		</div>
	</nav>
{/if}
