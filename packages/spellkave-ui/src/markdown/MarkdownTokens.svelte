<script lang="ts">
	import Self from "./MarkdownTokens.svelte";
	import type { Token } from "./markdown";
	import { safeHref } from "./markdown";

	let { tokens }: { tokens: readonly Token[] } = $props();

	// marked's token union is loose; each branch reads the fields its type has.
	// biome-ignore lint/suspicious/noExplicitAny: marked's Token is a wide union.
	const t = (token: Token) => token as any;
</script>

{#each tokens as token, index (index)}
	{@const k = t(token)}
	{#if token.type === "paragraph"}
		<p>{#if k.tokens}<Self tokens={k.tokens} />{:else}{k.text}{/if}</p>
	{:else if token.type === "heading"}
		<p class="md-heading" data-depth={k.depth}><strong><Self tokens={k.tokens ?? []} /></strong></p>
	{:else if token.type === "code"}
		<pre class="md-code"><code data-lang={k.lang || undefined}>{k.text}</code></pre>
	{:else if token.type === "blockquote"}
		<blockquote><Self tokens={k.tokens ?? []} /></blockquote>
	{:else if token.type === "list"}
		{#if k.ordered}
			<ol start={k.start === "" ? undefined : k.start}>
				{#each k.items as item, i (i)}<li><Self tokens={item.tokens ?? []} /></li>{/each}
			</ol>
		{:else}
			<ul>
				{#each k.items as item, i (i)}
					<li class:md-task={item.task}>
						{#if item.task}<input type="checkbox" checked={item.checked} disabled aria-label={item.checked ? "done" : "open"} />{/if}
						<Self tokens={item.tokens ?? []} />
					</li>
				{/each}
			</ul>
		{/if}
	{:else if token.type === "checkbox"}
		<!-- rendered by its list item -->
	{:else if token.type === "table"}
		<div class="md-table">
			<table>
				<thead><tr>{#each k.header as cell, i (i)}<th><Self tokens={cell.tokens} /></th>{/each}</tr></thead>
				<tbody>
					{#each k.rows as row, r (r)}<tr>{#each row as cell, i (i)}<td><Self tokens={cell.tokens} /></td>{/each}</tr>{/each}
				</tbody>
			</table>
		</div>
	{:else if token.type === "hr"}
		<hr />
	{:else if token.type === "space"}
		<!-- blank line -->
	{:else if token.type === "strong"}
		<strong><Self tokens={k.tokens ?? []} /></strong>
	{:else if token.type === "em"}
		<em><Self tokens={k.tokens ?? []} /></em>
	{:else if token.type === "del"}
		<del><Self tokens={k.tokens ?? []} /></del>
	{:else if token.type === "codespan"}
		<code class="md-inline">{k.text}</code>
	{:else if token.type === "br"}
		<br />
	{:else if token.type === "link"}
		{@const href = safeHref(k.href)}
		{#if href}<a {href} target="_blank" rel="noopener noreferrer"><Self tokens={k.tokens ?? []} /></a>{:else}<Self tokens={k.tokens ?? []} />{/if}
	{:else if token.type === "image"}
		<span>{k.text || k.href}</span>
	{:else if token.type === "text" && k.tokens}
		<Self tokens={k.tokens} />
	{:else}
		<!-- text, escape, html: shown as text -->
		{k.text ?? k.raw}
	{/if}
{/each}
