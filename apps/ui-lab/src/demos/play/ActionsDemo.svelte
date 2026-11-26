<script lang="ts">
	import { Actions } from "@spellkave/ui-widgets";
	import { actions } from "./fixtures";
</script>

<!--
  Two sibling roots (the widget grid and the density grid below, split by a
  label) on purpose: ComponentPreview/DemoContainer now stacks a multi-root
  demo itself (sk-jay0.7.37), so this demo doubles as that fix's regression
  case — see App.test.ts's "/play/actions" test, which asserts DemoContainer
  supplies the `flex w-full flex-col` wrapper and this file doesn't need its
  own (that per-file wrapper was sk-jay0.7.33's original, now-redundant fix).
  `minmax(17rem,1fr)` floors each card at the mosaic's own card-column width
  (~272px at 1280px wide, apps/play/src/lib/mosaic.ts REST_SIZE +
  DESKTOP_COLUMNS, minus the play-widget frame's padding) instead of a fixed
  column count, so a long action label never bleeds past its card.
-->
<div class="grid w-full gap-4 sm:grid-cols-[repeat(auto-fit,minmax(17rem,1fr))]">
	<Actions actions={[actions.askAldwin, actions.speakMira, actions.speakAloud]} />
	<Actions actions={[actions.walkCellar]} />
	<Actions actions={[actions.meleeRat, actions.meleeSwarm]} />
	<Actions actions={[actions.claimVictory]} />
</div>

<p class="sk-label mt-6 mb-2 text-[color:var(--muted-foreground)]">
	density: strip | card | stage, default card
</p>
<div class="grid w-full gap-4 sm:grid-cols-[repeat(auto-fit,minmax(17rem,1fr))]">
	<Actions actions={[actions.askAldwin, actions.speakMira]} density="strip" />
	<Actions actions={[actions.askAldwin, actions.speakMira]} density="card" />
	<Actions actions={[actions.askAldwin, actions.speakMira]} density="stage" />
</div>
