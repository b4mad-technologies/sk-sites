<script lang="ts">
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";
	import Glyph from "./Glyph.svelte";
	import type { PlayDensity } from "./types";

	/**
	 * The one frame every play widget sits in. Material comes from the theme
	 * tokens: a double primary rule on top (stitch, ink rule, or brass seam),
	 * a hairline border, the card ground. `tone="paper"` is the reading sheet
	 * (speech, notes) and uses the theme-invariant paper pair.
	 *
	 * `density="strip"` collapses the frame to one 32 px row (glyph, title,
	 * one datum) and swallows `children` — a widget's strip body is always
	 * this row, so no widget computes its own strip markup. `titleTone`
	 * keeps the display serif only for a title that IS a world name (place,
	 * speaker, hero); every other widget title is a label.
	 *
	 * `chrome="bare"` (additive, default `"frame"`) drops the widget's own
	 * border, padding and card ground, and the generic title/meta header
	 * row — a mosaic tile draws its own border and head, and a widget's
	 * head duplicated it (nested frames, sk-jay0.1.8.5 finding 1). A widget
	 * whose title carries a world name the tile head does not repeat (a
	 * hero, speaker or place name) renders that name itself, inline, when
	 * bare; see Hero/Scene/Speech/Combat.
	 */
	let {
		slot,
		title,
		titleId,
		meta,
		tone = "card",
		density = "card",
		titleTone = "label",
		chrome = "frame",
		glyph,
		datum,
		children,
		class: className,
		...restProps
	}: {
		slot: string;
		title: string;
		titleId: string;
		meta?: string;
		tone?: "card" | "paper";
		density?: PlayDensity;
		titleTone?: "label" | "world";
		chrome?: "frame" | "bare";
		/** Glyph name shown at strip density. */
		glyph?: string;
		/** The one datum shown at strip density. */
		datum?: string;
		children: Snippet;
		class?: string;
	} & Omit<HTMLAttributes<HTMLElement>, "title"> = $props();
</script>

{#if chrome === "bare"}
	<!-- A bare frame owns no visible heading: its host tile does. This named
	     group keeps that content legible to assistive tech without introducing
	     a duplicate landmark inside the host tile. -->
	<!-- The visual frame is not a landmark or an interactive grouping. Its
	     supplied heading names the contained content; adding a label here would
	     duplicate that name in the accessibility tree. -->
	<div data-slot={slot} data-density={density} class={className} {...restProps}>
		{@render children()}
	</div>
{:else}
	<section
		data-slot={slot}
		data-play-frame={tone}
		data-density={density}
		aria-labelledby={titleId}
		class={className}
		{...restProps}
	>
		{#if density === "strip"}
			<div class="sk-play-strip">
				{#if glyph}
					<Glyph name={glyph} class="size-4 shrink-0 opacity-80" />
				{/if}
				<h3 id={titleId} class="sk-label sk-play-strip__title m-0 min-w-0 flex-1 truncate">
					{title}
				</h3>
				{#if datum}
					<span class="sk-num sk-play-muted shrink-0 text-xs">{datum}</span>
				{/if}
			</div>
		{:else}
			<header class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
				<h3 id={titleId} class={titleTone === "world" ? "sk-display m-0 text-2xl" : "sk-label m-0"}>
					{title}
				</h3>
				{#if meta}
					<span class="sk-label sk-play-muted">{meta}</span>
				{/if}
			</header>
			{@render children()}
		{/if}
	</section>
{/if}

<style>
	:global([data-play-frame]) {
		position: relative;
		padding: 1.1rem 1.4rem 1.4rem;
		border: 1px solid var(--border);
		border-top: 3px double var(--primary);
		border-radius: var(--radius);
		color: var(--card-foreground);
		background-color: var(--card);
		font-size: 0.8125rem;
	}

	/* Strip is one 32 px glance row: the frame itself shrinks to fit it. */
	:global([data-play-frame][data-density="strip"]) {
		padding: 0 0.1rem;
		border-top-width: 1px;
	}

	:global([data-play-frame="paper"]) {
		border-color: color-mix(in srgb, var(--paper-ink) 35%, transparent);
		color: var(--paper-ink);
		background-color: var(--paper);
		background-image: var(--paper-image);
		background-size: var(--paper-size);
	}

	:global(.sk-play-strip) {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		height: 2rem;
	}

	:global(.sk-play-strip__title) {
		font-size: 0.75rem;
	}

	/* A bare widget (chrome="bare") keeps every one of these utility classes:
	 * a mosaic tile already supplies the ink/ground, the widget only supplies
	 * its content. Scoped to `[data-slot^="play-"]`, present on both the
	 * framed `<section>` and bare named-group roots, rather than `[data-play-frame]`
	 * alone (bare carries no such attribute — that is the point of it). */

	/* A long authored label (a featured action, an exit direction) must not
	 * force its own container open or overflow it — the button wraps
	 * instead. `min-width: 0` lets the widget's own root shrink below its
	 * content's natural width in the first place (a flex/grid item's
	 * default is `min-width: auto`, which blocks wrap from having any
	 * effect at all); `overflow-wrap: anywhere` is the fallback for a
	 * single unbreakable run of text. Lives here, not in a host app's own
	 * stylesheet, because this component is source-consumed (`package.json`
	 * `exports` point at `./src/index.ts`) — every consumer's own Vite
	 * build compiles this `<style>` block itself, so the rule reaches
	 * apps/play's mosaic tiles, apps/ui-lab's demo gallery grid, and any
	 * future host alike, with no per-app CSS to remember. Moved here from a
	 * `.mosaic`-scoped rule in `apps/play/src/styles.css` (sk-jay0.1.8.16
	 * follow-up): that scope only ever reached apps/play's own shell, so
	 * apps/ui-lab's Actions/Scene gallery pages — same widgets, a plain CSS
	 * grid, no `.mosaic` ancestor — rendered the same long labels
	 * unwrapped and overflowing their cards. */
	:global([data-slot^="play-"]) {
		min-width: 0;
		overflow-wrap: anywhere;
	}

	:global([data-slot^="play-"] button),
	:global([data-slot^="play-"] a[role="button"]) {
		height: auto;
		white-space: normal;
		text-align: left;
	}

	/* Secondary text inside a frame follows the frame's own ink, so it stays
	 * legible on paper inside a dark theme and on card inside a light one. */
	:global([data-slot^="play-"] .sk-play-muted) {
		color: color-mix(in srgb, currentColor 68%, transparent);
	}

	:global([data-slot^="play-"] .sk-play-prose) {
		max-width: 60ch;
		margin: 0.6rem 0 0;
		font-family: var(--font-display);
		font-size: 1.05rem;
		line-height: 1.5;
	}

	/* A small paper-toned quote, lighter than the full `tone="paper"` frame
	 * (no double top rule): the "line on paper" a bare Speech/explore scene
	 * still needs without a second nested frame competing with the tile's own
	 * border (finding 1). */
	:global(.sk-play-quote) {
		padding: 0.6rem 0.85rem;
		border: 1px solid color-mix(in srgb, var(--paper-ink) 30%, transparent);
		border-radius: var(--radius);
		color: var(--paper-ink);
		background-color: var(--paper);
		background-image: var(--paper-image);
		background-size: var(--paper-size);
	}

	:global([data-slot^="play-"] .sk-play-row) {
		position: relative;
		isolation: isolate;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		min-height: 2rem;
		padding: 0.375rem 0.75rem;
		border: 0;
		color: inherit;
		background: transparent;
		text-align: left;
		cursor: pointer;
		transition: background-color 140ms ease-out, color 140ms ease-out;
	}

	/* Visual row is 32 px; the pseudo-element keeps a 44 px hit band, the
	 * same pattern as @spellkave/ui's `sm` Button size. */
	:global([data-slot^="play-"] .sk-play-row::after) {
		content: "";
		position: absolute;
		inset-inline: 0;
		top: 50%;
		height: 2.75rem;
		transform: translateY(-50%);
	}

	:global([data-slot^="play-"] .sk-play-row:hover) {
		background-color: color-mix(in srgb, currentColor 8%, transparent);
	}

	:global([data-slot^="play-"] .sk-play-row:focus-visible) {
		outline: 2px solid var(--ring);
		outline-offset: -2px;
	}

	:global([data-slot^="play-"] .sk-play-row[aria-pressed="true"]) {
		color: var(--primary);
		background-color: color-mix(in srgb, var(--primary) 12%, transparent);
	}

	:global([data-slot^="play-"] .sk-play-list) {
		margin: 1rem 0 0;
		padding: 0;
		list-style: none;
		border-top: 1px solid color-mix(in srgb, currentColor 22%, transparent);
	}

	:global([data-slot^="play-"] .sk-play-list > li) {
		border-bottom: 1px solid color-mix(in srgb, currentColor 22%, transparent);
	}

	@media (prefers-reduced-motion: reduce) {
		:global([data-slot^="play-"] .sk-play-row) {
			transition: none;
		}
	}
</style>
