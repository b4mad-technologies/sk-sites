<script lang="ts">
	import { Button, wovenWorldHeroUrl } from "@spellkave/ui";
	import Glyph from "../landings/Glyph.svelte";

	/**
	 * The curated example: one choice at the Guarded Bridge, read three ways.
	 * A reading band on the theme's paper material with the woven scene as a
	 * plate and a ruled column beside it. No raster ornaments; rules, glyphs and
	 * the theme's own type carry the structure.
	 */
	let { signInHref = "/auth/login" }: { signInHref?: string } = $props();

	const reads = [
		{
			glyph: "world",
			title: "Place",
			body: "The bridge joins the market to the eastern road. Closing it changes who can travel.",
		},
		{
			glyph: "people",
			title: "Inhabitants",
			body: "A cautious guard, waiting traders, and nearby residents all have something at stake.",
		},
	];

	const thread = [
		{ label: "See", body: "A spear blocks the road." },
		{ label: "Choose", body: "Safe passage is offered." },
		{ label: "Remember", body: "The road opens, and the agreement remains part of the world." },
	];
</script>

<section id="watch" class="curated" aria-labelledby="curated-world-title">
	<header class="curated__head">
		<h2 id="curated-world-title" class="sk-display">Watch one choice become history</h2>
		<p>
			The Guarded Bridge is a guided example, not a live player world. Follow the place, the
			people, and the consequence without reading technical logs.
		</p>
		<p class="curated__mark sk-label">Illustrative example</p>
	</header>

	<div class="curated__body">
		<figure class="curated__scene">
			<img
				src={wovenWorldHeroUrl}
				alt="A woven settlement centered on a guarded stone bridge and branching roads"
			/>
			<figcaption>
				<span class="sk-display">The Guarded Bridge</span>
				<span>Market road · river crossing · eastern shrine</span>
			</figcaption>
		</figure>

		<div class="curated__reads">
			{#each reads as read}
				<section class="curated__read" aria-labelledby="curated-{read.title}">
					<span class="curated__glyph" aria-hidden="true"><Glyph name={read.glyph} /></span>
					<h3 id="curated-{read.title}" class="sk-display">{read.title}</h3>
					<p>{read.body}</p>
				</section>
			{/each}
			<section class="curated__read curated__read--thread" aria-labelledby="curated-Chronicle">
				<span class="curated__glyph" aria-hidden="true"><Glyph name="time" /></span>
				<h3 id="curated-Chronicle" class="sk-display">Chronicle</h3>
				<ol>
					{#each thread as step, index}
						<li>
							<span class="sk-num curated__step">{index + 1}</span>
							<span><span class="sk-label">{step.label}</span> {step.body}</span>
						</li>
					{/each}
				</ol>
			</section>
		</div>
	</div>

	<footer class="curated__foot">
		<p>A real world begins after sign-in, with its own people, places, and unfinished history.</p>
		<Button variant="woven-primary" size="lg" href={signInHref} class="gap-2">
			Enter Spellkave
			<Glyph name="chevron" />
		</Button>
	</footer>
</section>

<style>
	.curated {
		width: min(100% - 2rem, 90rem);
		margin: clamp(3rem, 6vw, 6rem) auto;
		padding: clamp(2rem, 4vw, 4rem) clamp(1.5rem, 4vw, 4rem);
		border-top: 4px double var(--primary);
		border-bottom: 1px solid color-mix(in srgb, var(--paper-ink) 40%, transparent);
		color: var(--paper-ink);
		background-color: var(--paper);
		background-image: var(--paper-image);
		background-size: var(--paper-size);
	}

	.curated__head {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		grid-template-areas:
			"title mark"
			"copy mark";
		column-gap: 2rem;
		align-items: end;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid color-mix(in srgb, var(--paper-ink) 40%, transparent);
	}

	.curated__head h2 {
		grid-area: title;
		max-width: 18ch;
		margin: 0 0 0.75rem;
		font-size: clamp(2.2rem, 4vw, 3.6rem);
	}

	.curated__head > p:not(.curated__mark) {
		grid-area: copy;
		max-width: 60ch;
		margin: 0;
		font-family: var(--font-display);
		font-size: 1.1rem;
		line-height: 1.5;
	}

	.curated__mark {
		grid-area: mark;
		align-self: end;
		margin: 0;
		padding-bottom: 0.25rem;
		border-bottom: 1px solid var(--primary);
		color: var(--primary);
	}

	.curated__body {
		display: grid;
		grid-template-columns: minmax(0, 1.3fr) minmax(18rem, 0.7fr);
		gap: clamp(1.5rem, 4vw, 4rem);
		padding-top: clamp(1.5rem, 3vw, 2.5rem);
	}

	/* The scene is a dark plate; its caption is a paper strip under the plate
	 * so the label reads in every theme. */
	.curated__scene {
		margin: 0;
		border: 1px solid color-mix(in srgb, var(--paper-ink) 45%, transparent);
		background: var(--paper);
	}

	.curated__scene img {
		display: block;
		width: 100%;
		aspect-ratio: 3 / 2;
		object-fit: cover;
		object-position: 62% center;
		background: var(--background);
	}

	.curated__scene figcaption {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem 1rem;
		padding: 0.75rem 1rem;
		border-top: 1px solid color-mix(in srgb, var(--paper-ink) 45%, transparent);
		color: var(--paper-ink);
		background: var(--paper);
	}

	.curated__scene figcaption .sk-display {
		font-size: 1.2rem;
	}

	.curated__scene figcaption span:last-child {
		color: color-mix(in srgb, var(--paper-ink) 65%, transparent);
		font-size: 0.85rem;
	}

	.curated__reads {
		display: flex;
		flex-direction: column;
	}

	.curated__read {
		display: grid;
		grid-template-columns: 2.25rem minmax(0, 1fr);
		grid-template-areas:
			"glyph title"
			". body";
		column-gap: 0.75rem;
		padding: 1.1rem 0;
		border-bottom: 1px solid color-mix(in srgb, var(--paper-ink) 25%, transparent);
	}

	.curated__read:last-child {
		border-bottom: 0;
	}

	.curated__glyph {
		grid-area: glyph;
		display: grid;
		place-items: center;
		width: 2.25rem;
		height: 2.25rem;
		border: 1px solid color-mix(in srgb, var(--paper-ink) 55%, transparent);
		border-radius: 9999px;
		color: var(--primary);
	}

	.curated__read h3 {
		grid-area: title;
		align-self: center;
		margin: 0;
		font-size: 1.35rem;
	}

	.curated__read p,
	.curated__read ol {
		grid-area: body;
		margin: 0.4rem 0 0;
		line-height: 1.5;
	}

	.curated__read ol {
		padding: 0;
		list-style: none;
	}

	.curated__read li {
		display: flex;
		gap: 0.6rem;
		margin-top: 0.4rem;
	}

	.curated__step {
		flex: none;
		color: var(--primary);
	}

	.curated__read li .sk-label {
		margin-right: 0.35rem;
	}

	.curated__foot {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1.5rem;
		margin-top: clamp(1.5rem, 3vw, 2.5rem);
		padding-top: 1.5rem;
		border-top: 1px solid color-mix(in srgb, var(--paper-ink) 40%, transparent);
	}

	.curated__foot p {
		max-width: 52ch;
		margin: 0;
		font-family: var(--font-display);
		font-size: 1.05rem;
		line-height: 1.5;
	}

	@media (max-width: 900px) {
		.curated__head {
			grid-template-columns: 1fr;
			grid-template-areas:
				"title"
				"copy"
				"mark";
		}

		.curated__mark {
			justify-self: start;
			margin-top: 1rem;
		}

		.curated__body {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 520px) {
		.curated {
			width: 100%;
			margin-block: 2rem 0;
			padding-inline: 1.25rem;
		}
	}
</style>
