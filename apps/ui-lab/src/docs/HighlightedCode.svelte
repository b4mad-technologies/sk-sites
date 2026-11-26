<script lang="ts">
	import { onMount } from "svelte";

	let { source, lang = "svelte" }: { source: string; lang?: string } = $props();

	let html = $state("");
	let failed = $state(false);

	type Highlighter = {
		codeToHtml: (code: string, options: { lang: string; theme: string }) => string;
	};

	let highlighter: Highlighter | null = null;

	function colorScheme(): "dark" | "light" {
		if (typeof document === "undefined") return "dark";
		const scheme = getComputedStyle(document.documentElement).colorScheme;
		if (scheme.includes("light") && !scheme.includes("dark")) return "light";
		if (scheme.includes("dark")) return "dark";
		return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
	}

	async function loadHighlighter(): Promise<Highlighter | null> {
		if (highlighter) return highlighter;
		try {
			const shiki = await import("shiki/bundle/web");
			highlighter = await shiki.createHighlighter({
				themes: ["github-dark", "github-light"],
				langs: ["svelte"],
			});
			return highlighter;
		} catch {
			return null;
		}
	}

	async function highlight() {
		const loaded = await loadHighlighter();
		if (!loaded) {
			html = "";
			failed = true;
			return;
		}
		const theme = colorScheme() === "light" ? "github-light" : "github-dark";
		html = loaded.codeToHtml(source, { lang, theme });
		failed = false;
	}

	onMount(() => {
		void highlight();
	});
</script>

{#if html && !failed}
	<div class="docs-code [&_pre]:m-0 [&_pre]:bg-transparent [&_pre]:p-4 [&_pre]:text-sm">{@html html}</div>
{:else}
	<pre class="m-0 overflow-x-auto p-4 text-sm leading-6 text-[color:var(--foreground)]"><code>{source}</code></pre>
{/if}
