<script lang="ts">
	import { Button, Input } from "@spellkave/ui";
	import Description from "./Description.svelte";
	import Glyph from "./Glyph.svelte";
	import PlayFrame from "./PlayFrame.svelte";
	import type { ActionsProps, OfferedAction } from "./types";

	let {
		actions,
		onAct,
		busy = false,
		title = "What you can do",
		total,
		meta,
		showHeader = true,
		density = "card",
		chrome = "frame",
	}: ActionsProps = $props();

	// One field per speech action, keyed by id: the player answers a specific
	// listener, and one shared box would put the words on whichever button was
	// clicked last.
	let words = $state<Record<string, string>>({});
	const headingId = $derived(`play-actions-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`);
	const count = $derived(total ?? actions.length);
	const countMeta = $derived(meta ?? (count > 0 ? `${count} offered` : undefined));

	function glyphFor(action: OfferedAction): string {
		switch (action.verb) {
			case "speak":
			case "communicate":
				return "speak";
			case "walk":
			case "movement":
				return "walk";
			case "melee":
				return "melee";
			case "claim":
				return "claim";
			default:
				return action.group === "combat" || /attack|strike|melee/i.test(action.label)
					? "melee"
					: "thing";
		}
	}

	function primary(action: OfferedAction): boolean {
		return action.verb === "melee" || action.group === "combat";
	}

	function say(action: OfferedAction): void {
		const text = (words[action.id] ?? "").trim();
		if (text === "" || onAct === undefined) return;
		onAct(action.id, text);
		words = { ...words, [action.id]: "" };
	}
</script>

<PlayFrame
	slot="play-actions"
	titleId={headingId}
	{title}
	meta={countMeta}
	{density}
	{chrome}
	glyph="thing"
	datum="{count} actions"
>
	{#if chrome === "bare" && showHeader}
		<!-- `chrome="bare"` swallows PlayFrame's own header row too — render
		     the same label/count header inline, matching Hero/Scene/Speech/
		     Combat's own bare-mode heading (a mosaic tile already draws the
		     border; the widget only supplies content, sk-jay0.1.8.5 finding 1
		     extended to Actions inside the table tile's fight/talk/explore
		     scene, which still drew its own box). -->
		<header class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
			<h3 id={headingId} class="sk-label m-0">{title}</h3>
			{#if countMeta}
				<span class="sk-label sk-play-muted">{countMeta}</span>
			{/if}
		</header>
	{/if}
	{#if actions.length === 0}
		<p class="sk-play-prose sk-play-muted">Nothing is possible right now.</p>
	{:else}
		<ul
			class="flex flex-wrap gap-2"
			class:mt-4={density === "stage"}
			class:mt-2={density === "card"}
			aria-label="Offered actions"
		>
			{#each actions as action (action.id)}
				<li class={action.takesWords ? "basis-full" : "min-w-0 max-w-full"}>
					{#if action.takesWords}
						<form
							class="flex flex-wrap items-center gap-2"
							onsubmit={(event) => {
								event.preventDefault();
								say(action);
							}}
						>
							<label class="sr-only" for="{headingId}-{action.id}">{action.label}</label>
							<Input
								id="{headingId}-{action.id}"
								class="min-w-0 flex-1"
								type="text"
								autocomplete="off"
								placeholder={action.target ? `${action.label} — ${action.target}` : action.label}
								value={words[action.id] ?? ""}
								oninput={(event) => {
									words = { ...words, [action.id]: event.currentTarget.value };
								}}
							/>
							<Button
								variant="woven-secondary"
								size="sm"
								type="submit"
								class="gap-2"
								disabled={busy || (words[action.id] ?? "").trim() === ""}
							>
								<Glyph name="speak" class="size-4 opacity-85" />
								Say it
							</Button>
						</form>
					{:else}
						<!-- Button's own base is `whitespace-nowrap shrink-0`: a long
						     featured label ("Unarmed strike: damage — Cellar Rat
						     Swarm") never wrapped and never shrank, overflowing the
						     tile on a phone (sk-jay0.1.8.11 item 3 / sk-jay0.1.8.14
						     task c). `PlayFrame.svelte`'s own `:global([data-slot^=
						     "play-"] …)` rule now wraps it instead (height,
						     white-space, text-align, reaching every consumer, not
						     only apps/play's mosaic, since sk-jay0.1.8.16 task 3).
						     `min-w-[12rem]` is a floor the CSS rule alone does not
						     give it: without one, an inline-flex Button with no
						     explicit width shrinks to its own shrink-to-fit size
						     the instant `white-space: normal` and `overflow-wrap:
						     anywhere` let it — verified in apps/ui-lab's gallery,
						     which packs two long labels in one row, wide enough
						     that neither is forced onto its own line: the button
						     collapsed to icon width and wrapped one WORD per line
						     (clientWidth 65, height 314) instead of a legible
						     multi-word block. `min-w-[12rem]` matches this file's
						     own package's existing floor convention
						     (`@spellkave/ui`'s Field/Select `min-w-[12rem]`); still
						     capped by `max-w-full` so it never forces open a
						     genuinely narrower tile. -->
						<Button
							variant={primary(action) ? "woven-primary" : "woven-secondary"}
							size="sm"
							type="button"
							class="max-w-full min-w-[12rem] shrink basis-auto gap-2"
							disabled={busy}
							onclick={onAct === undefined ? undefined : () => onAct(action.id)}
						>
							<Glyph name={glyphFor(action)} class="size-4 shrink-0 opacity-85" />
							<span class="min-w-0">{action.label}</span>
						</Button>
					{/if}
					<Description text={action.description} label={`About ${action.label}`} valueSlot="play-action-description" />
				</li>
			{/each}
		</ul>
	{/if}
</PlayFrame>
