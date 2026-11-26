<script lang="ts">
	import { Progress } from "@spellkave/ui";
	import FieldDetail from "./FieldDetail.svelte";
	import type { ActivityStatusProps } from "./types";

	/** Display-only activity status. The caller supplies phase and estimates;
	 * the widget never infers completion, blocks interaction or creates actions. */
	let { label, phase, description, progress = null, fields = [], notice }: ActivityStatusProps = $props();
</script>

<section data-slot="activity-status" aria-label={label} class="grid gap-1 min-w-0">
	<FieldDetail {label} value={phase} description={description ?? undefined} metadata={fields}>
		<span class="break-words">{label}: {phase}</span>
	</FieldDetail>
	{#if progress !== null}
		<Progress value={progress} label="Estimated world-time progress" />
	{/if}
	{#if notice}<p role="status">{notice}</p>{/if}
</section>
