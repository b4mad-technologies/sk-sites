<script lang="ts">
	import DocsPageHeader from "./DocsPageHeader.svelte";
</script>

{#snippet intro()}
	<p><a href="/docs/start">Start here</a> or browse the handbook.</p>
{/snippet}

<DocsPageHeader title="Handbook" {intro} />
