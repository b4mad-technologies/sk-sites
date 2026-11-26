<script lang="ts">
	import { loomFocus } from "../lib/loom";
	import { cn } from "../lib/utils";
	import Action from "./dock-bar-action.svelte";
	import Menu from "./dock-bar-menu.svelte";
	import Pips from "./dock-pips.svelte";
	import type { DockHotbarGroup, DockHotbarProps } from "./types";

	let {
		rows,
		urgent,
		pips,
		expanded,
		onToggleExpanded,
		disabled,
		onSelect,
		trailing,
		class: className,
	}: DockHotbarProps = $props();

	// The draining bar starts at what is left of the window and runs to empty
	// in exactly the time that is left; a fresh `remainingMs` restarts it (the
	// `{#key}` below), so a late read corrects the bar instead of drifting.
	const urgentStart = $derived.by((): number => {
		if (!urgent || urgent.remainingMs === null) return 0;
		const total = urgent.totalMs ?? 0;
		if (total <= 0 || total < urgent.remainingMs) return 1;
		return Math.max(0, Math.min(1, urgent.remainingMs / total));
	});
</script>

<!-- Overflow menus each own their DropdownMenu context. The hotbar also
     contains toolbars, status and ordinary buttons, so it must not advertise
     itself as a WAI-ARIA menubar. `contents` keeps the wrapper out of layout. -->
<div class={cn("contents", className)}>
	<!-- The lead line: resources, then the first action row (or the open
	     reaction window in its place), then the caller's trailing slot and
	     the expand toggle. One line when there is room; it wraps when not. -->
	{#if urgent}
		<div class="flex flex-wrap items-center gap-x-3 gap-y-1" data-slot="dock-hotbar-lead">
		{@render pipStrip()}
		<div
			role="toolbar"
			aria-label={urgent.title ?? "Answer"}
			data-slot="dock-hotbar-urgent"
			class="relative flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 overflow-hidden rounded-[0.375rem] border border-[color:var(--primary)] bg-[color:var(--accent)] px-2 py-1"
		>
			<p role="status" aria-live="assertive" class="m-0 flex min-w-0 items-baseline gap-1.5 text-xs text-[color:var(--accent-foreground)]">
				<span aria-hidden="true">⚡</span>
				{#if urgent.title}<span class="sr-only">{urgent.title}.</span>{/if}
				<span class="min-w-0 font-semibold">{urgent.text}</span>
				{#if urgent.remainingMs !== null}
					<span class="shrink-0 tabular-nums"
						>· {Math.max(0, Math.ceil(urgent.remainingMs / 1000))} s</span
					>
				{/if}
			</p>
			<div class="ms-auto flex flex-wrap items-center gap-1">
				{#each urgent.answers as slot (slot.id)}
					<Action
						label={slot.label}
						key={slot.key ?? undefined}
						accessibleLabel={slot.accessibleLabel}
						{disabled}
						pending={slot.pending}
						onclick={() => onSelect(slot.id)}
					/>
				{/each}
			</div>
			{#if urgent.remainingMs !== null}
				{#key urgent.remainingMs}
					<span
						aria-hidden="true"
						data-slot="dock-hotbar-urgent-drain"
						class="dock-hotbar-drain absolute inset-x-0 bottom-0 h-0.5 origin-left bg-[color:var(--primary)]"
						style:--drain-from={urgentStart}
						style:--drain-ms="{Math.max(0, urgent.remainingMs)}ms"
					></span>
				{/key}
			{/if}
		</div>
		{@render rowEnd()}
		</div>
	{:else if rows.length === 0}
		<div class="flex flex-wrap items-center gap-x-3 gap-y-1" data-slot="dock-hotbar-lead">
			{@render pipStrip()}
			{@render rowEnd()}
		</div>
	{/if}

	{#each urgent ? [] : rows as row, rowIndex (rowIndex)}
		{#if rowIndex === 0}
			<div class="flex flex-wrap items-center gap-x-3 gap-y-1" data-slot="dock-hotbar-lead">
				{@render pipStrip()}
				{@render actionRow(row, rowIndex)}
				{@render rowEnd()}
			</div>
		{:else}
			{@render actionRow(row, rowIndex)}
		{/if}
	{/each}
</div>

{#snippet pipStrip()}
	{#if pips && pips.length > 0}<Pips {pips} />{/if}
{/snippet}

{#snippet rowEnd()}
	{#if trailing || onToggleExpanded}
		<!-- A caller may put a whole status cluster here (Play's compact
		     dock); on a narrow screen it must wrap, never push past the edge. -->
		<div class="ms-auto flex min-w-0 flex-wrap items-center justify-end gap-x-2 gap-y-1" data-slot="dock-hotbar-end">
			{#if trailing}{@render trailing()}{/if}
			{#if onToggleExpanded}
				<button
					type="button"
					aria-expanded={expanded ? "true" : "false"}
					onclick={onToggleExpanded}
					class={cn(
						"rounded-[0.25rem] border border-[color:var(--border)] px-1 text-[0.65rem] leading-5 text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted-surface)]",
						loomFocus,
					)}
					>{#if expanded}<span aria-hidden="true">▴</span><span class="sr-only"
							>Show fewer actions</span
						>{:else}<span aria-hidden="true">▾</span><span class="sr-only">Show more actions</span
						>{/if}</button
				>
			{/if}
		</div>
	{/if}
{/snippet}

{#snippet actionRow(row: DockHotbarGroup[], rowIndex: number)}
	<div
		role="toolbar"
		aria-label={rowIndex === 0 ? "Actions" : `More actions, row ${rowIndex + 1}`}
		class={cn("flex flex-wrap items-center gap-x-3 gap-y-1", rowIndex === 0 && "min-w-0")}
	>
		{#each row as group (group.id)}
			{#if group.slots.length > 0 || group.note}
				<div role="group" aria-label={group.label} class="flex flex-wrap items-center gap-1">
					<span
						class="text-[0.6rem] font-semibold tracking-[0.08em] text-[color:var(--muted-foreground)] uppercase"
						>{group.label}</span
					>
					{#each group.slots as slot (slot.id)}
						<Action
							label={slot.label}
							key={slot.key ?? undefined}
							accessibleLabel={slot.accessibleLabel}
							{disabled}
							pending={slot.pending}
							dimmed={slot.dimmed}
							dimmedReason={slot.dimmedReason}
							active={slot.active}
							onclick={() => onSelect(slot.id)}
						/>
					{/each}
					{#if group.note}
						<span class="text-[0.7rem] text-[color:var(--muted-foreground)]">{group.note}</span>
					{/if}
					{#if group.more && group.more.length > 0}
						<Menu
							label="…"
							accessibleLabel={`More for ${group.label}`}
							sections={group.more}
							{onSelect}
							{disabled}
						/>
					{/if}
				</div>
			{/if}
		{/each}
	</div>
{/snippet}

<style>
	.dock-hotbar-drain {
		transform: scaleX(var(--drain-from, 1));
		animation: dock-hotbar-drain var(--drain-ms, 0ms) linear forwards;
	}
	@keyframes dock-hotbar-drain {
		from {
			transform: scaleX(var(--drain-from, 1));
		}
		to {
			transform: scaleX(0);
		}
	}
	/* Without motion the bar stands at what was left when it was read; the
	   seconds beside the text still count. */
	@media (prefers-reduced-motion: reduce) {
		.dock-hotbar-drain {
			animation: none;
		}
	}
</style>
