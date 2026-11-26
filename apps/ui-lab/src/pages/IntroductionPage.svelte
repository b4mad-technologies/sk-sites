<script lang="ts">
	import DocPage from "../docs/DocPage.svelte";
	import { href } from "../docs/router.svelte";
</script>

<DocPage
	title="Introduction"
	description="Spellkave UI is the shared Svelte kit for spellkave.com, play, and this lab. Import a primitive, a composition, or a widget — never a one-off copy."
>
	<section class="max-w-[65ch] space-y-4 text-base leading-7 text-[color:var(--foreground)]">
		<h2 id="what-this-is" class="scroll-m-20 [font-family:var(--font-display)] text-2xl font-normal tracking-[-0.02em]">
			What this is
		</h2>
		<p>
			<code class="font-mono text-sm">@spellkave/ui</code> ships the primitives (Button, Dialog, Field, …),
			theme tokens, and woven ornaments.
			<code class="font-mono text-sm">@spellkave/ui/composition</code> ships Product Masthead, Narrative Hero, and Journey Band.
			<code class="font-mono text-sm">@spellkave/ui-widgets</code> ships Play tiles, Maps inspect, and Docs catalogue cards.
		</p>
		<h2 id="component-layers" class="scroll-m-20 [font-family:var(--font-display)] text-2xl font-normal tracking-[-0.02em]">
			Follow the component layers
		</h2>
		<p>
			A presentation component accepts display values and snippets. A domain widget accepts
			a typed view model and adapts it to those building blocks. The application owns data
			loading, authorization and actions. Strings and structured objects serve different
			boundaries; a widget object is not necessarily a raw server record.
		</p>
		<p>
			Start with <a href={href("/components/reference-card")}>ReferenceCard</a>:
			<a href={href("/docs/entry-compact")}>EntryCompact</a> adapts catalogue data,
			<a href={href("/maps/hover-card")}>HoverCard</a> supplies map popup content, and
			<a href={href("/components/popover")}>Popover</a> owns floating-window behavior.
			The ReferenceCard contract also identifies the Website and Play integrations.
			These pages are the first documented family, not a complete dependency inventory.
		</p>
		<h2 id="import" class="scroll-m-20 [font-family:var(--font-display)] text-2xl font-normal tracking-[-0.02em]">
			How to import
		</h2>
		<pre class="overflow-x-auto border border-[color:var(--border)] bg-[color:var(--muted-surface)] p-4 text-sm leading-6"><code>{`import { Button } from "@spellkave/ui";
import { ProductMasthead } from "@spellkave/ui/composition";
import { Inspect, Scene } from "@spellkave/ui-widgets";
import { EntryCompact } from "@spellkave/ui-widgets/catalogue";
import { initTheme, ThemeSwitcher } from "@spellkave/ui/theme";`}</code></pre>
		<p>
			Call <code class="font-mono text-sm">initTheme()</code> once at app start. Switch worlds with
			<code class="font-mono text-sm">ThemeSwitcher</code> — never hard-code theme ids; they are about to change.
		</p>
	</section>
</DocPage>
