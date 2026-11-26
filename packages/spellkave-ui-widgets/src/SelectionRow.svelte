<script lang="ts">
	import { ActionMenu, DockBarAction } from "@spellkave/ui";
	import type { SelectionRowProps, SelectionRowSubject } from "./types";

	/**
	 * The Table's one live selection row (bead sk-jay0.1.8.63.13, design doc
	 * §5/§9/§10): "you selected …", the same name + actions shape the shared
	 * stream already uses, never a second scene. It is presentation only —
	 * every action id it hands back to `onAct` is dispatched by the host
	 * through the existing `act`/`move` paths; this widget owns no world
	 * read of its own.
	 *
	 * Primary actions render as key-pilled buttons (`DockBarAction`, reused
	 * standalone — it needs no `DockBar`/Menubar ancestor), numbered 1..n
	 * ACROSS the whole row, not per subject: several subjects on one cell
	 * share one running count, so the digits a player sees always match a
	 * single flat list. Digit key handling itself lives in the host
	 * (`PlayTable.svelte`) — this widget only exposes `onAct`.
	 */
	let { title, subtitle, subjects, note, pendingActionId = null, disabled = false, onAct, name }: SelectionRowProps = $props();

	const numberedSubjects = $derived.by(() => {
		let next = 1;
		return subjects.map((subject) => {
			const primary = subject.primary.map((action) => ({ action, digit: next++ }));
			return { subject, primary };
		});
	});
</script>

<div class="sk-selection-row" data-slot="selection-row">
	<header class="sk-selection-row-head">
		<span class="sk-selection-row-title">{title}</span>
		{#if subtitle}<span class="sk-selection-row-subtitle">{subtitle}</span>{/if}
	</header>
	<ul class="sk-selection-row-subjects" aria-label="Selected">
		{#each numberedSubjects as { subject, primary } (subject.id)}
			{@const entry = subject}
			<li class="sk-selection-row-subject">
				<span class="sk-selection-row-name">
					{#if name}{@render name(entry as SelectionRowSubject)}{:else}{subject.name}{/if}
				</span>
				{#if primary.length > 0 || subject.more.length > 0}
					<span class="sk-selection-row-actions">
						{#each primary as { action, digit } (action.id)}
							<DockBarAction
								label={action.label}
								accessibleLabel={action.accessibleLabel}
								key={digit}
								disabled={disabled && pendingActionId !== action.id}
								pending={pendingActionId === action.id}
								onclick={() => onAct(action.id)}
							/>
						{/each}
						{#if subject.more.length > 0}
							<ActionMenu label={`More for ${subject.name}`} items={subject.more} onSelect={onAct} />
						{/if}
					</span>
				{/if}
			</li>
		{/each}
	</ul>
	{#if note}<p class="sk-selection-row-note" role="status">{note}</p>{/if}
</div>

<style>
	.sk-selection-row {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.375rem 0.5rem;
		border-top: 1px solid var(--border);
		background-color: var(--card);
		font-size: 0.8125rem;
	}

	.sk-selection-row-head {
		display: flex;
		align-items: baseline;
		gap: 0.4rem;
	}

	.sk-selection-row-title {
		font-weight: 600;
		opacity: 0.7;
	}

	.sk-selection-row-subtitle {
		color: var(--muted-foreground);
		font-size: 0.75rem;
	}

	.sk-selection-row-subjects {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.sk-selection-row-subject {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}

	.sk-selection-row-name {
		font-weight: 500;
	}

	.sk-selection-row-actions {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.3rem;
	}

	.sk-selection-row-note {
		margin: 0;
		color: var(--muted-foreground);
		font-size: 0.75rem;
	}
</style>
