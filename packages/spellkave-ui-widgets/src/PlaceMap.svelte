<script lang="ts">
	import { untrack } from "svelte";
	import { previewViewBox } from "./map-preview";
	import PlayFrame from "./PlayFrame.svelte";
	import type { BattleMapExit, PlaceMapProps } from "./types";

	let {
		frame,
		density = "card",
		chrome = "frame",
		exits,
		onTravel,
		pendingHandle = null,
		disabled = false,
	}: PlaceMapProps = $props();
	let plate = $state<HTMLDivElement | null>(null);
	// A place plate is an authored SVG, rather than the whole-world MapLibre
	// canvas or a tactical grid. It still needs the same basic map affordance:
	// readers can pan and enlarge the drawing without leaving the current tile.
	let zoom = $state(1);
	let panX = $state(0);
	let panY = $state(0);
	const MIN_ZOOM = 1;
	const MAX_ZOOM = 3;
	const ZOOM_STEP = 0.25;
	function clampZoom(value: number) {
		return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 100) / 100));
	}
	function zoomAt(clientX: number, clientY: number, nextZoom: number) {
		if (!plate || nextZoom === zoom) return;
		const rect = plate.getBoundingClientRect();
		const ratio = nextZoom / zoom;
		// Keep the point beneath the cursor still, just like a slippy map.
		panX = clientX - rect.left - rect.width / 2 - (clientX - rect.left - rect.width / 2 - panX) * ratio;
		panY = clientY - rect.top - rect.height / 2 - (clientY - rect.top - rect.height / 2 - panY) * ratio;
		zoom = nextZoom;
	}
	function zoomBy(delta: number) {
		if (!plate) return;
		const rect = plate.getBoundingClientRect();
		zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, clampZoom(zoom + delta));
	}
	function resetView() {
		zoom = 1;
		panX = 0;
		panY = 0;
	}
	let drag = $state<{ pointerId: number; x: number; y: number; panX: number; panY: number; moved: boolean } | null>(null);
	let suppressTravelClick = false;
	function onPointerDown(event: PointerEvent) {
		if (event.button !== 0 || !plate) return;
		drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, panX, panY, moved: false };
	}
	function onPointerMove(event: PointerEvent) {
		if (!drag || event.pointerId !== drag.pointerId) return;
		const dx = event.clientX - drag.x;
		const dy = event.clientY - drag.y;
		if (!drag.moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
			drag.moved = true;
			// Capturing at pointerdown retargets an ordinary click in Chromium,
			// so an SVG place never receives it. Capture only once this is a real
			// drag, where keeping movement beyond the plate is the priority.
			plate?.setPointerCapture?.(event.pointerId);
		}
		panX = drag.panX + dx;
		panY = drag.panY + dy;
	}
	function endDrag(event: PointerEvent) {
		if (!drag || event.pointerId !== drag.pointerId) return;
		suppressTravelClick = drag.moved;
		if (plate?.hasPointerCapture?.(event.pointerId)) plate.releasePointerCapture(event.pointerId);
		drag = null;
	}
	function onWheel(event: WheelEvent) {
		event.preventDefault();
		zoomAt(event.clientX, event.clientY, clampZoom(zoom + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)));
	}
	// The host rebuilds `frame` on every view refresh. Only these inputs
	// decide the framing, so equal values must not re-run the effect: its
	// cleanup resets the viewBox and every label for a frame, a visible
	// wobble on each refresh.
	const framing = $derived(
		`${density}|${frame.mode}|${frame.focusNodeId ?? ""}|${(frame.nearbyNodeIds ?? []).join(",")}|${frame.svg ?? ""}`,
	);
	// A genuinely new drawing or framing starts at its authored fit. Equal
	// refresh objects leave a reader's chosen zoom alone.
	$effect(() => {
		framing;
		resetView();
	});
	// PlaceMap's travel listener is deliberately delegated inside `plate`.
	// Capture a drag's follow-up click before it reaches that listener: panning
	// must never also select a neighbouring place.
	$effect(() => {
		if (!plate) return;
		const host = plate;
		const preventDraggedClick = (event: MouseEvent) => {
			if (!suppressTravelClick) return;
			suppressTravelClick = false;
			event.preventDefault();
			event.stopImmediatePropagation();
		};
		host.addEventListener("click", preventDraggedClick, true);
		return () => host.removeEventListener("click", preventDraggedClick, true);
	});
	$effect(() => {
		framing;
		if (!plate) return;
		const framed = untrack(() => frame);
		if (untrack(() => density) !== "card" || framed.mode !== "peek" || !framed.focusNodeId) return;
		const svg = plate.querySelector("svg");
		const nodes = Array.from(plate.querySelectorAll<SVGGraphicsElement>("[data-node-id]"));
		const current = nodes.find((node) => node.dataset.nodeId === framed.focusNodeId);
		if (!svg || !current || typeof current.getBBox !== "function") return;
		const mark = current.querySelector<SVGGraphicsElement>(".place, .grid-cell") ?? current;
		const nearby = nodes.filter((node) => node === current || framed.nearbyNodeIds?.includes(node.dataset.nodeId ?? ""));
		// Authored extent circles describe space, but should not force a tiny
		// preview. Frame the supplied place marks and labels instead.
		const bounds = nearby.flatMap((node) => {
			const marks = Array.from(node.querySelectorAll<SVGGraphicsElement>(".place, .grid-cell, .label"));
			return (marks.length ? marks : [node]).map((entry) => entry.getBBox());
		});
		const box = previewViewBox(mark.getBBox(), bounds);
		if (!box) return;
		const original = svg.getAttribute("viewBox");
		svg.setAttribute("viewBox", box);
		current.classList.add("sk-play-map-current");
		const labels = nodes.flatMap((node) => Array.from(node.querySelectorAll<SVGTextElement>("text.label")));
		const originals = labels.map((label) => ({ label, style: label.getAttribute("style"), x: label.getAttribute("x") }));
		const [x, , width, height] = box.split(" ").map(Number) as [number, number, number, number];
		const resize = () => {
			const rect = svg.getBoundingClientRect();
			const scale = Math.min(rect.width / width, rect.height / height);
			if (!(scale > 0)) return;
			for (const { label, x: originalX } of originals) {
				if (originalX !== null) label.setAttribute("x", originalX);
				label.style.fontSize = `${12 / scale}px`;
				const bounds = label.getBBox();
				const padding = 4 / scale;
				const shift = Math.max(0, x + padding - bounds.x) - Math.max(0, bounds.x + bounds.width - (x + width - padding));
				if (shift && originalX !== null) label.setAttribute("x", String(Number(originalX) + shift));
			}
		};
		resize();
		const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(resize);
		observer?.observe(svg);
		return () => {
			observer?.disconnect();
			for (const { label, style, x } of originals) {
				if (style === null) label.removeAttribute("style"); else label.setAttribute("style", style);
				if (x === null) label.removeAttribute("x"); else label.setAttribute("x", x);
			}
			if (original !== null) svg.setAttribute("viewBox", original);
			current.classList.remove("sk-play-map-current");
		};
	});

	// Click-to-travel: mirrors BattleMap's own `data-node-id` matching
	// (`exits.find` by `toNodeId`, first match wins), but wired through one
	// delegated listener on the plate instead of per-node listeners. The plate
	// itself owns pan/zoom, while only matched nodes are travel selectors.
	const TRAVEL_CLASS = "sk-play-map-travel";
	const PENDING_CLASS = "sk-play-map-travel-pending";
	// Keyed the same way as `framing`: the host may rebuild `exits` on every
	// refresh, so only a content change re-marks the plate.
	const travelKey = $derived(
		`${onTravel ? 1 : 0}|${frame.svg ?? ""}|${frame.focusNodeId ?? ""}|${(exits ?? [])
			.map((exit) => `${exit.handle}>${exit.toNodeId}>${exit.label}`)
			.join(";")}|${pendingHandle ?? ""}|${disabled ? 1 : 0}`,
	);
	$effect(() => {
		travelKey;
		if (!plate) return;
		const host = plate;
		const requested = untrack(() => onTravel);
		if (!requested) return;
		// A plain re-binding, not just a narrowed reference: `onClick` and
		// `onKeydown` below are closures, and TS does not carry a flow
		// narrowing of an optional variable across a function boundary, only
		// a binding whose own declared type was never optional.
		const travel: (handle: string) => void = requested;
		const activeExits = untrack(() => exits) ?? [];
		const currentNodeId = untrack(() => frame.focusNodeId) ?? null;
		const pending = untrack(() => pendingHandle) ?? null;
		const isDisabled = untrack(() => disabled) === true;

		const nodes = Array.from(host.querySelectorAll<SVGGraphicsElement>("[data-node-id]"));
		const marked = new Map<SVGGraphicsElement, BattleMapExit>();
		for (const node of nodes) {
			const nodeId = node.dataset.nodeId ?? "";
			// The current place is never a travel target, even if an exit
			// (wrongly) names its own node.
			if (!nodeId || nodeId === currentNodeId) continue;
			const exit = activeExits.find((candidate) => candidate.toNodeId === nodeId);
			if (exit) marked.set(node, exit);
		}

		for (const [node, exit] of marked) {
			node.classList.add(TRAVEL_CLASS);
			node.setAttribute("role", "button");
			node.setAttribute("tabindex", "0");
			node.setAttribute("aria-label", `Go to ${exit.label}`);
			node.setAttribute("data-travel-handle", exit.handle);
			if (isDisabled) node.setAttribute("aria-disabled", "true");
			if (exit.handle === pending) {
				node.setAttribute("aria-busy", "true");
				node.classList.add(PENDING_CLASS);
			}
		}

		function resolve(target: EventTarget | null): SVGGraphicsElement | undefined {
			const el = (target as Element | null)?.closest<SVGGraphicsElement>(`.${TRAVEL_CLASS}`);
			return el && marked.has(el) ? el : undefined;
		}

		function onClick(event: MouseEvent) {
			const node = resolve(event.target);
			if (!node) return;
			// Swallow the click here regardless of outcome: a matched node
			// already looks and behaves like a button, so its host tile must
			// never also treat the click as its own open/zoom gesture.
			event.stopPropagation();
			if (isDisabled || pending) return;
			const exit = marked.get(node);
			if (exit) travel(exit.handle);
		}
		function onKeydown(event: KeyboardEvent) {
			if (event.key !== "Enter" && event.key !== " " && event.key !== "Spacebar") return;
			const node = resolve(event.target);
			if (!node) return;
			event.preventDefault();
			event.stopPropagation();
			if (isDisabled || pending) return;
			const exit = marked.get(node);
			if (exit) travel(exit.handle);
		}
		host.addEventListener("click", onClick);
		host.addEventListener("keydown", onKeydown);

		return () => {
			host.removeEventListener("click", onClick);
			host.removeEventListener("keydown", onKeydown);
			for (const node of marked.keys()) {
				node.classList.remove(TRAVEL_CLASS, PENDING_CLASS);
				node.removeAttribute("role");
				node.removeAttribute("tabindex");
				node.removeAttribute("aria-label");
				node.removeAttribute("data-travel-handle");
				node.removeAttribute("aria-disabled");
				node.removeAttribute("aria-busy");
			}
		};
	});
</script>

<PlayFrame
	slot="play-map"
	titleId="play-map-{frame.mode}"
	title={frame.mode === "peek" ? "Map peek" : "Map"}
	meta={frame.mode === "peek" ? "Nearby" : "Full"}
	data-map-mode={frame.mode}
	{density}
	{chrome}
	glyph="map"
	class={density === "card" ? "sk-play-map-card" : undefined}
	datum={frame.placeName}
>
	{#if frame.svg}
		<div class="sk-play-map-shell mt-2" class:sk-play-map-shell--dense={density === "card"}>
			<div
				class="sk-play-map sk-play-map--drawn"
				bind:this={plate}
				class:sk-play-map--peek={frame.mode === "peek"}
				class:sk-play-map--dense={density === "card"}
				style:--sk-play-map-zoom={zoom}
				style:--sk-play-map-pan-x={`${panX}px`}
				style:--sk-play-map-pan-y={`${panY}px`}
				role="img"
				aria-label="{frame.placeName}. {frame.caption}"
				class:sk-play-map--dragging={drag !== null}
				onpointerdown={onPointerDown}
				onpointermove={onPointerMove}
				onpointerup={endDrag}
				onpointercancel={endDrag}
				onwheel={onWheel}
			>
				<!-- The host sanitised this markup (sanitiseSvg) before handing it over. -->
				{@html frame.svg}
			</div>
			<div class="sk-play-map-controls" role="group" aria-label="Map controls">
				<button type="button" aria-label="Zoom out" disabled={zoom <= MIN_ZOOM} onclick={() => zoomBy(-ZOOM_STEP)}>−</button>
				<button type="button" aria-label="Zoom in" disabled={zoom >= MAX_ZOOM} onclick={() => zoomBy(ZOOM_STEP)}>+</button>
				<button type="button" aria-label="Reset map view" disabled={zoom === 1 && panX === 0 && panY === 0} onclick={resetView}>⌖</button>
			</div>
		</div>
	{:else}
		<p class="sk-play-muted m-0 mt-2 text-xs" role="status" aria-label="Map status">
			{frame.state === "loading" ? "Loading place map…" : frame.state === "failed" ? "Place map unavailable." : "No map is drawn for this place yet."}
		</p>
	{/if}
	<!-- A bare map lives inside Play's Map tile, whose header already names the
	     current place. Keep this line for standalone/framed widgets, but never
	     repeat the same place directly below a bare tile's map plate. -->
	{#if chrome !== "bare"}<p class="sk-display m-0 mt-2 text-base truncate" title={frame.placeName}>{frame.placeName}</p>{/if}
	{#if !frame.svg}
		{#if frame.description}<p class="sk-play-muted m-0 mt-1 text-sm" class:line-clamp-2={density === "card"}>{frame.description}</p>{/if}
		{#if frame.nearby?.length}<p class="sk-play-muted m-0 mt-1 text-xs" class:line-clamp-2={density === "card"}>Exits: {frame.nearby.join(" · ")}</p>{/if}
	{:else if density === "stage"}
		<p class="sk-play-muted m-0 mt-0.5 text-sm">{frame.caption}</p>
	{/if}
</PlayFrame>

<style>
	/* Only the supplied authorized SVG is a map. Missing maps use place prose. */
	:global(.sk-play-map) {
		position: relative;
		height: 14rem;
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background-color: var(--background);
		cursor: grab;
		touch-action: none;
	}

	:global(.sk-play-map--peek) {
		height: 7rem;
	}

	:global(.sk-play-map-shell) {
		position: relative;
		min-height: 14rem;
	}

	:global(.sk-play-map-shell--dense) {
		flex: 1 1 0;
		min-height: 0;
	}

	:global(.sk-play-map-shell > .sk-play-map) {
		height: 100%;
	}

	/* Card density is a plate, not the stage's full reading room. */
	:global(.sk-play-map--dense) {
		height: 9rem;
	}

	:global(.sk-play-map--dense.sk-play-map--peek) {
		height: 5rem;
	}

	/* A drawn map keeps the plate as its ground and fills it edge to edge. */
	:global(.sk-play-map--drawn) {
		height: auto;
		min-height: 14rem;
		max-height: 32rem;
	}

	:global(.sk-play-map--drawn.sk-play-map--dense) {
		flex: 1 1 0;
		height: 100%;
		min-height: 0;
	}

	:global(.sk-play-map-card) {
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 0;
	}

	:global(.sk-play-map-card > p) {
		flex-shrink: 0;
	}

	:global(.sk-play-map--drawn > svg) {
		display: block;
		width: 100%;
		height: 100%;
		max-height: 32rem;
		transform: translate(var(--sk-play-map-pan-x, 0), var(--sk-play-map-pan-y, 0)) scale(var(--sk-play-map-zoom, 1));
		transform-origin: center;
		transition: transform 120ms ease-out;
	}

	:global(.sk-play-map--dragging) { cursor: grabbing; }

	/* Card density: the renderer emits a light print document (full-size
	   ground rect anchored at 0,0, title bar, legend). The card re-frames the
	   viewBox around one place, so the ground would cover only a slice and the
	   chrome is noise at this size. Hide them; the plate's own ground shows.
	   The renderer wraps a label's floor suffix (" (z=-3)") in its own
	   tspan.label-floor; the card shows the plain place name, so hide it here
	   instead of parsing label text (sk-jay0.4.21). getBBox in resize() skips
	   display:none content, so the overflow shift measures the shown name. */
	:global(.sk-play-map--dense > svg > rect[width="100%"]),
	:global(.sk-play-map--dense > svg .title-bar),
	:global(.sk-play-map--dense > svg .map-chrome),
	:global(.sk-play-map--dense > svg .label-floor) {
		display: none;
	}

	/* The drawing's labels and halos are dark-on-white; restyle from theme
	   tokens so the card reads on the dark theme. */
	:global(.sk-play-map--dense > svg .label) {
		fill: var(--foreground);
		stroke: var(--background);
	}

	:global(.sk-play-map-controls) {
		position: absolute;
		top: 0.35rem;
		right: 0.35rem;
		display: grid;
		overflow: hidden;
		border-radius: var(--radius);
		background: color-mix(in srgb, var(--background) 55%, transparent);
	}

	:global(.sk-play-map-controls button) {
		display: grid;
		place-items: center;
		box-sizing: border-box;
		width: 1.9rem;
		height: 1.9rem;
		min-width: 0;
		padding: 0;
		border: 0;
		border-bottom: 0;
		background: transparent;
		color: var(--foreground);
		font: 600 1.1rem/1 system-ui, sans-serif;
		line-height: 1;
		cursor: pointer;
	}

	:global(.sk-play-map-controls button:hover:not(:disabled)) { background: color-mix(in srgb, var(--background) 75%, var(--foreground)); }
	:global(.sk-play-map-controls button:focus-visible) { outline: 2px solid var(--ring); outline-offset: -2px; }
	:global(.sk-play-map-controls button:disabled) { cursor: default; color: var(--muted-foreground); }

	:global(.sk-play-map-current .place) {
		stroke: var(--primary);
		stroke-width: 4px;
	}

	/* A travel target opts back into pointer events on top of the plate's own
	   `pointer-events: none` (above): `bounding-box` also grows the hit area
	   to the mark's full bounding box (mark + label) instead of just the
	   drawn dot, the cheapest way to widen a small SVG mark's hit area
	   without measuring pixels the plate cannot see at author time. */
	:global(.sk-play-map-travel) {
		/* `bounding-box` is Chromium-only. A browser that drops it as invalid
		   must not fall back to the plate's inherited `none`, which would leave
		   the target unclickable; `all` makes the drawn mark and label
		   clickable everywhere, `bounding-box` then widens it where known. */
		pointer-events: all;
		/* biome-ignore lint/suspicious/noDuplicateProperties: the duplicate IS the fallback described above */
		pointer-events: bounding-box;
		cursor: pointer;
	}

	:global(.sk-play-map-travel:hover .place),
	:global(.sk-play-map-travel:focus-visible .place) {
		stroke: var(--ring);
		stroke-width: 3px;
	}

	:global(.sk-play-map-travel:focus-visible) {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
	}

	:global(.sk-play-map-travel[aria-disabled="true"]) {
		cursor: default;
	}

	:global(.sk-play-map-travel-pending) {
		cursor: default;
		opacity: 0.55;
	}
</style>
