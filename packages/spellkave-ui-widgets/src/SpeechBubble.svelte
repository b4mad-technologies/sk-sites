<script lang="ts">
	import type { Snippet } from "svelte";

	let { speaker, outgoing = false, continued = false, heading, children, text }: {
		speaker: string;
		outgoing?: boolean;
		continued?: boolean;
		heading?: Snippet;
		children?: Snippet;
		text?: string;
	} = $props();
</script>

<div class="speech-line" data-slot="speech-bubble" data-direction={outgoing ? "outgoing" : "incoming"}>
	{#if !continued}<h3 class="sk-label m-0 mb-1">{#if heading}{@render heading()}{:else}{speaker}{/if}</h3>{/if}
	<div class="sk-play-quote">{#if children}{@render children()}{:else}<p class="sk-play-prose m-0">{text}</p>{/if}</div>
</div>

<style>
	.speech-line { display: flex; flex-direction: column; align-items: flex-start; min-width: 0; }
	.speech-line[data-direction="outgoing"] { align-items: flex-end; }
	.sk-play-quote { width: fit-content; max-width: 100%; box-sizing: border-box; overflow-wrap: anywhere; }
	.speech-line[data-direction="outgoing"] .sk-play-quote { max-width: 85%; }
</style>
