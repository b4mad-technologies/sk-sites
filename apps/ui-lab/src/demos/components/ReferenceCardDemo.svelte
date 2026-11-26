<script lang="ts">
	import { characterArt } from "../sample-art";
	import { ReferenceCard } from "@spellkave/ui";
	import { href } from "../../docs/router.svelte";

	const portrait = characterArt[0];
</script>

<div class="grid w-full gap-8">
	<section aria-label="With existing artwork">
		<p class="sk-label mb-3">With existing artwork</p>
		<ReferenceCard label="Illustrative character" title={portrait?.name ?? "Traveller"}
			art={portrait ? { href: portrait.url, alt: portrait.name } : undefined}
			href={href("/foundations/world-art")}
			facts={[{ label: "Image source", value: "Local sample art" }]}>
			<p>An illustrative card using a bundled image. No world connection or new art is needed.</p>
		</ReferenceCard>
	</section>
	<section aria-label="Text and linked facts">
		<p class="sk-label mb-3">Text and linked facts</p>
		<ReferenceCard label="Reading aid" title="Reference guide"
			facts={[{ label: "Adapter", value: "EntryCompact", href: href("/docs/entry-compact") }]}>
			<p>The body is a snippet. The caller chooses whether it contains plain text or richer markup.</p>
		</ReferenceCard>
	</section>
	<section aria-label="Minimal card">
		<p class="sk-label mb-3">No image, facts, body, or destination</p>
		<ReferenceCard label="Reference" title="A title is enough" />
	</section>
</div>
