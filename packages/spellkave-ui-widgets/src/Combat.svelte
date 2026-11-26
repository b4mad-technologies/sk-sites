<script lang="ts">
	import { Button } from "@spellkave/ui";
	import Economy from "./Economy.svelte";
	import PlayFrame from "./PlayFrame.svelte";
	import type { CombatProps, CombatRosterEntry, CombatTarget } from "./types";

	/**
	 * The turn bar (`ledger/designs/play-battle-mode.md` §5/§9/§10 row S3,
	 * sk-jay0.1.8.37/.39): a tracker strip, target-first chips and the
	 * selected target's verb row, End turn, and the status line. A tracker
	 * chip that is ALSO a target group (`CombatRosterEntry.targetRef` set)
	 * is one chip, not two — clicking it selects that target instead of
	 * drawing a second "Cellar Rat 1" underneath. Any group with no roster
	 * match (the trailing untargeted group — Dodge, a self-only check) gets
	 * its own standalone chip in a second row. `onAttack`/`onStep` stay on
	 * `CombatProps` for a future map-driven caller but this cut never
	 * renders them.
	 */
	let {
		combat,
		targets = [],
		selectedTargetRef = null,
		onSelectTarget,
		onAct,
		onEndTurn,
		economy = null,
		selectionMode = false,
		busy = false,
		density = "card",
		chrome = "frame",
	}: CombatProps = $props();

	/**
	 * The turn bar's own pip strip (S4, sk-jay0.1.8.40 mount step): only the
	 * channels the world's `self_states kind=economy` read actually
	 * returned. Inside a tactical session the kernel deletes a channel's row
	 * at the turn boundary its `resets_on` names
	 * (`r_advance_turn.rs:339-351`), so the bar typically shows no rows at
	 * the start of a turn and only gains a pip once the player spends that
	 * channel — never an invented "available" pip for an unspent channel
	 * with no row. Absent/empty ⇒ no strip at all, never the standalone
	 * widget's own empty-state line.
	 */
	const hasEconomy = $derived((economy?.length ?? 0) > 0);

	const modeLabel = $derived(
		combat.mode === "your-turn" ? "Your turn" : combat.mode === "waiting" ? "Waiting" : "Strike",
	);
	const roster = $derived(combat.roster ?? []);
	const currentActor = $derived(roster.find((entry) => entry.isCurrent));
	const stripDatum = $derived(
		currentActor === undefined ? modeLabel : currentActor.isMe ? "You" : currentActor.name,
	);

	/** Every target group's own ref, live right now — a roster entry's
	 * `targetRef` only turns its tracker chip into a button when `targets`
	 * actually carries a matching group (a stale `targetRef` from a caller
	 * that forgot to pass `targets` stays a plain, unselectable chip). */
	const liveTargetRefs = $derived(new Set(targets.map((target) => target.targetRef)));

	/** Groups with no roster chip to attach to — rendered as their own
	 * standalone chip below the tracker (the untargeted group, and any
	 * named target this fight offers that is not in `combat.roster`). Always
	 * empty in `selectionMode`: that row belongs to the `SelectionRow` now. */
	const standaloneTargets = $derived(
		selectionMode
			? []
			: targets.filter((target) => !roster.some((entry) => entry.targetRef === target.targetRef)),
	);

	/** `selectionMode` never falls back to the first group: nothing selected
	 * must highlight nothing, since the row it drives can be legitimately
	 * empty (no map/turn-order pick yet). */
	const effectiveSelectedRef = $derived(
		selectionMode
			? selectedTargetRef
			: targets.some((target) => target.targetRef === selectedTargetRef)
				? selectedTargetRef
				: (targets[0]?.targetRef ?? null),
	);

	const selectedTarget = $derived<CombatTarget | undefined>(
		targets.find((target) => target.targetRef === effectiveSelectedRef),
	);

	function selectTarget(targetRef: string): void {
		onSelectTarget?.(targetRef);
	}

	/**
	 * Non-dead condition tokens shown on a tracker chip (S5,
	 * sk-jay0.1.8.41): capped to what a chip can actually hold at the
	 * tighter card density before the rest collapse into a "+n" remainder,
	 * never a silent clip. Stage has more room per chip.
	 */
	const CONDITION_CAP = $derived(density === "card" ? 1 : 2);

	function visibleConditions(entry: CombatRosterEntry): { id: string; label: string }[] {
		return (entry.conditions ?? []).slice(0, CONDITION_CAP);
	}

	function hiddenConditionCount(entry: CombatRosterEntry): number {
		return Math.max(0, (entry.conditions?.length ?? 0) - CONDITION_CAP);
	}

	/**
	 * At card density the tracker/target strip and the verb row scroll
	 * horizontally instead of wrapping (§10 row S1, decided 2026-09-09: a
	 * fixed-height card cannot grow with the roster, and roster size is not
	 * bounded — see the strip's own CSS comment below). This action keeps
	 * whichever chip the strip's own selection currently points at — the
	 * current actor, or the selected target — scrolled into view whenever
	 * that selection changes, so a scrolled-off chip is never silently
	 * missed. `scrollIntoView` is unimplemented in jsdom (no-op guard, not a
	 * jsdom-only branch: a future host without it degrades the same way).
	 * Keyboard focus moving along the chips needs no code here — a native
	 * scroll container already keeps a focused descendant in view.
	 */
	function scrollIntoViewWhenActive(node: HTMLElement, active: boolean) {
		function apply(isActive: boolean): void {
			if (isActive && typeof node.scrollIntoView === "function") {
				node.scrollIntoView({ inline: "nearest", block: "nearest" });
			}
		}
		apply(active);
		return { update: apply };
	}
</script>

{#snippet rosterChipBody(entry: CombatRosterEntry)}
	<!-- Shared between the plain chip and the button-wrapped live-target chip
	     (S3/S5): ordinal, name (struck through when `entry.dead`, with a
	     visually hidden "Dead" word so assistive tech gets the same fact the
	     strike-through gives sighted players — the Occupants widget's own
	     wording, not an invented one), the you/current markers, and the
	     co-located occupant's other disclosed conditions as small glyph+label
	     tokens, capped by `CONDITION_CAP` with a "+n" remainder. -->
	<span class="sk-num opacity-70">{entry.ordinal + 1}</span>
	<span class:sk-play-roster-dead={entry.dead}>{entry.name}</span>
	{#if entry.dead}
		<span class="sr-only">Dead</span>
	{/if}
	{#if entry.isMe}
		<span class="sk-play-roster-you">You</span>
	{/if}
	{#if entry.isCurrent}
		<span class="sk-play-roster-turn" aria-hidden="true">▸</span>
	{/if}
	{#if visibleConditions(entry).length > 0}
		<span class="sk-play-roster-conditions">
			{#each visibleConditions(entry) as condition (condition.id)}
				<span class="sk-play-roster-condition">
					<span aria-hidden="true">●</span>
					{condition.label}
				</span>
			{/each}
			{#if hiddenConditionCount(entry) > 0}
				<span class="sk-play-roster-condition sk-play-roster-condition--more">
					+{hiddenConditionCount(entry)}
				</span>
			{/if}
		</span>
	{/if}
{/snippet}

<PlayFrame
	slot="play-combat"
	titleId="play-combat-heading"
	title={combat.enemy}
	meta={modeLabel}
	data-combat-mode={combat.mode}
	class={combat.mode === "your-turn" ? "sk-play-turn" : undefined}
	{density}
	{chrome}
	glyph="melee"
	datum={stripDatum}
>
	{#if density === "stage"}
		<p class="sk-play-prose sk-play-muted">{combat.status}</p>
	{:else}
		<p class="sk-play-prose sk-play-muted mt-0.5 text-xs line-clamp-1">{combat.status}</p>
	{/if}
	{#if roster.length > 0}
		<!-- The tracker strip: ordinal, the real name (never swapped for "You"
		     — a scrolled-off chip must still say who it is once it scrolls
		     back into view), a separate "you" marker, and a current-actor
		     marker. Stage keeps `flex-wrap` — there is room there for the
		     strip to wrap onto more than one row. Card density scrolls
		     instead (`.sk-play-turnbar-strip`, decided 2026-09-09, §10 row
		     S1): the card's own height is fixed, and roster size is not —
		     wrapping a roster-plus-conditions strip onto a second row blew
		     the fixed card budget (159px measured against a 132px budget,
		     `check:tile-clip`), and no fixed roster size can be assumed.
		     Next-in-order is simply the following chip in this fixed order,
		     never a highlighted prediction. Card density's own top margin is
		     tighter than stage's (`mt-0.5` not `mt-4`): the fixed-height card
		     tile has no spare room once the verb row and the
		     standalone-target/End-turn row (below) both need their own line
		     too (`check:tile-clip`, sk-jay0.1.8.37 task C finding). -->
		<ol
			class="flex gap-1.5"
			class:flex-wrap={density === "stage"}
			class:sk-play-turnbar-strip={density === "card"}
			class:mt-4={density === "stage"}
			class:mt-0.5={density === "card"}
			aria-label="Turn order"
		>
			{#each roster as entry (entry.ordinal)}
				{@const isLiveTarget = entry.targetRef !== undefined && (selectionMode || liveTargetRefs.has(entry.targetRef))}
				<li
					class="sk-play-roster-entry"
					class:sk-play-roster-entry--current={entry.isCurrent}
					class:sk-play-roster-entry--me={entry.isMe}
					class:sk-play-roster-entry--selectable={isLiveTarget}
					class:sk-play-roster-entry--compact={density === "card"}
					aria-current={entry.isCurrent ? "step" : undefined}
					use:scrollIntoViewWhenActive={entry.isCurrent ||
						(isLiveTarget && entry.targetRef === effectiveSelectedRef)}
				>
					{#if isLiveTarget}
						<!-- A roster member that is ALSO a live target (S3): the
						     tracker chip becomes the target chip, selectable —
						     never a second chip drawn with the same name. -->
						<button
							type="button"
							class="sk-play-roster-select"
							aria-pressed={entry.targetRef === effectiveSelectedRef}
							onclick={() => selectTarget(entry.targetRef ?? "")}
						>
							{@render rosterChipBody(entry)}
						</button>
					{:else}
						{@render rosterChipBody(entry)}
					{/if}
				</li>
			{/each}
		</ol>
	{/if}
	{#if !selectionMode && selectedTarget !== undefined && selectedTarget.actions.length > 0}
		<!-- The selected target's own verbs (S3): the cross product of
		     targets × verbs collapses to one row per chip. The target is
		     already the selected chip, so the button shows only the
		     action's own display name (`action.label`, already trimmed of
		     the world's " — <target>" suffix by the caller's `verbName`,
		     play-table.ts) — the full, target-qualified string (e.g.
		     "Melee Attack — Cellar Rat 1") survives as `accessibleLabel`
		     and becomes the button's `aria-label`/`title` instead, so it
		     stays reachable by its unambiguous name. No uppercase
		     transform (`variant="outline"`, the same one End turn uses —
		     the `woven-*` variants carry Button's own `sk-label` class,
		     whose theme tokens uppercase it) and no truncation: the bare
		     display name is short enough to fit without it. Stage keeps
		     `flex-wrap` — a new line for an overflowing row is fine there.
		     Card density scrolls instead (`.sk-play-turnbar-strip`, decided
		     2026-09-09, §10 row S1), the same fixed-height reason the
		     tracker strip above does — a wrapped verb row costs the card a
		     second line it does not have. -->
		<ul
			class="flex gap-2"
			class:flex-wrap={density === "stage"}
			class:sk-play-turnbar-strip={density === "card"}
			class:mt-2={density === "stage"}
			class:mt-0.5={density === "card"}
			aria-label="{selectedTarget.label} actions"
		>
			{#each selectedTarget.actions as action (action.id)}
				<li class={density === "card" ? "shrink-0" : "min-w-0 max-w-full"}>
					<Button
						variant="outline"
						size="sm"
						type="button"
						class={density === "card"
							? "sk-play-turnbar-compact shrink-0 whitespace-nowrap"
							: "max-w-full shrink basis-auto"}
						disabled={busy}
						aria-label={action.accessibleLabel ?? action.label}
						title={action.accessibleLabel ?? action.label}
						onclick={onAct === undefined ? undefined : () => onAct(action.id)}
					>
						{action.label}
					</Button>
				</li>
			{/each}
		</ul>
	{/if}
	{#if density === "stage" && hasEconomy}
		<!-- The action-economy pip strip (S4, sk-jay0.1.8.40 mount step):
		     `chrome="bare"` — Combat's own frame already draws the tile's
		     border and head, a nested frame would duplicate it (finding 1,
		     same reason every other bare mount here goes bare). Stage has
		     room for its own line; card density folds it into the End-turn
		     row below instead (`hasEconomy`'s own comment covers why a
		     fresh turn commonly starts with no rows at all). The wrapping
		     `mt-2` supplies the gap Combat itself owns between rows (see
		     the CSS override below for why `Economy`'s own margin is
		     zeroed once nested here). -->
		<div class="mt-2">
			<Economy channels={economy ?? []} density="stage" chrome="bare" />
		</div>
	{/if}
	<!-- Standalone target chips (the untargeted group — Dodge — and any
	     named target outside `combat.roster`) share their own row with End
	     turn at card density instead of drawing a fourth stacked row: both
	     are small, roster-size-independent controls (unlike the tracker,
	     whose own width already fills most of a 390px tile), so they are
	     the one pair that reliably fits side by side
	     (`check:tile-clip`, sk-jay0.1.8.37 task C finding). Stage keeps them
	     as their own separate row — there is room there, and the tracker
	     already sits well above End turn. -->
	{#if density === "stage" && standaloneTargets.length > 0}
		<ul class="flex flex-wrap gap-1.5 mt-2" aria-label="Other targets">
			{#each standaloneTargets as target (target.targetRef)}
				<li>
					<button
						type="button"
						class="sk-play-roster-entry sk-play-roster-select"
						aria-pressed={target.targetRef === effectiveSelectedRef}
						onclick={() => selectTarget(target.targetRef)}
					>
						{target.label}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
	<!-- Card density folds the economy strip into this same row instead of
	     giving it a fourth stacked line (`check:tile-clip`, sk-jay0.1.8.40
	     mount step finding: a standalone strip line measured 161px against
	     the 132px budget). Only the standalone-targets/economy PORTION
	     scrolls (`min-w-0 flex-1` + `.sk-play-turnbar-strip` on the inner
	     wrapper, never the outer row) — End turn sits outside that
	     scrolling wrapper with `shrink-0`, so ending the turn never needs a
	     horizontal scroll first (a first cut folded End turn INTO the
	     scrolling strip too and a real capture showed it pushed off-screen
	     at 1280×720's own narrow table column; this is the fix). Stage
	     keeps `flex-wrap` on its own targets row above instead — there is
	     room there, and stage never reaches this gate (`check:tile-clip`
	     skips `zoom=stage` tiles outright). -->
	<div
		class="flex items-center gap-2"
		class:flex-wrap={density === "stage"}
		class:mt-5={density === "stage"}
		class:mt-0.5={density === "card"}
	>
		{#if density === "card" && (standaloneTargets.length > 0 || hasEconomy)}
			<div class="sk-play-turnbar-strip flex items-center gap-2 min-w-0 flex-1">
				{#if standaloneTargets.length > 0}
					<ul class="flex flex-wrap gap-1.5 shrink-0" aria-label="Other targets">
						{#each standaloneTargets as target (target.targetRef)}
							<li>
								<button
									type="button"
									class="sk-play-roster-entry sk-play-roster-select sk-play-roster-entry--compact"
									aria-pressed={target.targetRef === effectiveSelectedRef}
									onclick={() => selectTarget(target.targetRef)}
								>
									{target.label}
								</button>
							</li>
						{/each}
					</ul>
				{/if}
				{#if hasEconomy}
					<div class="shrink-0">
						<Economy channels={economy ?? []} density="card" chrome="bare" />
					</div>
				{/if}
			</div>
		{/if}
		<!-- Selection mode only selects: ending the turn is an act, and the
		     host's own action surface (Play's dock) carries it. -->
		{#if !selectionMode}
			<Button
				variant="outline"
				size="sm"
				type="button"
				class={density === "card" ? "sk-play-turnbar-compact shrink-0 whitespace-nowrap" : undefined}
				disabled={busy || combat.mode !== "your-turn"}
				onclick={onEndTurn}
			>
				End turn
			</Button>
		{/if}
	</div>
</PlayFrame>

<style>
	/* The turn is the one state a player must not miss: the frame's top rule
	 * thickens to the primary and the meta label takes the primary colour. */
	:global([data-play-frame].sk-play-turn) {
		border-top-width: 5px;
	}

	/* Card density's single-row scrolling strip (§10 row S1, decided
	 * 2026-09-09): the tracker/target chip row and the verb row share this
	 * class instead of wrapping, so the fixed-height card tile's own budget
	 * never depends on roster size or how many verbs the selected target
	 * offers. `overflow-x: auto` (never `hidden`) keeps every chip reachable
	 * by scrolling; `overscroll-behavior-x: contain` keeps that scroll from
	 * bubbling to the page behind it. `scrollbar-width`/`scrollbar-color`
	 * reuse the app shell's own thin-scrollbar convention
	 * (`apps/play/src/styles.css`'s `.play-shell`), semantic tokens only
	 * (`check-ui-primitives.sh` Rule C). `scroll-snap-type`/`-align` are the
	 * "optional" nicety the task allowed — a light rest point per chip, not
	 * load-bearing for the fix. */
	:global([data-slot="play-combat"] .sk-play-turnbar-strip) {
		flex-wrap: nowrap;
		overflow-x: auto;
		overscroll-behavior-x: contain;
		scrollbar-width: thin;
		scrollbar-color: var(--primary) var(--background);
		scroll-snap-type: x proximity;
	}

	/* Every chip/button in a scrolling strip keeps its own natural width
	 * (never shrinks to fit) so its label is never force-wrapped onto a
	 * second line — the strip scrolls instead, which is the whole point. */
	:global([data-slot="play-combat"] .sk-play-turnbar-strip > *) {
		flex-shrink: 0;
		scroll-snap-align: start;
	}

	/* `Economy`'s own top margin (`Economy.svelte`'s `mt-2`/`mt-3`) is meant
	 * for a mount that owns the whole line above it; nested here — either
	 * folded into the End-turn row (card) or wrapped in Combat's own
	 * `mt-2` spacer (stage) — that margin would only add height a flex
	 * item does not collapse away (S4, sk-jay0.1.8.40 mount step finding:
	 * a naive third strip line measured 161px against the 132px card
	 * budget). Combat owns the gap for its own children everywhere else in
	 * this file; zeroing the nested widget's own margin keeps that one
	 * rule true here too. */
	:global([data-slot="play-combat"] [data-slot="play-economy"] ul) {
		margin-top: 0;
	}

	:global([data-play-frame].sk-play-turn > header .sk-label) {
		color: var(--primary);
	}

	:global(.sk-play-roster-entry) {
		display: inline-flex;
		align-items: baseline;
		gap: 0.4rem;
		padding: 0.25rem 0.6rem;
		border: 1px solid color-mix(in srgb, currentColor 25%, transparent);
		border-radius: var(--radius);
		font-size: 0.875rem;
	}

	:global(.sk-play-roster-entry--me) {
		border-style: dashed;
	}

	/* Card density's own fixed tile height leaves no room for the tracker's
	 * usual (stage-sized) chip padding once the verb row and the End-turn
	 * row both need their own line too (`check:tile-clip`, sk-jay0.1.8.37
	 * task C finding). Stage keeps the roomier default. */
	:global(.sk-play-roster-entry--compact) {
		padding: 0.05rem 0.4rem;
		font-size: 0.75rem;
	}

	:global(.sk-play-roster-entry--current) {
		color: var(--primary);
		border-color: var(--primary);
		background-color: color-mix(in srgb, var(--primary) 12%, transparent);
	}

	:global(.sk-play-roster-you) {
		font-size: 0.75rem;
		font-weight: 600;
		opacity: 0.8;
	}

	:global(.sk-play-roster-turn) {
		color: var(--primary);
	}

	/* S5 (sk-jay0.1.8.41): a roster member whose co-located occupant carries
	 * a `…/dead` condition — struck through, not removed from the tracker
	 * (dead ones stay in a persistent initiative strip, design doc §4). */
	:global(.sk-play-roster-dead) {
		text-decoration: line-through;
		opacity: 0.7;
	}

	/* Every other disclosed condition, small glyph+label tokens after the
	 * name (S5). The bullet is a generic marker, not per-condition art —
	 * the world discloses condition ids and labels, never an icon. */
	:global(.sk-play-roster-conditions) {
		display: inline-flex;
		flex-wrap: wrap;
		gap: 0.3rem;
	}

	:global(.sk-play-roster-condition) {
		display: inline-flex;
		align-items: baseline;
		gap: 0.15rem;
		font-size: 0.7rem;
		opacity: 0.8;
	}

	:global(.sk-play-roster-condition--more) {
		opacity: 0.6;
	}

	/* A tracker chip that is also a target group renders as a button so it
	 * stays the single selectable chip for that name (never a second chip
	 * drawn below it). `all: unset` strips the browser's own button chrome
	 * before the roster-entry look is reapplied. */
	:global(button.sk-play-roster-select) {
		all: unset;
		display: inline-flex;
		align-items: baseline;
		gap: 0.4rem;
		cursor: pointer;
		font-size: inherit;
	}

	/* Standalone chips (the untargeted group, a non-roster named target)
	 * carry the roster-entry pill styling directly on the button itself,
	 * since there is no bordered `<li>` around them. */
	:global(button.sk-play-roster-select.sk-play-roster-entry) {
		padding: 0.25rem 0.6rem;
		border: 1px solid color-mix(in srgb, currentColor 25%, transparent);
		border-radius: var(--radius);
		font-size: 0.875rem;
	}

	/* Higher specificity than the rule above on purpose: a standalone card
	 * chip (the button carries `sk-play-roster-entry` directly, with no
	 * bordered `<li>` around it) needs the same tight padding the tracker's
	 * own compact `<li>` gets, and the plain `--compact` class rule alone
	 * loses to the rule above at equal specificity (source order). */
	:global(button.sk-play-roster-select.sk-play-roster-entry--compact) {
		padding: 0.05rem 0.4rem;
		font-size: 0.75rem;
	}

	:global(button.sk-play-roster-select[aria-pressed="true"]) {
		border-color: var(--primary);
		background-color: color-mix(in srgb, var(--primary) 12%, transparent);
	}

	/* End turn's and the verb row's own compact height at card density
	 * (`check:tile-clip`, sk-jay0.1.8.37 task C finding): the tile's fixed
	 * height has no room for the default `size="sm"` button height once
	 * the tracker, target chips, verb row and End turn all need their own
	 * line too. Height only — the verb button's own text is never
	 * truncated or forced onto one line by this rule. */
	:global([data-slot="play-combat"] .sk-play-turnbar-compact) {
		height: 1.5rem;
		min-height: 1.5rem;
	}
</style>
