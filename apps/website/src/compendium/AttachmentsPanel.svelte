<script lang="ts">
	import { attachmentPayloadStringOrDiagnostic } from "./metadata-diagnostics";
	import { PIXELLAB_OUTPUT_RIGHTS_NOTE } from "./pixellab";
	import type { CompendiumArt, CompendiumAttachment } from "./types";

	let {
		attachments,
		art,
	}: {
		attachments: CompendiumAttachment[];
		art: CompendiumArt | null;
	} = $props();

</script>

<section class="panel" data-testid="attachments-panel" aria-labelledby="attachments-heading">
	<h2 id="attachments-heading">Attachments</h2>
	{#if attachments.length === 0}
		<p class="empty">No attachments on this entry.</p>
	{:else}
		<ul>
			{#each attachments as row, i (`${row.namespace}:${row.target_ref}:${i}`)}
				<li>
					{#if row.namespace === "srd.text"}
						<details data-testid="srd-text-attachment">
							<summary>
								<span class="ns">{row.namespace}</span>
								<span class="ref">{row.target_kind} · {row.target_ref}</span>
							</summary>
							<p class="payload-meta">
								License: {attachmentPayloadStringOrDiagnostic(
									row.payload,
									"license",
									"srd.text.payload.license",
								)}
							</p>
							<p class="payload-meta">
								Source: {attachmentPayloadStringOrDiagnostic(
									row.payload,
									"source",
									"srd.text.payload.source",
								)}
							</p>
							<pre class="payload-text">{attachmentPayloadStringOrDiagnostic(
								row.payload,
								"text",
								"srd.text.payload.text",
							)}</pre>
						</details>
					{:else}
						<span class="ns">{row.namespace}</span>
						<span class="ref">{row.target_kind} · {row.target_ref}</span>
						{#if row.namespace.endsWith(".art.image") && art?.license}
							<span class="license">License: {art.license}</span>
						{/if}
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
	{#if art}
		<p class="note">{PIXELLAB_OUTPUT_RIGHTS_NOTE}</p>
	{/if}
</section>

<style>
	.panel {
		margin-top: 2rem;
		padding: 1.25rem 1.5rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--card);
	}

	h2 {
		margin: 0 0 0.75rem;
		font-family: var(--font-display);
		font-size: 1.5rem;
		font-weight: 500;
	}

	ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	li {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		padding: 0.5rem 0;
		border-top: 1px solid var(--border);
		font-size: 1rem;
	}

	.ns {
		color: var(--primary);
		font-family: var(--font-body);
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.08em;
	}

	.ref,
	.license,
	.empty,
	.note,
	.payload-meta {
		color: var(--muted-foreground);
		font-size: 1rem;
	}

	summary {
		cursor: pointer;
		min-height: 44px;
	}

	summary .ns,
	summary .ref {
		display: block;
	}

	.payload-text {
		margin: 0.5rem 0 0;
		padding: 0.65rem 0.75rem;
		overflow: auto;
		max-height: 12rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		color: var(--foreground);
		background: var(--background);
		font-size: 1rem;
		white-space: pre-wrap;
	}

	.note {
		margin: 0.75rem 0 0;
		max-width: 65ch;
	}
</style>
