<script lang="ts">
	import Glyph from "./Glyph.svelte";

	let { src, alt, compact = false, state: imageState = "loading", errorText = "Image unavailable", onLoad, onError }: {
		src?: string; alt: string; compact?: boolean; state?: "loading" | "ready" | "error";
		errorText?: string; onLoad?: () => void; onError?: () => void;
	} = $props();
	let failed = $state(false);
	$effect(() => { void src; failed = false; });
</script>

<span class:compact class="artwork" data-slot="play-artwork" data-state={failed ? "error" : imageState}>
	{#if src && !failed}
		<img src={src} {alt} loading="lazy" decoding="async" onload={() => onLoad?.()} onerror={() => { failed = true; onError?.(); }} />
	{:else}
		<span class="fallback" role="img" title={imageState === "error" || failed ? errorText : undefined} aria-label={`${alt} — ${imageState === "error" || failed ? errorText : "loading image"}`}>
			<Glyph name="thing" class="size-5 opacity-50" />
			{#if !compact && (imageState === "error" || failed)}<span class="failure-copy">{errorText}</span>{/if}
		</span>
	{/if}
</span>

<style>
	.artwork { display: inline-flex; align-items: center; justify-content: center; width: 6rem; height: 6rem; flex: 0 0 auto; max-width: 100%; border-radius: var(--radius); background: color-mix(in srgb, currentColor 5%, transparent); overflow: hidden; }
	.artwork.compact { width: 2.5rem; height: 2.5rem; }
	img { width: 100%; height: 100%; object-fit: contain; }
	.fallback { display: flex; flex-direction: column; align-items: center; padding: .25rem; gap: .25rem; }
	.failure-copy { font-size: .65rem; line-height: 1.2; text-align: center; overflow-wrap: anywhere; }
</style>
