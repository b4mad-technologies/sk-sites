<script lang="ts">
	import { Badge } from "@spellkave/ui";
	import { describeAttachmentAudience } from "./audience-label";
	import type { DocsAttachment } from "./docs-types";
	import RenderedMarkdown from "./RenderedMarkdown.svelte";

	let { attachment, suppressRenderedText = false }: { attachment: DocsAttachment; suppressRenderedText?: boolean } = $props();

	const isSrdText = $derived(attachment.namespace === "srd.text");
	const hasText = $derived(typeof attachment.payload.text === "string");
	const title = $derived(
		isSrdText
			? "SRD reference"
			: hasText
				? "Text attachment"
				: attachment.namespace.endsWith(".art.image")
					? "Image attachment"
					: "Metadata attachment",
	);
	const source = $derived(
		typeof attachment.payload.source === "string"
			? attachment.payload.source
			: attachment.source,
	);
	const license = $derived(
		typeof attachment.payload.license === "string" ? attachment.payload.license : undefined,
	);
	// Every attachment stays visible; a non-public one wears a coloured
	// visibility marker instead of being hidden (sk-jay0.3.5.77). Derived from
	// the namespace's own `metadata_namespaces` registration
	// (project-metadata-docs.ts), never a hard-coded namespace list — a
	// "public" registration ships no `audience` at all, so this marker only
	// ever appears on a non-public one (sk-jay0.3.5.76).
	const audienceMarker = $derived(
		attachment.audience ? describeAttachmentAudience(attachment.audience) : undefined,
	);
</script>

<article
	class={[
		"rounded-[var(--radius)] border p-4",
		isSrdText
			? "border-primary bg-[color:color-mix(in_srgb,var(--primary)_7%,var(--card))]"
			: "border-border bg-card",
	]}
	data-testid={isSrdText ? "srd-text-attachment" : "attachment"}
>
	<header>
		<h3 class="font-display text-lg font-medium">{title}</h3>
		{#if audienceMarker}
			<Badge
				variant={audienceMarker.tier === "warning" ? "destructive" : "secondary"}
				class="mt-1"
				data-testid="attachment-audience"
			>
				{audienceMarker.label} · {audienceMarker.token}
			</Badge>
		{/if}
		<p class="mt-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
			Attachment · {attachment.namespace}
		</p>
		<p class="mt-1 text-xs text-[color:var(--muted-foreground)]">Bundle {attachment.bundle_id}</p>
	</header>
	{#if isSrdText || source || license}
		<dl class="mt-3 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
			<dt class="font-semibold">Source</dt>
			<dd class="min-w-0 break-words">{source ?? "Missing source"}</dd>
			<dt class="font-semibold">License</dt>
			<dd class="min-w-0 break-words">{license ?? "Missing license"}</dd>
		</dl>
	{/if}
	{#if hasText && !suppressRenderedText}
		<div class="mt-4 border-t border-border pt-4">
			<RenderedMarkdown
				value={String(attachment.payload.text)}
				renderedHtml={attachment.rendered_text}
			/>
		</div>
	{/if}
	{#if hasText && suppressRenderedText}
		<p class="mt-3 text-xs text-[color:var(--muted-foreground)]">Text is rendered in the article above.</p>
	{/if}
	<details class="mt-4 border-t border-border pt-3 text-sm">
		<summary class="cursor-pointer font-semibold">Raw payload</summary>
		<pre class="mt-2 overflow-x-auto whitespace-pre-wrap text-xs">{JSON.stringify(attachment.payload, null, 2)}</pre>
	</details>
</article>
