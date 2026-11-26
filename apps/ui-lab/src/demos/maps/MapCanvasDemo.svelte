<script lang="ts">
	import { MapCanvas } from "@spellkave/map-canvas";

	// ui-lab serves a fixture world from `public/w/map-canvas-demo/` (style.json
	// + tiles.json, no real tiles) so this page mounts a genuinely working
	// MapLibre canvas without a live gateway or a WorkOS session — that also
	// lets a container-resize check run against a real map. A live mount
	// (apps/maps and Play's map tile) needs a real
	// `gatewayOrigin` and a bearer `token`; without one the canvas shows its
	// "Sign in and pick a world" notice instead of crashing.
	const gatewayOrigin = typeof window !== "undefined" ? window.location.origin : "";
	const slug = "map-canvas-demo";
	const token = "ui-lab-demo-fixture";
</script>

<!--
  This page's shared preview wrapper (ComponentPreview.svelte) is a
  `flex justify-center` row with no definite width of its own — a CSS Grid
  root here loses its `1fr` tracks to min-content sizing against that
  indefinite space (each column collapses to its narrowest word). A single
  `flex flex-col` root, one direct child of the preview row, sidesteps it.
-->
<div class="flex w-full flex-col gap-4">
	<div class="flex w-full flex-wrap gap-6">
		<div class="flex flex-col gap-2">
			<p class="max-w-[260px] text-xs text-muted-foreground">
				<code class="font-mono">mode="medium"</code> — map init, pan/zoom, tap a place. Drag the
				corner to resize; the canvas follows without any explicit resize call.
			</p>
			<div
				class="relative resize overflow-auto rounded-[var(--radius)] border border-border"
				style="width: 260px; height: 300px;"
				data-testid="map-canvas-demo-medium"
			>
				<MapCanvas {gatewayOrigin} {slug} {token} mode="medium" />
			</div>
		</div>
		<div class="flex flex-col gap-2">
			<p class="max-w-[320px] text-xs text-muted-foreground">
				<code class="font-mono">mode="full"</code> — plus search, floor switcher and place panel.
				<code class="font-mono">substrateControl</code> opts in to the Substrate buttons (Play
				leaves it off). The own seat marker shows in both modes.
			</p>
			<div
				class="relative resize overflow-auto rounded-[var(--radius)] border border-border"
				style="width: 320px; height: 300px;"
				data-testid="map-canvas-demo-full"
			>
				<MapCanvas {gatewayOrigin} {slug} {token} mode="full" substrateControl />
			</div>
		</div>
	</div>

	<p class="max-w-[65ch] text-xs text-muted-foreground">
		The optional <code class="font-mono">notices</code> prop maps notice kinds
		(<code>blocked</code>, <code>loading</code>, <code>ready</code>, <code>no-art</code>,
		<code>failed</code>) to product-specific text. Omitted kinds keep the defaults;
		status and diagnostic detail stay unchanged. Play overrides blocked and failed
		with recovery instructions for an already seated player.
		<code class="font-mono">onNotice</code> observes lifecycle changes; consumers
		can publish the notice kind without its diagnostic text.
	</p>
	<p class="max-w-[65ch] text-xs text-muted-foreground">
		Prop contract: <code class="font-mono"
			>{"{ gatewayOrigin, slug, token, placeNodeId?, mode: \"medium\" | \"full\", onPlaceClick? }"}</code
		>. <code class="font-mono">full</code> also accepts
		<code class="font-mono">minePlaces?</code>, <code class="font-mono">mineEntityIds?</code> and
		<code class="font-mono">children?</code> for the seat marker — the extension apps/maps needed to
		keep its behaviour unchanged when this widget moved out of it.
	</p>
</div>
