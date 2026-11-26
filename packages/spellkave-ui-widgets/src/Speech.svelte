<script lang="ts">
	import { Button, Input, Textarea } from "@spellkave/ui";
	import PlayFrame from "./PlayFrame.svelte";
	import type { SpeechProps } from "./types";

	let {
		dialog,
		label,
		onChoose,
		onSay,
		busy = false,
		density = "card",
		chrome = "frame",
	}: SpeechProps = $props();

	let nameDraft = $state("");
	let sayDraft = $state("");
	const headingId = $derived(`play-speech-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`);

	function say(): void {
		const text = sayDraft.trim();
		if (text === "" || onSay === undefined) return;
		onSay(text);
		sayDraft = "";
	}

	function sayName(): void {
		const name = nameDraft.trim();
		if (name === "" || onSay === undefined) return;
		// The DM's own protocol for a name draft (parse-to-propose, ADR-0096 D-7).
		onSay(`name=${name}`);
		nameDraft = "";
	}
</script>

<PlayFrame
	slot="play-speech"
	titleId={headingId}
	title={dialog.speaker}
	titleTone="world"
	meta="Speaks"
	tone="paper"
	{density}
	{chrome}
	glyph="speak"
	datum={dialog.speaker}
>
	{#if chrome === "bare"}
		<h3 id={headingId} class="sk-display m-0 text-2xl">{dialog.speaker}</h3>
		<div class="sk-play-quote mt-2">
			{#if density === "stage"}
				<p class="sk-play-prose italic m-0">{dialog.prompt}</p>
			{:else}
				<p class="sk-play-prose italic m-0 line-clamp-2">{dialog.prompt}</p>
			{/if}
		</div>
	{:else if density === "stage"}
		<p class="sk-play-prose italic">{dialog.prompt}</p>
	{:else}
		<p class="sk-play-prose italic mt-2 line-clamp-2">{dialog.prompt}</p>
	{/if}
	{#if dialog.nameField}
		<form
			class="mt-5"
			onsubmit={(event) => {
				event.preventDefault();
				sayName();
			}}
		>
			<label class="sk-label sk-play-muted block" for="{headingId}-name">Name</label>
			<div class="mt-1 flex gap-2">
				<Input
					id="{headingId}-name"
					class="min-w-0 flex-1"
					type="text"
					autocomplete="off"
					bind:value={nameDraft}
				/>
				{#if onSay}
					<Button variant="woven-secondary" size="sm" type="submit" disabled={busy || nameDraft.trim() === ""}>
						Offer name
					</Button>
				{/if}
			</div>
		</form>
	{/if}
	{#if dialog.choices.length > 0}
		<ol
			class="grid gap-2 sm:grid-cols-2"
			class:mt-5={density === "stage"}
			class:mt-3={density === "card"}
			aria-label="Answers from {dialog.speaker}"
		>
			{#each dialog.choices as choice (choice.slot)}
				<li>
					<Button
						variant="woven-secondary"
						size="sm"
						type="button"
						class="w-full justify-start gap-3"
						disabled={busy}
						onclick={onChoose === undefined ? undefined : () => onChoose(choice.slot)}
					>
						<span class="sk-num opacity-70">{choice.slot}.</span>
						{choice.text}
					</Button>
				</li>
			{/each}
		</ol>
	{/if}
	{#if dialog.sayEnabled}
		<form
			class="mt-5"
			onsubmit={(event) => {
				event.preventDefault();
				say();
			}}
		>
			<label class="sk-label sk-play-muted block" for="{headingId}-say">Say (does not commit)</label>
			<Textarea id="{headingId}-say" class="mt-1 min-h-20" bind:value={sayDraft} />
			{#if onSay}
				<div class="mt-2 flex justify-end">
					<Button variant="woven-secondary" size="sm" type="submit" disabled={busy || sayDraft.trim() === ""}>
						Say it
					</Button>
				</div>
			{/if}
		</form>
	{/if}
</PlayFrame>
