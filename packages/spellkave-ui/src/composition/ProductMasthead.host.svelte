<script lang="ts">
	import ProductMasthead from "./ProductMasthead.svelte";

	let {
		worldName = "The Woven Marches",
		onSignOut = () => {},
	}: {
		worldName?: string;
		onSignOut?: () => void;
	} = $props();
</script>

<ProductMasthead
	brand="Spellkave"
	brandHref="https://spellkave.com"
	navigation={[{ label: "Map", href: "/map" }]}
	signInHref={null}
	account={{ displayName: "Renn" }}
	{onSignOut}
>
	{#snippet contextSnippet()}
		<p>{worldName}</p>
	{/snippet}
</ProductMasthead>
