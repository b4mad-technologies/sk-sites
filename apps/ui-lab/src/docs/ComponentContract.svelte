<script lang="ts">
	import type { ComponentContract } from "./component-contract";
	import { href } from "./router.svelte";

	let { contract }: { contract: ComponentContract } = $props();
</script>

<section aria-labelledby="component-contract" class="mt-8 space-y-4">
	<h2 id="component-contract" class="scroll-m-20 sk-display text-2xl">Component contract</h2>
	<p><code>{contract.exportName}</code> from <code>{contract.packageName}</code></p>
	<p>{contract.responsibility}</p>
	<dl class="grid gap-3">
		{#each contract.inputs as input (input.name)}
			<div><dt class="font-semibold"><code>{input.name}</code> · {input.type}</dt><dd class="mt-1 text-muted-foreground">{input.description}</dd></div>
		{/each}
	</dl>
	<p><strong>Data owner:</strong> {contract.dataOwner}</p>
	<p><strong>Source:</strong> <code class="break-words">{contract.source}</code></p>
	<h2 id="component-relationships" class="scroll-m-20 sk-display text-2xl">Relationships</h2>
	<ul class="list-disc space-y-2 pl-5">
		{#each contract.related as related (related.path)}
			<li><a href={href(related.path)}>{related.label}</a> — {related.description}</li>
		{/each}
	</ul>
	<h3 id="component-consumers" class="scroll-m-20 sk-display text-xl">Selected consumers</h3>
	<ul class="list-disc space-y-3 pl-5">
		{#each contract.consumers as consumer (consumer.source)}
			<li>{consumer.description}<br /><code class="break-words">{consumer.source}</code></li>
		{/each}
	</ul>
</section>
