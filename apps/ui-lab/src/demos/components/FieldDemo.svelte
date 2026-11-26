<script lang="ts">
	import { Field } from "@spellkave/ui";

	let worldSlug = $state("phobos");
	let ownerSub = $state("");
</script>

<div class="grid w-full max-w-md gap-4">
	<Field
		bind:value={worldSlug}
		label="World slug"
		description="A visible label sits above the value. The edge is Deep-Gold Input, not Aged-Gold."
	/>
	<Field
		value="read-only owner"
		label="Disabled owner sub"
		description="Disabled stays visible and in place."
		disabled
	/>
	<Field
		bind:value={ownerSub}
		label="Owner sub"
		description="Error text is the recovery path, not just a terracotta edge."
		error={ownerSub.trim() ? undefined : "Give the world an owner."}
	/>
</div>
