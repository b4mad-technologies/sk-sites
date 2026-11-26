<script lang="ts">
	import { Pack } from "@spellkave/ui-widgets";
	import { packs } from "./fixtures";
</script>

<!--
  Two sibling roots: DemoContainer (sk-jay0.7.37) stacks a multi-root demo
  itself now, so this file doesn't need its own `flex w-full flex-col`
  wrapper (sk-jay0.7.33's original per-file fix) — see ActionsDemo.svelte
  for the fuller rationale and the regression test in App.test.ts.
  `minmax(17rem,1fr)` still floors each card at the mosaic's own
  card-column width (~272px at 1280px wide, apps/play/src/lib/mosaic.ts
  REST_SIZE + DESKTOP_COLUMNS, minus the play-widget frame's padding) so a
  long action label never bleeds past its card.
-->
<div class="grid w-full gap-4 sm:grid-cols-[repeat(auto-fit,minmax(17rem,1fr))]">
	<Pack items={packs.fieldKit} />
	<Pack items={packs.empty} />
</div>

<p class="sk-label mt-6 mb-2 text-[color:var(--muted-foreground)]">
	density: strip | card | stage, default card
</p>
<div class="grid w-full gap-4 sm:grid-cols-[repeat(auto-fit,minmax(17rem,1fr))]">
	<Pack items={packs.fieldKit} density="strip" />
	<Pack items={packs.fieldKit} density="card" />
	<Pack items={packs.fieldKit} density="stage" />
</div>
