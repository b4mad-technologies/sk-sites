<script lang="ts">
	/** Display-only prose disclosure. Labels, prose and initial expansion are
	 * supplied by the host; no ruleset interpretation or action callback. */
	let { text, label = "Description", open = false, valueSlot }: {
		text?: string;
		label?: string;
		open?: boolean;
		valueSlot?: string;
	} = $props();
</script>

{#if text?.trim()}
	<details {open} class="mt-2 min-w-0 text-sm" data-slot="play-description">
		<summary class="cursor-pointer break-words rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2">{label}</summary>
		<p class="sk-play-prose !mt-2 whitespace-pre-line break-words" data-slot={valueSlot}>{text}</p>
	</details>
{/if}
