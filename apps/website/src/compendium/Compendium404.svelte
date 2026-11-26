<script lang="ts">
	let {
		message = "This entry is not in the export.",
		homeHref = "/docs",
		homeLabel = "Back to the SRD index",
	}: { message?: string; homeHref?: string; homeLabel?: string } = $props();
</script>

<section class="missing" data-testid="compendium-404">
	<h1 class="sk-title">Not in the catalogue</h1>
	<p>{message}</p>
	<p><a href={homeHref}>{homeLabel}</a></p>
</section>

<style>
	.missing {
		max-width: 40rem;
		padding: 2rem 0 4rem;
	}

	h1 {
		margin: 0 0 0.75rem;
		font-family: var(--font-display);
		font-size: clamp(1.8rem, 4vw, 2.6rem);
		font-weight: 500;
	}

	p {
		color: var(--muted-foreground);
		line-height: 1.6;
	}

	a {
		color: var(--ring);
	}
</style>
