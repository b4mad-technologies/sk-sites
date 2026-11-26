<script lang="ts">
	import { PIXELLAB_OUTPUT_RIGHTS_NOTE } from "../compendium/pixellab";
	import {
		LICENSE_NOTICE,
		SHIPPABLE_CREDITS,
		SRD_5_2_1_CREDIT,
	} from "../lib/attribution";
</script>

<article class="attribution-page" aria-labelledby="attribution-title">
	<header class="attribution-page__masthead">
		<a class="attribution-page__wordmark" href="/">Spellkave</a>
		<a class="attribution-page__home" href="/">Back to home</a>
	</header>

	<div class="attribution-page__body">
		<div class="section-heading">
			<h1 id="attribution-title">Attribution</h1>
			<p>
				Third-party material shipped with Spellkave, credited as required. Original Spellkave
				material is licensed as stated below.
			</p>
		</div>

		<section class="attribution-block" aria-labelledby="first-party-heading">
			<h2 id="first-party-heading">Original Spellkave material</h2>
			<p data-testid="license-notice">{LICENSE_NOTICE}</p>
			<p data-testid="pixellab-note">{PIXELLAB_OUTPUT_RIGHTS_NOTE}</p>
		</section>

		<section class="attribution-block" aria-labelledby="srd-heading">
			<h2 id="srd-heading">System Reference Document 5.2.1</h2>
			<p class="attribution-meta">
				License: Creative Commons Attribution 4.0 International (CC BY 4.0)
			</p>
			<pre
				class="srd-credit"
				data-testid="srd-credit"
			>{SRD_5_2_1_CREDIT}</pre>
			<p class="attribution-note">
				Spellkave is 5E compatible. The SRD credit block above is the only Wizards attribution
				this site carries.
			</p>
		</section>

		{#each SHIPPABLE_CREDITS.filter((row) => row.id !== "srd-5-2-1") as row (row.id)}
			<section class="attribution-block" aria-labelledby={`${row.id}-heading`}>
				<h2 id={`${row.id}-heading`}>{row.title}</h2>
				<p class="attribution-meta">License: {row.license}</p>
				<p data-testid={`credit-${row.id}`}>{row.credit}</p>
				{#if row.url}
					<p>
						<a href={row.url} rel="noreferrer">{row.url}</a>
					</p>
				{/if}
			</section>
		{/each}
	</div>
</article>

<style>
	.attribution-page {
		display: flex;
		flex-direction: column;
		min-height: 100svh;
	}

	.attribution-page__masthead {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1.5rem;
		min-height: 4.5rem;
		padding: 0.75rem clamp(1rem, 4vw, 4.5rem);
		border-bottom: 1px solid var(--border);
		background: #091326;
	}

	.attribution-page__wordmark {
		color: var(--primary);
		font-family: var(--font-display);
		font-size: 1.5rem;
		letter-spacing: 0.14em;
		text-decoration: none;
		text-transform: uppercase;
	}

	.attribution-page__home {
		color: var(--foreground);
		text-decoration-color: transparent;
		text-underline-offset: 0.35rem;
	}

	.attribution-page__home:hover,
	.attribution-page__home:focus-visible {
		color: var(--primary);
		text-decoration-color: currentColor;
	}

	.attribution-page__body {
		width: min(100% - 2rem, 48rem);
		margin: 0 auto;
		padding: 4.5rem 0 6rem;
	}

	.attribution-block {
		margin-top: 2.5rem;
		padding-top: 2rem;
		border-top: 1px solid rgb(142 113 61 / 45%);
	}

	.attribution-block h2 {
		margin: 0 0 0.75rem;
		font-family: var(--font-display);
		font-size: clamp(1.5rem, 3vw, 2rem);
		font-weight: 500;
		letter-spacing: -0.02em;
	}

	.attribution-block p {
		margin: 0 0 0.75rem;
		color: var(--muted-foreground);
		line-height: 1.65;
	}

	.attribution-block p.attribution-meta {
		color: var(--ring);
		font-size: 0.95rem;
	}

	.attribution-note {
		font-size: 0.95rem;
	}

	.srd-credit {
		margin: 0 0 1rem;
		padding: 1rem 1.1rem;
		overflow-x: auto;
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		color: var(--foreground);
		background: var(--card);
		font-family: ui-monospace, "Cascadia Code", "SF Mono", Menlo, monospace;
		font-size: 0.92rem;
		line-height: 1.55;
		white-space: pre-wrap;
	}

	.attribution-block a {
		color: var(--ring);
		overflow-wrap: anywhere;
	}
</style>
