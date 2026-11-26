<script lang="ts">
	import EntityDetail from "./EntityDetail.svelte";
	import ItemRow from "./ItemRow.svelte";
	import PlayFrame from "./PlayFrame.svelte";
	import type { PackProps } from "./types";

	let {
		items,
		selectionOnly = false,
		otherActions,
		artwork,
		renderProse,
		reference,
		selectedId = null,
		onSelect,
		detail = null,
		onAct,
		density = "card",
		chrome = "frame",
	}: PackProps = $props();

	// Controlled selection (mirrors OccupantsProps): absent ⇒ the first item,
	// same default this widget always had, now the caller's to override so
	// the on-demand item_detail/affordance_actions read (play-session.ts) can
	// key off the same id.
	const activeId = $derived(selectedId ?? items[0]?.id ?? null);
	const inspected = $derived(items.find((item) => item.id === activeId) ?? null);
	const carried = $derived(items.reduce((sum, item) => sum + (item.quantity ?? 1), 0));
	const equipped = $derived(items.filter((item) => item.equipped));
	// Identical carried things stack into one row ("Rations ×10") instead of
	// ten rows: the world keeps each ration its own entity, but the player
	// reads a pack, not an entity table. A stack stands for its first entity
	// (that is the id inspection and verbs act on); equipped items never stack
	// because each sits in its own slot.
	type PackRow = { id: string; name: string; quantity: number; equipped: string | null; depth: number; ids: string[] };
	const rows = $derived.by(() => {
		const out: PackRow[] = [];
		const byName = new Map<string, PackRow>();
		for (const item of items) {
			const quantity = item.quantity ?? 1;
			const depth = item.depth ?? 0;
			if (item.equipped) {
				out.push({ id: item.id, name: item.name, quantity, equipped: item.equipped, depth, ids: [item.id] });
				continue;
			}
			// Stacks are per name AND depth: a torch in the pack and one carried
			// loose are different rows.
			const stack = byName.get(`${depth}:${item.name}`);
			if (stack === undefined) {
				const row: PackRow = { id: item.id, name: item.name, quantity, equipped: null, depth, ids: [item.id] };
				byName.set(`${depth}:${item.name}`, row);
				out.push(row);
			} else {
				stack.quantity += quantity;
				stack.ids.push(item.id);
			}
		}
		return out;
	});
	// A detail from a previous selection must never render against the new
	// one while the on-demand read is still in flight — gate on id.
	const activeDetail = $derived(detail !== null && detail.id === activeId ? detail : null);
</script>

<PlayFrame
	slot="play-pack"
	titleId="play-pack-heading"
	title="Pack"
	meta={items.length > 0 ? `${carried} carried` : undefined}
	{density}
	{chrome}
	glyph="thing"
	datum="{equipped.length} worn"
	class={density === "stage" ? "pack-stage" : undefined}
>
	{#if items.length === 0}
		<p class="sk-play-prose sk-play-muted">The pack is empty.</p>
	{:else}
		<!-- Equipped chips are the quick read at every non-strip density. -->
		<div class="flex flex-wrap items-center gap-1.5" class:mt-2={density === "card"} class:mt-3={density === "stage"}>
			{#each equipped as item (item.id)}
				{#if density === "card" && onSelect}
					<button
						type="button"
						class="sk-label sk-play-muted rounded-[var(--radius)] border border-[color:var(--border)] px-1.5 py-0.5"
						aria-pressed={selectedId === item.id}
						onclick={() => onSelect(item.id)}
					>{item.name}</button>
				{:else}
					<span class="sk-label sk-play-muted rounded-[var(--radius)] border border-[color:var(--border)] px-1.5 py-0.5">
						{item.name}
					</span>
				{/if}
			{:else}
				<span class="sk-play-muted text-sm">Nothing equipped.</span>
			{/each}
		</div>
		{#if density === "stage"}
			<div class="pack-panes">
				<ul class="sk-play-list pack-items" aria-label="Pack items">
					{#each rows as row (row.id)}
						<li>
							<ItemRow
								id={row.id}
								name={row.name}
								quantity={row.quantity}
								equipped={row.equipped}
								depth={row.depth}
								selected={activeId !== null && row.ids.includes(activeId)}
								onSelect={(next) => onSelect?.(next)}
							/>
						</li>
					{/each}
					{#if selectionOnly && (activeDetail === null || activeDetail.failed)}
						<li class="sk-play-muted text-sm" role={activeDetail?.failed ? "alert" : "status"}>
							{activeDetail?.failed ? "Could not load item details." : "Loading item details…"}
						</li>
					{/if}
				</ul>
				{#if inspected}
					<EntityDetail
						{renderProse}
						{reference}
						name={inspected.name}
						selectedId={inspected.id}
						detail={activeDetail}
						lead={inspected.detail}
						{artwork}
						{onAct}
						showActions={!selectionOnly}
						otherActions={selectionOnly ? undefined : otherActions}
						actionsTitle="Actions on this item"
						loadingText="Loading actions on this item…"
						failedText="Could not load actions on this item."
						emptyText="No actions on this item are offered here."
						showHeading={false}
						ariaLabel="Selected item details"
					/>
				{/if}
			</div>
		{:else}
			<!-- Card is the ledger's card content: equipped chips (above) plus an
			     item count — the pack list and item detail are stage's job
			     (sk-jay0.1.8.5 finding 2). -->
			<p class="sk-play-muted m-0 mt-2 text-sm">
				{rows.length} {rows.length === 1 ? "kind" : "kinds"} · {carried}
				{carried === 1 ? "piece" : "pieces"}
			</p>
		{/if}
	{/if}
</PlayFrame>

<style>
	:global(.pack-stage) {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
		container-type: inline-size;
	}

	.pack-panes {
		display: grid;
		grid-template-rows: minmax(0, 2fr) minmax(0, 3fr);
		flex: 1;
		min-height: 0;
		gap: 1rem;
		margin-top: 1rem;
	}

	.pack-items,
	:global(.pack-panes .entity-detail) {
		min-height: 0;
		overflow: auto;
		overscroll-behavior: contain;
		scrollbar-gutter: stable;
	}

	:global([data-slot="play-pack"]) .pack-items {
		margin-top: 0;
	}

	:global([data-slot="play-pack"] button[aria-pressed="true"]) {
		border-color: var(--primary);
		color: var(--primary);
	}

:global(.pack-panes .entity-detail) {
		border-top: 1px solid var(--border);
		padding-top: 1rem;
	}

	@container (min-width: 32rem) {
		.pack-panes {
			grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
			grid-template-rows: minmax(0, 1fr);
		}

		:global(.pack-panes .entity-detail) {
			border-top: 0;
			padding-top: 0;
			border-left: 1px solid var(--border);
			padding-left: 1rem;
		}
	}
</style>
