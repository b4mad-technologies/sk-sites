<script lang="ts">
	import { Button } from "@spellkave/ui";
	import Glyph from "./Glyph.svelte";

	/**
	 * Worlds in Motion landing: the great hall's live world board. Every row is
	 * a world visibly underway. The board here is an illustrative example with
	 * original world names; real worlds appear after sign-in.
	 */
	let {
		signInHref,
		watchHref = "#watch",
	}: { signInHref: string; watchHref?: string } = $props();

	type Row = {
		id: string;
		seal: string;
		name: string;
		status: string;
		time: string;
		date: string;
		consequence: string;
		present: number;
	};

	const rows: Row[] = [
		{
			id: "thornwick",
			seal: "/assets/worlds/board-seal-oak.webp",
			name: "Thornwick Reach",
			status: "Alive",
			time: "16:42",
			date: "8th of Greentide",
			consequence: "The east road opened after Renn vouched for a merchant at the bridge.",
			present: 128,
		},
		{
			id: "eldrim",
			seal: "/assets/worlds/board-seal-mountain.webp",
			name: "Eldrim Wood",
			status: "Alive",
			time: "09:17",
			date: "12th of Deephammer",
			consequence: "A treaty was signed between the yew wardens and the hill clans.",
			present: 96,
		},
		{
			id: "mournbay",
			seal: "/assets/worlds/board-seal-tower.webp",
			name: "Mournbay",
			status: "Alive",
			time: "19:03",
			date: "3rd of Goldvale",
			consequence: "The smugglers' pact broke, and the harbour took note.",
			present: 142,
		},
		{
			id: "hollowmere",
			seal: "/assets/worlds/board-seal-serpent.webp",
			name: "Hollowmere",
			status: "Alive",
			time: "06:58",
			date: "21st of Duskend",
			consequence: "The cellar rats are gone. Mira poured a round for the whole inn.",
			present: 71,
		},
	];

	let openId = $state<string>("mournbay");
</script>

<section class="board" aria-labelledby="board-title">
	<header class="board__masthead">
		<h1 id="board-title" class="sk-display board__headline">The kave where spells never end</h1>
		<p class="board__strap">
			Persistent worlds that keep moving while you are away. People and inhabitants act,
			consequences last, and every world writes its own history.
		</p>
	</header>

	<div id="watch" class="board__plate" role="region" aria-label="Live world board, illustrative example">
		<div class="board__head" aria-hidden="true">
			<span class="sk-label">World</span>
			<span class="sk-label">Status</span>
			<span class="sk-label">Local time</span>
			<span class="sk-label">Latest consequence</span>
			<span class="sk-label board__right">Present</span>
		</div>
		<ul class="board__rows">
			{#each rows as row}
				{@const open = openId === row.id}
				<li class="board__row" class:board__row--open={open}>
					<button
						type="button"
						class="board__cells"
						aria-expanded={open}
						aria-controls="board-detail-{row.id}"
						onclick={() => (openId = open ? "" : row.id)}
					>
						<span class="board__world">
							<img src={row.seal} alt="" width="64" height="64" class="board__seal" />
							<span class="sk-display board__name">{row.name}</span>
						</span>
						<span class="board__status">
							<span class="board__flap sk-label">{row.status}</span>
							<span class="board__sub">the story continues</span>
						</span>
						<span class="board__time">
							<span class="sk-num board__flap">{row.time}</span>
							<span class="board__sub">{row.date}</span>
						</span>
						<span class="board__consequence">{row.consequence}</span>
						<span class="board__present board__right">
							<span class="sk-num board__flap">{row.present}</span>
							<span class="board__sub">now</span>
						</span>
						<span class="board__expand" aria-hidden="true"><Glyph name="expand" /></span>
					</button>
					<div id="board-detail-{row.id}" class="board__detail" hidden={!open}>
						{#if row.id === "mournbay"}
							<img
								src="/assets/worlds/board-amber-town.webp"
								alt="Amber lithograph of a harbour town square at evening, lamps lit, a caravan departing"
								width="1536"
								height="1024"
							/>
						{:else}
							<div class="board__detail-empty" aria-hidden="true"></div>
						{/if}
						<div class="board__detail-copy">
							<p class="sk-label">Right now in {row.name}</p>
							<p>{row.consequence}</p>
							<p class="board__sub">Humans and inhabitants shape this world together. It continues while you are away.</p>
						</div>
					</div>
				</li>
			{/each}
		</ul>
		<p class="board__footnote">
			<span class="sk-label">Illustrative board.</span> Real worlds, times and counts appear after sign-in.
		</p>
	</div>

	<div class="board__actions" role="group" aria-label="Hero actions">
		<Button variant="woven-primary" size="lg" href={signInHref} class="gap-2">
			Enter Spellkave
			<Glyph name="chevron" />
		</Button>
		<Button variant="woven-secondary" size="lg" href={watchHref} class="gap-2">
			<Glyph name="watch" />
			Watch a world
		</Button>
	</div>

	<ol class="board__claims" aria-label="Journey steps">
		<li>
			<span class="board__claim-glyph" aria-hidden="true"><Glyph name="world" /></span>
			<h2 class="sk-display">One world, always on</h2>
			<p>Worlds continue in real time, even while you are away. Events unfold. People act. Consequences last.</p>
		</li>
		<li>
			<span class="board__claim-glyph" aria-hidden="true"><Glyph name="people" /></span>
			<h2 class="sk-display">Inhabitants are part of the world</h2>
			<p>They have goals, memories and relationships. They plan, argue, ally and adapt alongside players.</p>
		</li>
		<li>
			<span class="board__claim-glyph" aria-hidden="true"><Glyph name="time" /></span>
			<h2 class="sk-display">Shared history you can trace</h2>
			<p>Every action leaves a record. Explore what happened, why it mattered, and what it leads to next.</p>
		</li>
	</ol>
</section>

<style>
	.board {
		width: min(100% - 2rem, 90rem);
		margin: 0 auto;
		padding: clamp(2rem, 4vw, 4rem) 0 0;
	}

	.board__masthead {
		display: grid;
		grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
		align-items: end;
		gap: 2rem;
		margin-bottom: clamp(1.5rem, 3vw, 2.5rem);
	}

	.board__headline {
		margin: 0;
		color: var(--primary);
		font-size: clamp(2.6rem, 6.2vw, 6rem);
	}

	.board__strap {
		max-width: 44ch;
		margin: 0 0 0.35em;
		color: var(--muted-foreground);
		font-size: 1.05rem;
		line-height: 1.55;
	}

	/* The plate: blackened enamel with a brass seam. */
	.board__plate {
		position: relative;
		border: 1px solid #0a0b09;
		background-color: var(--card);
		background-image: var(--ground-image);
		background-size: var(--ground-size);
		/* Bezel: the plate sits in a blackened steel frame with a brass hairline
		 * on the inside and a second, wider brass rule outside. */
		outline: 8px solid #121411;
		outline-offset: 0;
		box-shadow:
			inset 0 0 0 1px color-mix(in srgb, var(--primary) 55%, transparent),
			inset 0 1px 0 rgb(255 255 255 / 8%),
			0 0 0 9px color-mix(in srgb, var(--primary) 60%, #0a0b09),
			0 0 0 10px #0a0b09,
			0 2px 0 10px rgb(0 0 0 / 70%),
			0 2rem 4rem 10px rgb(0 0 0 / 55%);
	}

	.board__head,
	.board__cells {
		display: grid;
		grid-template-columns: minmax(14rem, 1.2fr) minmax(7rem, 0.7fr) minmax(8rem, 0.7fr) minmax(0, 2fr) minmax(5rem, 0.5fr) 2.5rem;
		align-items: center;
		column-gap: 1.25rem;
		padding: 0 1.25rem;
	}

	.board__head {
		min-height: 2.75rem;
		border-bottom: 1px solid color-mix(in srgb, var(--primary) 45%, transparent);
		color: color-mix(in srgb, var(--primary) 85%, var(--foreground));
	}

	.board__rows {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.board__row {
		border-bottom: 1px solid var(--border);
	}

	.board__row:last-child {
		border-bottom: 0;
	}

	.board__cells {
		width: 100%;
		min-height: 5.25rem;
		border: 0;
		color: inherit;
		background: transparent;
		text-align: left;
		cursor: pointer;
		transition: background-color 140ms ease-out;
	}

	.board__cells:hover {
		background-color: rgb(255 255 255 / 3%);
	}

	.board__cells:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: -3px;
	}

	.board__row--open .board__cells {
		background-color: rgb(255 255 255 / 4%);
		box-shadow: inset 3px 0 0 var(--primary);
	}

	.board__world {
		display: flex;
		align-items: center;
		gap: 1rem;
		min-width: 0;
	}

	.board__seal {
		width: 3.25rem;
		height: 3.25rem;
		flex: none;
		border-radius: 9999px;
		object-fit: cover;
		box-shadow: 0 2px 0 rgb(0 0 0 / 60%);
	}

	.board__name {
		font-size: 1.35rem;
		color: var(--primary);
	}

	.board__status,
	.board__time,
	.board__present {
		display: grid;
		gap: 0.2rem;
	}

	/* Split-flap character plates: a dark tile with a horizontal seam. */
	/* Split-flap character plates: the theme's outline control material (an
	 * enamel bevel here) with a horizontal seam where the flap folds. */
	.board__flap {
		display: inline-block;
		width: fit-content;
		padding: 0.3rem 0.55rem;
		border: 1px solid var(--control-outline-border);
		border-radius: var(--radius);
		color: var(--primary);
		font-size: 1.05rem;
		background-color: #0b0c0a;
		background-image:
			linear-gradient(180deg, transparent 0 49%, rgb(0 0 0 / 55%) 50% 51%, transparent 52%),
			var(--control-outline-image);
		box-shadow: var(--control-outline-shadow), var(--control-shadow);
	}

	.board__status .board__flap {
		font-size: 0.85rem;
		letter-spacing: 0.18em;
	}

	.board__sub {
		color: var(--muted-foreground);
		font-size: 0.78rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.board__consequence {
		font-size: 1rem;
		line-height: 1.4;
		letter-spacing: 0.02em;
		text-transform: uppercase;
	}

	.board__right {
		text-align: right;
		justify-items: end;
	}

	.board__expand {
		display: grid;
		place-items: center;
		width: 2rem;
		height: 2rem;
		border: 1px solid var(--border);
		border-radius: 9999px;
		color: var(--primary);
		transition: transform 160ms ease-out;
	}

	.board__row--open .board__expand {
		transform: rotate(180deg);
	}

	.board__detail {
		display: grid;
		grid-template-columns: minmax(0, 1.5fr) minmax(16rem, 0.7fr);
		gap: 0;
		border-top: 1px solid var(--border);
		background: #0a0b09;
	}

	.board__detail[hidden] {
		display: none;
	}

	.board__detail img,
	.board__detail-empty {
		display: block;
		width: 100%;
		height: 26rem;
		object-fit: cover;
		object-position: center 40%;
	}

	.board__detail-empty {
		background:
			radial-gradient(60% 80% at 50% 100%, color-mix(in srgb, var(--primary) 18%, transparent), transparent),
			#0a0b09;
	}

	.board__detail-copy {
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 0.75rem;
		padding: clamp(1.25rem, 3vw, 2.5rem);
		border-left: 1px solid var(--border);
		background-color: var(--paper);
		background-image: var(--paper-image);
		background-size: var(--paper-size);
		color: var(--paper-ink);
	}

	.board__detail-copy p {
		margin: 0;
		font-size: 1.05rem;
		line-height: 1.5;
	}

	.board__detail-copy .sk-label {
		color: color-mix(in srgb, var(--paper-ink) 60%, transparent);
	}

	.board__detail-copy .board__sub {
		color: color-mix(in srgb, var(--paper-ink) 65%, transparent);
		text-transform: none;
		font-size: 0.92rem;
	}

	.board__footnote {
		margin: 0;
		padding: 0.75rem 1.25rem;
		border-top: 1px solid color-mix(in srgb, var(--primary) 45%, transparent);
		color: var(--muted-foreground);
		font-size: 0.85rem;
	}

	.board__footnote .sk-label {
		margin-right: 0.5rem;
		color: var(--primary);
	}

	.board__actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 1rem;
		margin-top: clamp(1.5rem, 3vw, 2.5rem);
	}

	.board__claims {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0;
		margin: clamp(3rem, 6vw, 5rem) 0 0;
		padding: 0;
		border-top: 3px double var(--primary);
		list-style: none;
	}

	.board__claims li {
		padding: 1.5rem clamp(1rem, 2.5vw, 2.5rem) 1.5rem 0;
		border-right: 1px solid var(--border);
	}

	.board__claims li + li {
		padding-left: clamp(1rem, 2.5vw, 2.5rem);
	}

	.board__claims li:last-child {
		border-right: 0;
		padding-right: 0;
	}

	.board__claim-glyph {
		display: grid;
		place-items: center;
		width: 2.5rem;
		height: 2.5rem;
		margin-bottom: 1rem;
		border: 1px solid var(--border);
		color: var(--primary);
	}

	.board__claims h2 {
		margin: 0 0 0.5rem;
		font-size: 1.25rem;
	}

	.board__claims p {
		max-width: 36ch;
		margin: 0;
		color: var(--muted-foreground);
		line-height: 1.55;
	}

	@media (max-width: 1100px) {
		.board__masthead {
			grid-template-columns: 1fr;
		}

		.board__head {
			display: none;
		}

		.board__cells {
			grid-template-columns: minmax(0, 1fr) auto 2rem;
			grid-template-areas:
				"world time expand"
				"consequence consequence consequence"
				"status present present";
			row-gap: 0.5rem;
			padding-block: 1rem;
		}

		.board__world { grid-area: world; }
		.board__time { grid-area: time; text-align: right; justify-items: end; }
		.board__consequence { grid-area: consequence; }
		.board__status { grid-area: status; }
		.board__present { grid-area: present; }
		.board__expand { grid-area: expand; }

		.board__detail {
			grid-template-columns: 1fr;
		}

		.board__detail img,
		.board__detail-empty {
			height: 18rem;
		}

		.board__detail-copy {
			border-left: 0;
			border-top: 1px solid var(--border);
		}

		.board__claims {
			grid-template-columns: 1fr;
		}

		.board__claims li,
		.board__claims li + li {
			padding: 1.25rem 0;
			border-right: 0;
			border-bottom: 1px solid var(--border);
		}

		.board__claims li:last-child {
			border-bottom: 0;
		}
	}

	@media (max-width: 640px) {
		.board {
			width: 100%;
		}

		.board__plate {
			border-inline: 0;
		}

		.board__headline,
		.board__strap,
		.board__claims {
			padding-inline: 1.25rem;
		}

		.board__present {
			display: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.board__cells,
		.board__expand {
			transition: none;
		}
	}
</style>
