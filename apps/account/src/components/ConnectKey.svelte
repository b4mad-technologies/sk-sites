<script lang="ts">
	import { Button } from "@spellkave/ui";
	import { CANONICAL_MCP_URL, CLAUDE_CODE_ADD, CODEX_ADD } from "../lib/connect";
	import CopyField from "./CopyField.svelte";

	let open = $state(true);

	const items = [
		{ id: "mcp", label: "Remote MCP server URL", value: CANONICAL_MCP_URL },
		{ id: "claude", label: "Claude Code", value: CLAUDE_CODE_ADD },
		{ id: "codex", label: "Codex", value: CODEX_ADD },
	] as const;
</script>

<section id="connect" class="flex flex-col gap-4" data-testid="how-to-use">
	<div class="flex flex-col gap-2">
		<h2
			class="[font-family:var(--font-display)] text-[1.5rem] font-medium leading-[1.25] tracking-[-0.025em]"
		>
			How to use a key
		</h2>
		<p class="max-w-[65ch] text-sm text-muted-foreground">
			One MCP URL for every world. After you copy a newly created key, paste it as
			<code class="font-mono">Authorization: Bearer</code> — it will never be shown again.
		</p>
	</div>

	<Button
		variant="woven-secondary"
		aria-expanded={open}
		aria-controls="connect-instructions"
		onclick={() => {
			open = !open;
		}}
	>
		{open ? "Hide connect commands" : "Show connect commands"}
	</Button>

	{#if open}
		<div
			id="connect-instructions"
			class="flex flex-col gap-0 rounded-[var(--radius)] border border-border bg-foreground p-8 text-background"
		>
			{#each items as item, index (item.id)}
				<div
					class={[
						"flex flex-col gap-2 py-5",
						index === 0 && "pt-0",
						index === items.length - 1 ? "pb-0" : "border-b border-border",
					]}
				>
					<CopyField label={item.label} value={item.value} tone="paper" />
				</div>
			{/each}
		</div>
	{/if}
</section>
