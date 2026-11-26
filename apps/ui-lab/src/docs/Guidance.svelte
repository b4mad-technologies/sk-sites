<script lang="ts">
	import parsedDesignMd from "virtual:spellkave-design-md";
	import { joinDesignCatalog } from "../primitives/design-catalog";

	let { heading }: { heading: string } = $props();

	const catalog = joinDesignCatalog(parsedDesignMd);
	const entry = catalog.samples.find((sample) => sample.heading === heading);

	function titleCase(title: string): string {
		return title.charAt(0).toUpperCase() + title.slice(1);
	}
</script>

{#if entry && entry.excerpts.length > 0}
	<section class="mt-12" aria-labelledby="guidance-heading">
		<h2
			id="guidance"
			class="scroll-m-20 [font-family:var(--font-display)] text-2xl font-normal tracking-[-0.02em] text-[color:var(--foreground)]"
		>
			<span id="guidance-heading">Guidance</span>
		</h2>
		<div class="mt-4 grid max-w-[65ch] gap-3 text-base leading-7 text-[color:var(--foreground)]">
			{#each entry.excerpts as excerpt}
				<p>
					{#if excerpt.title}
						<span class="font-medium">{titleCase(excerpt.title)}. </span>
					{/if}
					{excerpt.body}
				</p>
			{/each}
		</div>
	</section>
{/if}
