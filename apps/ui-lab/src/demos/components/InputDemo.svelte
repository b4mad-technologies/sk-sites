<script lang="ts">
	import { Input } from "@spellkave/ui";

	let bareInput = $state("thronwick");
</script>

<div class="grid w-full max-w-md gap-2">
	<label class="text-xs font-semibold tracking-[0.08em] text-[color:var(--muted-foreground)]" for="lab-bare-input">
		Place name
	</label>
	<Input id="lab-bare-input" bind:value={bareInput} placeholder="Place name" />
</div>
