<script lang="ts">
	import Popover from "../popover/Popover.svelte";
	import type { DockStatusState } from "./types";

	let { tick, state: statusState = "running", runningText, connection = "Connected", action = "No action sent." }: {
		tick: number | null;
		state?: DockStatusState;
		runningText?: string;
		connection?: string;
		action?: string;
	} = $props();
	const label = $derived(statusState === "running"
		? runningText ?? (tick === null ? "No tick received" : String(tick))
		: statusState === "waiting" ? "Waiting" : statusState === "reconnecting" ? "Reconnecting" : "Disconnected");
	let pulsing = $state(false);
	$effect(() => {
		const received = tick;
		pulsing = received !== null;
		const timer = setTimeout(() => { pulsing = false; }, 700);
		return () => clearTimeout(timer);
	});
</script>

{#snippet trigger()}
	{#key tick}<span class="dock-status__mark" class:pulse={statusState === "running" && pulsing} aria-hidden="true"></span>{/key}
	<span>{label}</span>
{/snippet}

<span class="dock-status" data-status={statusState} data-testid="world-tick">
	<Popover inline {trigger} triggerAriaLabel={`Game status: ${label}`} triggerClass="dock-status-trigger" accessibleLabel="Game status" onTriggerKeydown={(event) => { if (event.key === "Enter" || event.key === " ") event.stopPropagation(); }}>
		<dl class="dock-status__details">
			<dt>Connection</dt><dd>{connection}</dd>
			<dt>Action</dt><dd>{action}</dd>
			<dt>World tick</dt><dd>{tick === null ? "No tick received" : tick}</dd>
		</dl>
	</Popover>
</span>

<style>
	.dock-status { --status-color: var(--accent); }
	.dock-status[data-status="waiting"] { --status-color: var(--status-waiting); }
	.dock-status[data-status="reconnecting"] { --status-color: var(--status-reconnecting); }
	.dock-status[data-status="disconnected"] { --status-color: var(--destructive); }
	:global(.reference-trigger.dock-status-trigger) { position: relative; display: inline-flex; align-items: center; gap: 0.5rem; min-block-size: 1.5rem; padding: 0 0.25rem; text-decoration: none; color: var(--foreground); font: 600 0.75rem/1.3 var(--font-body, sans-serif); font-variant-numeric: tabular-nums; white-space: nowrap; }
	:global(.dock-status-trigger)::after { content: ""; position: absolute; block-size: 2.75rem; inline-size: 100%; inset-inline-start: 0; inset-block-start: 50%; transform: translateY(-50%); }
	.dock-status__mark { display: block; flex-shrink: 0; inline-size: 0.5rem; block-size: 0.5rem; box-sizing: border-box; border: 2px solid var(--status-color); border-radius: 50%; background: var(--status-color); }
	.pulse { animation: dock-tick-pulse 700ms ease-out; }
	[data-status="waiting"] .dock-status__mark { animation: dock-status-breathe 1.2s ease-in-out infinite; }
	[data-status="reconnecting"] .dock-status__mark { background: transparent; animation: dock-status-breathe 1.8s ease-in-out infinite; }
	[data-status="disconnected"] .dock-status__mark { border-radius: 0; }
	.dock-status__details { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 0.5rem 1rem; margin: 0; font-family: var(--font-body, sans-serif); }
	dt { color: var(--muted-foreground); }
	dd { margin: 0; overflow-wrap: anywhere; }
	@keyframes dock-status-breathe { 50% { opacity: 0.3; } }
	@keyframes dock-tick-pulse { from { opacity: 1; transform: scale(1.5); } to { opacity: 0.5; transform: scale(1); } }
	@media (prefers-reduced-motion: reduce) { .dock-status__mark { animation: none; } }
</style>
