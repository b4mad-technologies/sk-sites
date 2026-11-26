<script lang="ts">
	/**
	 * A check opened in place, short: what the tool does, the command to run
	 * it yourself, and a row of facts (how many tests, which files, unchecked
	 * places). Everything else is on the check's own page behind `onMore`.
	 */
	import CiCopyCommand from "./CiCopyCommand.svelte";
	import CiFact from "./CiFact.svelte";
	import CiIconGlyph from "./CiIconGlyph.svelte";
	import CiProse from "./CiProse.svelte";
	import type { CiCheckSummaryProps } from "./ci-types";

	let { detail, resolve, onMore, onOpen }: CiCheckSummaryProps = $props();

	const firstSentence = (text: string) => text.split(/(?<=\.)\s/)[0] ?? text;
	const testCount = $derived((detail.testFiles ?? []).reduce((n, f) => n + f.tests.length, 0));
	const fileCount = $derived((detail.testFiles?.length ?? 0) + (detail.moreTestFiles ?? 0));
	const scenarioCount = $derived((detail.features ?? []).reduce((n, f) => n + f.scenarios.length, 0));
	const escapes = $derived(detail.escapes?.sources.length ?? 0);
	const uncommented = $derived((detail.escapes?.sources ?? []).filter((e) => !e.why).length);
	const filesFact = $derived(detail.facts.find((f) => f.label === "files"));
	const checksOn = $derived(detail.facts.find((f) => f.label === "checks on"));
</script>

<div class="flex flex-col gap-2.5 rounded-[var(--radius)] border border-border bg-card p-3" data-slot="ci-check-summary" aria-label={detail.label}>
	<p class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
		<CiIconGlyph name="package" class="size-4 text-muted-foreground" />
		<span class="font-mono">{detail.package}</span>
		{#if detail.open && onOpen}
			<button type="button" class="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline" onclick={() => onOpen?.(detail.open as string)}>package page</button>
		{/if}
	</p>
	{#if detail.toolNote || detail.about}
		<p class="max-w-[72ch] text-sm leading-relaxed">
			{#if detail.toolNote}{firstSentence(detail.toolNote)}{/if}
			{#if detail.about}<span class="text-muted-foreground"> <CiProse text={firstSentence(detail.about.text)} {resolve} /></span>{/if}
		</p>
	{:else}
		<p class="text-sm text-muted-foreground italic">Spire cannot read this tool, and no comment explains the script.</p>
	{/if}
	<CiCopyCommand command={detail.command} resolved={detail.resolved} />
	<div class="flex flex-wrap items-center gap-2">
		{#if detail.testFiles}
			<CiFact icon="check" label="{testCount} tests in {fileCount} files" />
		{/if}
		{#if detail.features}
			<CiFact icon="check" label="{scenarioCount} scenarios in {detail.features.length} features" />
		{/if}
		{#if filesFact}
			<CiFact icon="package" label="files {filesFact.value}" />
		{/if}
		{#if checksOn}
			<CiFact icon="check" label="{checksOn.value.split(', ').length} strict checks on" tone="good" />
		{/if}
		{#if detail.escapes}
			{#if escapes === 0}
				<CiFact icon="check" label="no unchecked places" tone="good" />
			{:else}
				<CiFact
					icon="alert"
					label="{escapes} unchecked place{escapes === 1 ? '' : 's'}{uncommented > 0 ? `, ${uncommented} without why` : ''}"
					tone={uncommented > 0 ? "alert" : "neutral"}
					hint="Places where the compiler takes the code's word: any, as unknown as, !, @ts-expect-error"
				/>
			{/if}
		{/if}
		{#if onMore}
			<button type="button" class="ml-auto text-sm text-primary underline-offset-2 hover:underline" onclick={() => onMore?.()}>all details →</button>
		{/if}
	</div>
</div>
