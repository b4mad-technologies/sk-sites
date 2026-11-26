<script lang="ts">
	import { Textarea } from "@spellkave/ui";

	let bareTextarea = $state("The loft is quiet.");
</script>

<div class="grid w-full max-w-md gap-2">
	<label class="text-xs font-semibold tracking-[0.08em] text-[color:var(--muted-foreground)]" for="lab-bare-textarea">
		Note
	</label>
	<Textarea id="lab-bare-textarea" bind:value={bareTextarea} />
</div>
