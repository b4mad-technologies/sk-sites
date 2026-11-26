<script lang="ts">
	import { Button } from "@spellkave/ui";
	import Glyph from "./Glyph.svelte";

	/**
	 * The Living Chronicle landing: an open campaign journal. The left page is
	 * today's entry, the right page is the chronicle of how it came to be and a
	 * margin note for the returning player. Everything on the spread is a
	 * clearly labelled illustrative example, never a live world.
	 */
	let {
		signInHref,
		watchHref = "#watch",
	}: { signInHref: string; watchHref?: string } = $props();

	const chronicle = [
		{
			glyph: "before",
			title: "Before",
			body: "A merchant's cart waited at the stonebridge. The guard would not lower his spear for strangers.",
			note: "The road east was closed.",
		},
		{
			glyph: "who",
			title: "Who acted",
			body: "Renn the roadwarden offered the guard safe passage and her own name as surety. Innkeeper Mira vouched for the cart.",
			note: "People and inhabitants both shaped the day.",
		},
		{
			glyph: "changed",
			title: "What changed",
			body: "The spear came down. The cart crossed. The agreement is now part of the bridge's history.",
			note: "Anyone who walks that road inherits it.",
		},
		{
			glyph: "continues",
			title: "What continues",
			body: "Traders talk of the open road. Someone in the hills has noticed the traffic.",
			note: "The world does not wait for you.",
		},
	];
</script>

<section class="chronicle" aria-labelledby="chronicle-title">
	<div class="chronicle__book">
		<article class="chronicle__page chronicle__page--entry" aria-label="Today's entry">
			<h1 id="chronicle-title" class="sk-display chronicle__headline">The road east opened at dawn</h1>
			<p class="chronicle__dateline">
				<span class="sk-label">Today's entry</span>
				<span class="sk-label chronicle__example">Illustrative example</span>
			</p>
			<p class="chronicle__lede">
				In a world that keeps going, one choice at a guarded bridge became part of the
				road itself. Spellkave remembers what you do, and so does everyone who comes after.
			</p>
			<figure class="chronicle__figure">
				<img
					src="/assets/worlds/chronicle-bridge-ink.webp"
					alt="Ink drawing of a guard lowering a spear at a stone bridge while a merchant cart crosses and townspeople watch"
					width="1536"
					height="1024"
				/>
				<figcaption>
					<span class="sk-label">The guarded bridge</span>
					<span>Market road · stonebridge · shrine path</span>
				</figcaption>
			</figure>
			<p class="chronicle__now">
				<strong>Right now:</strong> Mira keeps the bar. Renn walks the east road. In the
				hills, something has taken an interest in the carts.
			</p>
		</article>

		<aside id="watch" class="chronicle__page chronicle__page--record" aria-label="The chronicle">
			<p class="chronicle__running-head">
				<span class="sk-label">The chronicle</span>
				<span class="chronicle__running-note">what led here, and what comes next</span>
			</p>
			<ol class="chronicle__record">
				{#each chronicle as entry}
					<li>
						<span class="chronicle__glyph" aria-hidden="true"><Glyph name={entry.glyph} /></span>
						<div>
							<h2 class="sk-display chronicle__record-title">{entry.title}</h2>
							<p>{entry.body}</p>
							<p class="chronicle__record-note">{entry.note}</p>
						</div>
					</li>
				{/each}
			</ol>
			<div class="chronicle__margin">
				<p class="sk-display chronicle__margin-title">Your story continued while you were away.</p>
				<p>
					Return to a world that remembered you: your name on the bridge, your debts at
					the bar, your friends still where you left them.
				</p>
				<div class="chronicle__actions" role="group" aria-label="Hero actions">
					<Button variant="woven-primary" size="lg" href={signInHref} class="gap-2">
						<Glyph name="enter" />
						Enter Spellkave
					</Button>
					<Button variant="woven-secondary" size="lg" href={watchHref} class="gap-2">
						<Glyph name="watch" />
						Watch a world
					</Button>
				</div>
			</div>
		</aside>
	</div>

	<ol class="chronicle__steps" aria-label="Journey steps">
		<li>
			<img src="/assets/worlds/chronicle-vignette-world.webp" alt="Ink drawing of a hilltop town with a keep above a river" width="480" height="320" />
			<div>
				<h2 class="sk-display">Enter a living world</h2>
				<p>Explore a persistent world already in motion. No fixed path waits for you.</p>
			</div>
		</li>
		<li>
			<img src="/assets/worlds/chronicle-vignette-hero.webp" alt="Ink drawing of a scout, a shield bearer and a robed scholar standing together" width="480" height="320" />
			<div>
				<h2 class="sk-display">Claim your hero</h2>
				<p>Become part of its places, relationships and history.</p>
			</div>
		</li>
		<li>
			<img src="/assets/worlds/chronicle-vignette-bridge.webp" alt="Ink drawing of villagers repairing a stone bridge with timber and rope" width="480" height="320" />
			<div>
				<h2 class="sk-display">Shape what comes next</h2>
				<p>Discover possible actions, attempt your own ideas, and leave changes others inherit.</p>
			</div>
		</li>
	</ol>
</section>

<style>
	.chronicle {
		width: min(100% - 2rem, 90rem);
		margin: 0 auto;
		padding: clamp(1.5rem, 3vw, 3rem) 0 0;
	}

	/* An opened book: a gutter shadow falls into the spine from both pages, the
	 * outer edges lift slightly, and the closed leaves show beneath the block. */
	.chronicle__book {
		position: relative;
		display: grid;
		grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
		border: 1px solid color-mix(in srgb, var(--paper-ink) 45%, transparent);
		background:
			linear-gradient(90deg, transparent calc(53.5% - 1px), color-mix(in srgb, var(--paper-ink) 55%, transparent) calc(53.5% - 1px), color-mix(in srgb, var(--paper-ink) 55%, transparent) 53.5%, transparent 53.5%),
			linear-gradient(90deg, transparent 46%, color-mix(in srgb, var(--paper-ink) 14%, transparent) 53.5%, transparent 61%),
			linear-gradient(90deg, color-mix(in srgb, var(--paper-ink) 6%, transparent), transparent 4%, transparent 96%, color-mix(in srgb, var(--paper-ink) 6%, transparent)),
			var(--paper-image),
			var(--paper);
		background-size: auto, auto, auto, var(--paper-size), auto;
		color: var(--paper-ink);
		box-shadow:
			0 1px 0 color-mix(in srgb, var(--paper-ink) 30%, transparent),
			0 3px 0 -1px var(--paper),
			0 4px 0 -1px color-mix(in srgb, var(--paper-ink) 35%, transparent),
			0 6px 0 -2px var(--paper),
			0 7px 0 -2px color-mix(in srgb, var(--paper-ink) 35%, transparent),
			0 9px 0 -3px var(--paper),
			0 10px 0 -3px color-mix(in srgb, var(--paper-ink) 35%, transparent),
			0 1.5rem 3rem color-mix(in srgb, var(--paper-ink) 22%, transparent);
	}

	/* Page curl at the fore-edges: a soft shadow that darkens toward each corner. */
	.chronicle__book::after {
		content: "";
		position: absolute;
		inset: 0;
		pointer-events: none;
		background:
			radial-gradient(60% 40% at 0% 100%, color-mix(in srgb, var(--paper-ink) 10%, transparent), transparent 70%),
			radial-gradient(60% 40% at 100% 100%, color-mix(in srgb, var(--paper-ink) 10%, transparent), transparent 70%);
	}

	.chronicle__page {
		min-width: 0;
		padding: clamp(1.5rem, 3.5vw, 3.5rem);
	}

	.chronicle__page--entry {
		padding-right: clamp(1.5rem, 4vw, 4rem);
	}

	.chronicle__page--record {
		padding-left: clamp(1.5rem, 4vw, 4rem);
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(12rem, 0.55fr);
		grid-template-rows: auto 1fr;
		column-gap: clamp(1.25rem, 2.5vw, 2.5rem);
	}

	.chronicle__running-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		margin: 0 0 1.5rem;
		padding-bottom: 0.6rem;
		border-bottom: 1px solid color-mix(in srgb, var(--paper-ink) 40%, transparent);
	}

	.chronicle__page--record .chronicle__running-head {
		grid-column: 1 / -1;
	}

	.chronicle__dateline {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		margin: 1rem 0 0;
		padding-top: 0.6rem;
		border-top: 1px solid color-mix(in srgb, var(--paper-ink) 40%, transparent);
	}

	.chronicle__running-note {
		color: color-mix(in srgb, var(--paper-ink) 65%, transparent);
		font-family: var(--font-display);
		font-style: italic;
		font-size: 0.95rem;
	}

	.chronicle__example {
		color: var(--primary);
	}

	.chronicle__headline {
		margin: 0;
		font-size: clamp(2.6rem, 5vw, 4.8rem);
		max-width: 13ch;
	}

	/* The chronicler's rubric: the entry opens on a rust initial. */
	.chronicle__headline::first-letter {
		color: var(--primary);
	}

	.chronicle__lede {
		max-width: 52ch;
		margin: 1.25rem 0 0;
		font-family: var(--font-display);
		font-size: 1.2rem;
		line-height: 1.5;
	}

	.chronicle__figure {
		margin: 1.75rem 0 0;
	}

	.chronicle__figure img {
		display: block;
		width: 100%;
		height: auto;
		mix-blend-mode: multiply;
	}

	.chronicle__figure figcaption {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		margin-top: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px solid color-mix(in srgb, var(--paper-ink) 40%, transparent);
		color: color-mix(in srgb, var(--paper-ink) 70%, transparent);
		font-size: 0.85rem;
	}

	.chronicle__now {
		max-width: 60ch;
		margin: 1.5rem 0 0;
		padding-top: 1rem;
		border-top: 1px solid color-mix(in srgb, var(--paper-ink) 25%, transparent);
		font-family: var(--font-display);
		font-size: 1.05rem;
		line-height: 1.5;
	}

	.chronicle__now strong {
		color: var(--primary);
	}

	.chronicle__record {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.chronicle__record li {
		display: grid;
		grid-template-columns: 2.5rem minmax(0, 1fr);
		gap: 1rem;
		padding: 1.1rem 0;
		border-bottom: 1px solid color-mix(in srgb, var(--paper-ink) 25%, transparent);
	}

	.chronicle__record li:last-child {
		border-bottom: 0;
	}

	.chronicle__glyph {
		display: grid;
		place-items: center;
		width: 2.5rem;
		height: 2.5rem;
		border: 1px solid color-mix(in srgb, var(--paper-ink) 55%, transparent);
		border-radius: 9999px;
		color: var(--primary);
	}

	.chronicle__record-title {
		margin: 0.35rem 0 0.25rem;
		font-size: 1.15rem;
		color: var(--primary);
	}

	.chronicle__record p {
		margin: 0;
		font-size: 0.98rem;
		line-height: 1.5;
	}

	.chronicle__record-note {
		margin-top: 0.25rem !important;
		color: color-mix(in srgb, var(--paper-ink) 65%, transparent);
		font-family: var(--font-display);
		font-style: italic;
	}

	.chronicle__margin {
		align-self: start;
		padding-left: clamp(1rem, 2vw, 2rem);
		border-left: 1px dashed color-mix(in srgb, var(--paper-ink) 40%, transparent);
		text-align: center;
	}

	.chronicle__margin-title {
		margin: 0 0 0.75rem;
		font-size: 1.15rem;
		color: var(--primary);
	}

	.chronicle__margin p {
		margin: 0;
		font-size: 0.95rem;
		line-height: 1.5;
	}

	.chronicle__actions {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-top: 1.5rem;
	}

	.chronicle__steps {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: clamp(1.5rem, 3vw, 3rem);
		margin: clamp(3rem, 6vw, 5rem) 0 0;
		padding: 0;
		list-style: none;
	}

	.chronicle__steps li {
		display: grid;
		grid-template-rows: auto 1fr;
		gap: 1rem;
		padding-top: 1rem;
		border-top: 3px double var(--primary);
	}

	.chronicle__steps img {
		width: 100%;
		height: 12rem;
		object-fit: contain;
		mix-blend-mode: multiply;
	}

	.chronicle__steps h2 {
		margin: 0 0 0.4rem;
		font-size: 1.4rem;
	}

	.chronicle__steps p {
		max-width: 34ch;
		margin: 0;
		font-family: var(--font-display);
		font-size: 1.05rem;
		line-height: 1.5;
	}

	@media (max-width: 1100px) {
		.chronicle__page--record {
			grid-template-columns: 1fr;
		}

		.chronicle__margin {
			margin-top: 1.5rem;
			padding: 1.5rem 0 0;
			border-left: 0;
			border-top: 1px dashed color-mix(in srgb, var(--paper-ink) 40%, transparent);
		}

		.chronicle__actions {
			flex-direction: row;
			flex-wrap: wrap;
			justify-content: center;
		}
	}

	@media (max-width: 860px) {
		.chronicle {
			width: 100%;
			padding-top: 0;
		}

		.chronicle__book {
			grid-template-columns: 1fr;
			border-inline: 0;
			background-image: var(--paper-image);
			background-size: var(--paper-size);
		}

		.chronicle__page--record {
			border-top: 1px solid color-mix(in srgb, var(--paper-ink) 45%, transparent);
		}

		.chronicle__steps {
			grid-template-columns: 1fr;
			padding-inline: 1.25rem;
		}
	}
</style>
