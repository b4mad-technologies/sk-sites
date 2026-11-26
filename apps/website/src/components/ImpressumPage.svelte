<script lang="ts">
	import {
		IMPRESSUM_BUSINESS_NAME_NOTE,
		IMPRESSUM_EMAIL,
		IMPRESSUM_PERSON_NAME,
		IMPRESSUM_PROVIDER_LINES,
		IMPRESSUM_TELEPHONE,
	} from "../lib/impressum";
</script>

<article class="legal-page" aria-labelledby="impressum-title" lang="de">
	<header class="legal-page__masthead">
		<a class="legal-page__wordmark" href="/">Spellkave</a>
		<a class="legal-page__home" href="/">Back to home</a>
	</header>

	<div class="legal-page__body">
		<div class="section-heading">
			<h1 id="impressum-title">Impressum</h1>
		</div>

		<section class="legal-block" aria-labelledby="ddg-heading" data-testid="impressum-provider">
			<h2 id="ddg-heading">Angaben gemäß § 5 DDG</h2>
			<p class="legal-address" data-testid="impressum-address">
				{#each IMPRESSUM_PROVIDER_LINES as line, index (line)}
					{#if index > 0}<br />{/if}{line}
				{/each}
			</p>
			<p class="legal-note" data-testid="impressum-business-note">{IMPRESSUM_BUSINESS_NAME_NOTE}</p>
		</section>

		<section class="legal-block" aria-labelledby="contact-heading" data-testid="impressum-contact">
			<h2 id="contact-heading">Kontakt</h2>
			<p>
				E-Mail:
				<a href={`mailto:${IMPRESSUM_EMAIL}`} data-testid="impressum-email">{IMPRESSUM_EMAIL}</a>
			</p>
			<p data-testid="impressum-telephone">
				Telefon:
				<a href={`tel:${IMPRESSUM_TELEPHONE.replace(/\s+/g, "")}`}>{IMPRESSUM_TELEPHONE}</a>
			</p>
		</section>

		<section
			class="legal-block"
			aria-labelledby="responsible-heading"
			data-testid="impressum-responsible"
		>
			<h2 id="responsible-heading">Verantwortlich i. S. d. § 18 Abs. 2 MStV</h2>
			<p class="legal-address">
				{IMPRESSUM_PERSON_NAME}<br />
				{#each IMPRESSUM_PROVIDER_LINES.slice(2) as line, index (line)}
					{#if index > 0}<br />{/if}{line}
				{/each}
			</p>
		</section>
	</div>
</article>

<style>
	.legal-page {
		display: flex;
		flex-direction: column;
		min-height: 100svh;
	}

	.legal-page__masthead {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1.5rem;
		min-height: 4.5rem;
		padding: 0.75rem clamp(1rem, 4vw, 4.5rem);
		border-bottom: 1px solid var(--border);
		background: #091326;
	}

	.legal-page__wordmark {
		color: var(--primary);
		font-family: var(--font-display);
		font-size: 1.5rem;
		letter-spacing: 0.14em;
		text-decoration: none;
		text-transform: uppercase;
	}

	.legal-page__home {
		color: var(--foreground);
		text-decoration-color: transparent;
		text-underline-offset: 0.35rem;
	}

	.legal-page__home:hover,
	.legal-page__home:focus-visible {
		color: var(--primary);
		text-decoration-color: currentColor;
	}

	.legal-page__body {
		width: min(100% - 2rem, 48rem);
		margin: 0 auto;
		padding: 4.5rem 0 6rem;
	}

	.legal-block {
		margin-top: 2.5rem;
		padding-top: 2rem;
		border-top: 1px solid rgb(142 113 61 / 45%);
	}

	.legal-block h2 {
		margin: 0 0 0.75rem;
		font-family: var(--font-display);
		font-size: clamp(1.5rem, 3vw, 2rem);
		font-weight: 500;
		letter-spacing: -0.02em;
	}

	.legal-block p {
		margin: 0 0 0.75rem;
		color: var(--muted-foreground);
		line-height: 1.65;
	}

	.legal-address {
		color: var(--foreground);
		font-size: 1.05rem;
		line-height: 1.7;
	}

	.legal-note {
		font-size: 0.95rem;
	}

	.legal-block a {
		color: var(--ring);
		overflow-wrap: anywhere;
	}
</style>
