<script lang="ts">
	import { Root as Button } from "../button";
	import { Dialog } from "../dialog";
	import type { ConnectorListProps } from "./types";

	/**
	 * Connected AI clients (Claude, Codex, …) that hold an authorization for
	 * this person (ADR-0161 D-7). Signing out keeps them working; this list
	 * disconnects one or all of them. Presentation only: the caller performs
	 * the request and passes back the status line.
	 */
	let {
		connectors,
		onDisconnect,
		busy = false,
		status = null,
		title = "Connected apps",
		class: className = "",
	}: ConnectorListProps = $props();

	let confirmOpen = $state(false);
</script>

<section
	class="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-card p-6 {className}"
	aria-busy={busy}
	data-testid="connector-list"
>
	<h2
		class="[font-family:var(--font-display)] text-[1.25rem] font-medium leading-[1.25] tracking-[-0.02em]"
	>
		{title}
	</h2>
	<p class="max-w-[65ch] text-sm text-muted-foreground">
		AI clients you connected to Spellkave. Signing out does not disconnect them.
	</p>
	{#if connectors.length === 0}
		<p class="text-sm text-muted-foreground">No connected apps.</p>
	{:else}
		<ul class="flex flex-col divide-y divide-border">
			{#each connectors as connector (connector.id)}
				<li class="flex flex-wrap items-center justify-between gap-3 py-3">
					<span class="font-medium">{connector.name}</span>
					<Button
						variant="woven-secondary"
						size="sm"
						disabled={busy}
						aria-label={`Disconnect ${connector.name}`}
						onclick={() => onDisconnect(connector.id)}
					>
						Disconnect
					</Button>
				</li>
			{/each}
		</ul>
		<div>
			<Dialog
				bind:open={confirmOpen}
				title="Disconnect all connected apps?"
				description="Claude, Codex and every other connected app lose access now. You can connect them again later."
				triggerLabel="Disconnect all connectors"
				closeLabel="Keep them"
				disabled={busy}
			>
				<Button
					variant="woven-primary"
					disabled={busy}
					onclick={() => {
						confirmOpen = false;
						onDisconnect(null);
					}}
				>
					Disconnect all
				</Button>
			</Dialog>
		</div>
	{/if}
	{#if status !== null}
		<p class="text-sm text-foreground" role="status">{status}</p>
	{/if}
</section>
