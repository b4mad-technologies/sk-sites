<script lang="ts">
	import { CLAUDE_CODE_ADD, CODEX_ADD, resolveMcpUrl } from "../lib/connect";
	import CopyField from "./CopyField.svelte";

	let { mcpUrl }: { mcpUrl?: string } = $props();

	const url = $derived(resolveMcpUrl(mcpUrl));
</script>

<section id="connect" class="flex flex-col gap-6">
	<div class="flex flex-col gap-2">
		<h2 class="text-xl font-semibold tracking-tight">Connect an AI</h2>
		<p class="max-w-2xl text-sm text-muted-foreground">
			One MCP URL for every world. Log in with WorkOS AuthKit. First claim a hero at
			<a href="https://play.spellkave.com/">play.spellkave.com</a>, then point Claude, Claude
			Code, Codex, or ChatGPT at the same URL.
		</p>
	</div>

	<div class="flex flex-col gap-5 rounded-xl border border-border bg-card p-5 shadow-sm">
		<CopyField label="Remote MCP server URL" value={url} />

		<details class="group rounded-lg border border-border/70 bg-muted/30 p-3 text-sm" open>
			<summary class="cursor-pointer font-medium select-none">Claude.ai (web / iOS / Android)</summary>
			<ol class="mt-2 list-decimal space-y-2 pl-5 text-muted-foreground">
				<li>
					On the web: <strong>Settings → Connectors → Add custom connector</strong> (opens the
					connector dialog).
				</li>
				<li>
					<strong>Name</strong> — anything you like (e.g. <code class="font-mono">spellkave</code>).
				</li>
				<li>
					<strong>Remote MCP server URL</strong> — paste
					<code class="font-mono">https://mcp.spellkave.com/mcp</code> (same as the field above).
				</li>
				<li>
					<strong>Authentication</strong> — leave <strong>Always required</strong> (Claude usually
					pre-selects this as Detected).
				</li>
				<li>
					<strong>OAuth client</strong> — choose
					<strong>Use Anthropic's hosted client metadata</strong> (Recommended / Detected). Our
					server supports CIMD; DCR also works, but you do not need a custom client id.
				</li>
				<li>Leave additional headers empty. Confirm / Add.</li>
				<li>
					When Claude opens WorkOS AuthKit, sign in with
					<strong>the same account you used on this website</strong>. A different WorkOS login is a
					different player and will not see the hero you claimed here.
				</li>
				<li>
					The connector syncs to Claude iOS/Android. In a chat, enable it and try
					<em>“Where am I?”</em> (or ask Claude to orient itself).
				</li>
			</ol>
		</details>

		<details class="group rounded-lg border border-border/70 bg-muted/30 p-3 text-sm">
			<summary class="cursor-pointer font-medium select-none">Claude Code</summary>
			<pre class="mt-2 overflow-x-auto rounded-md bg-background p-3 font-mono text-xs leading-relaxed">{CLAUDE_CODE_ADD}</pre>
			<p class="mt-2 text-muted-foreground">
				Claude Code opens WorkOS in the browser. There is no Spellkave password.
			</p>
		</details>

		<details class="group rounded-lg border border-border/70 bg-muted/30 p-3 text-sm">
			<summary class="cursor-pointer font-medium select-none">Codex</summary>
			<pre class="mt-2 overflow-x-auto rounded-md bg-background p-3 font-mono text-xs leading-relaxed">{CODEX_ADD}</pre>
			<p class="mt-2 text-muted-foreground">
				Complete the same WorkOS login. Do not paste a bearer token into a chat or a shell
				history.
			</p>
		</details>

		<details class="group rounded-lg border border-border/70 bg-muted/30 p-3 text-sm">
			<summary class="cursor-pointer font-medium select-none">ChatGPT</summary>
			<p class="mt-2 text-muted-foreground">
				If your ChatGPT account has <strong>Developer Mode</strong> (availability depends on the
				plan — not every account has it), add a custom MCP connector with the URL above and sign
				in with WorkOS. If Developer Mode is missing, use Claude.ai or Claude Code instead.
			</p>
		</details>

		<details class="group rounded-lg border border-border/70 bg-muted/30 p-3 text-sm">
			<summary class="cursor-pointer font-medium select-none">Troubleshooting</summary>
			<ul class="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
				<li>
					<strong>401</strong> or “no seat”: sign in, then claim a hero at
					<a href="https://play.spellkave.com/">play.spellkave.com</a>. The gateway has no
					picker.
				</li>
				<li>Login is <strong>WorkOS AuthKit</strong>, never a Spellkave username or password.</li>
				<li>There is only one MCP URL. Tailscale Funnel hosts are retired (ADR-0102 D-6).</li>
			</ul>
		</details>
	</div>
</section>
