<script lang="ts">
	import { Root as Button } from "../button";
	import type { SeatBoardProps } from "./types";

	/**
	 * The person's heroes (ADR-0161 D-6): one row per seat they hold, the hero
	 * this app acts for marked, and a "Switch to" control on every other row.
	 * Presentation only: the caller names the selected seat on every world call
	 * and the module checks the binding; this list is never authority.
	 */
	let {
		seats,
		activeKey = null,
		onSelect,
		title = "Your heroes",
		selectLabel = "Switch to",
		emptyText = "You hold no hero yet.",
		busy = false,
		class: className = "",
	}: SeatBoardProps = $props();
</script>

<section
	class="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-card p-6 {className}"
	aria-busy={busy}
	data-testid="seat-board"
>
	<h2
		class="[font-family:var(--font-display)] text-[1.25rem] font-medium leading-[1.25] tracking-[-0.02em]"
	>
		{title}
	</h2>
	{#if seats.length === 0}
		<p class="max-w-[65ch] text-sm text-muted-foreground">{emptyText}</p>
	{:else}
		<ul class="flex flex-col divide-y divide-border">
			{#each seats as seat (seat.key)}
				{@const active = seat.key === activeKey}
				<li class="flex flex-wrap items-center justify-between gap-3 py-3" data-seat={seat.key}>
					<div class="flex min-w-0 flex-col">
						<span class="font-medium">{seat.hero}</span>
						<span class="text-sm text-muted-foreground"
							>{seat.world}{seat.note ? ` · ${seat.note}` : ""}</span
						>
					</div>
					{#if active}
						<span class="text-sm font-medium text-foreground" aria-current="true">Playing now</span>
					{:else}
						<Button
							variant="woven-secondary"
							size="sm"
							disabled={busy}
							aria-label={`${selectLabel} ${seat.hero} in ${seat.world}`}
							onclick={() => onSelect(seat.key)}
						>
							{selectLabel}
						</Button>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</section>
