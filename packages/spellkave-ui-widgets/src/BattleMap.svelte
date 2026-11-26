<script module lang="ts">
	/** Pan and zoom per `viewKey`, kept outside the component instance: a
	 * host that remounts the map (Play drops the plate for a moment on every
	 * map reload, i.e. every step and every turn) would otherwise snap the
	 * reader back to the full view each time. Lives for the page's lifetime. */
	const savedViews = new Map<string, { tx: number; ty: number; zoom: number }>();
</script>

<script lang="ts">
	import { untrack } from "svelte";
	import { gridViewBox } from "./battle-map";
	import type { BattleMapProps, BattleMapToken } from "./types";

	/**
	 * Interactive surface for a tactical-grid plate (`spellkave_map`,
	 * `output_type: "svg"`, composed over its parent place — design doc
	 * `ledger/designs/play-battle-mode.md` §5.1). The plate stays the world's
	 * own drawing; this widget only marks cells and reads clicks off the
	 * `data-node-id` the renderer already stamps on every cell's `<g>`
	 * (`render-svg.ts`).
	 *
	 * Self-contained on purpose (no `PlayFrame` chrome, no density/chrome
	 * props): the host mounts this inside its own map tile and owns that
	 * frame. `hasGridCells` (`battle-map.ts`) tells the host whether this
	 * widget or `PlaceMap` is the right one for a given plate.
	 *
	 * Two modes (user ruling 2026-09-19, "the map only ever SELECTS; actions
	 * happen only on the Table"):
	 * - Legacy (`onSelectCell` absent): clicking an offered neighbour cell
	 *   calls `onStep` immediately, exactly as before this ruling.
	 * - Selection (`onSelectCell` supplied): every cell — free, occupied,
	 *   own, out of reach — is selectable, because selecting is information,
	 *   not action. A click, Enter, or Space always calls `onSelectCell` and
	 *   never `onStep`.
	 */
	let {
		plate,
		ownNodeId,
		exits,
		onStep,
		refusal,
		selectedNodeId = null,
		onSelectCell,
		tokens,
		selectableNodeIds,
		viewKey,
	}: BattleMapProps = $props();

	let viewport = $state<HTMLDivElement | null>(null);
	let plateHost = $state<HTMLDivElement | null>(null);

	const restored = untrack(() => (viewKey ? savedViews.get(viewKey) : undefined));
	let tx = $state(restored?.tx ?? 0);
	let ty = $state(restored?.ty ?? 0);
	let zoom = $state(restored?.zoom ?? 1);

	const MIN_ZOOM = 0.5;
	const MAX_ZOOM = 4;
	const ZOOM_STEP = 0.25;
	const clampZoom = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

	function resetView() {
		tx = 0;
		ty = 0;
		zoom = 1;
	}

	// The buttons zoom about the viewport's centre; the wheel keeps its own
	// finer step. Both share the clamp, so the buttons disable at the limits.
	function zoomBy(delta: number) {
		zoom = clampZoom(Math.round((zoom + delta) * 100) / 100);
	}

	$effect(() => {
		if (!viewKey) return;
		savedViews.set(viewKey, { tx, ty, zoom });
	});

	// Drag-pan via the Pointer Events API: one code path for mouse and touch,
	// pinch (below) handles two-finger touch separately.
	let dragging = false;
	let dragStartX = 0;
	let dragStartY = 0;
	let dragOriginX = 0;
	let dragOriginY = 0;

	// A drag that ends on a cell still fires that cell's `click` on
	// pointerup (browser behaviour, not ours to suppress at the source) —
	// which would select/step for a pan, not a deliberate click. Track
	// whether the pointer moved past a small threshold since pointerdown,
	// and swallow exactly the next click when it did (capture-phase listener
	// below). Keyboard Enter/Space never goes through `click`, so this never
	// touches keyboard activation.
	const DRAG_THRESHOLD_PX = 4;
	let dragMoved = false;
	let dragCaptureEl: HTMLElement | null = null;
	let dragPointerId: number | null = null;

	function onPointerDown(event: PointerEvent) {
		if (event.pointerType === "touch" && pinchPointers.size >= 1) return;
		dragging = true;
		dragMoved = false;
		dragStartX = event.clientX;
		dragStartY = event.clientY;
		dragOriginX = tx;
		dragOriginY = ty;
		// Do NOT capture here. A captured pointer retargets the following
		// `click` to the capturing viewport element, an ancestor of the plate,
		// so the plate's delegated click listener never sees a plain click and
		// no cell can be selected with a real mouse (scripted `click()` calls
		// bypass this, which is how it slipped past tests). Capture starts only
		// once the pointer really drags (`onPointerMove`).
		dragCaptureEl = event.currentTarget as HTMLElement;
		dragPointerId = event.pointerId;
	}

	function onPointerMove(event: PointerEvent) {
		if (!dragging) return;
		const dx = event.clientX - dragStartX;
		const dy = event.clientY - dragStartY;
		if (!dragMoved && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
			dragMoved = true;
			// A real pan: keep receiving moves even when the pointer leaves the
			// viewport. The trailing click is swallowed below anyway.
			if (dragPointerId !== null) dragCaptureEl?.setPointerCapture?.(dragPointerId);
		}
		tx = dragOriginX + dx;
		ty = dragOriginY + dy;
	}

	function endDrag() {
		dragging = false;
		dragCaptureEl = null;
		dragPointerId = null;
	}

	function swallowClickAfterDrag(event: MouseEvent) {
		if (!dragMoved) return;
		event.stopPropagation();
		event.preventDefault();
		dragMoved = false;
	}

	function onWheel(event: WheelEvent) {
		event.preventDefault();
		zoom = clampZoom(zoom + (event.deltaY > 0 ? -0.1 : 0.1));
	}

	// Pinch zoom: track the two active touch points by identifier and scale
	// against the distance at pinch start. Not device-verified (jsdom has no
	// real touch input) — see the S2 report.
	const pinchPointers = new Map<number, { x: number; y: number }>();
	let pinchStartDistance = 0;
	let pinchStartZoom = 1;

	function pinchDistance(): number {
		const points = Array.from(pinchPointers.values());
		if (points.length < 2) return 0;
		const [a, b] = points as [{ x: number; y: number }, { x: number; y: number }];
		return Math.hypot(a.x - b.x, a.y - b.y);
	}

	function onTouchPointerDown(event: PointerEvent) {
		if (event.pointerType !== "touch") return;
		pinchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
		if (pinchPointers.size === 2) {
			pinchStartDistance = pinchDistance();
			pinchStartZoom = zoom;
			dragging = false;
		}
	}

	function onTouchPointerMove(event: PointerEvent) {
		if (event.pointerType !== "touch" || !pinchPointers.has(event.pointerId)) return;
		pinchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
		if (pinchPointers.size === 2 && pinchStartDistance > 0) {
			zoom = clampZoom(pinchStartZoom * (pinchDistance() / pinchStartDistance));
		}
	}

	function onTouchPointerUp(event: PointerEvent) {
		if (event.pointerType !== "touch") return;
		pinchPointers.delete(event.pointerId);
		pinchStartDistance = 0;
	}

	// Capture phase runs before the click reaches the plate's delegated
	// listener (below), so this stops it from ever activating a cell for a
	// drag's trailing click.
	$effect(() => {
		const el = viewport;
		if (!el) return;
		el.addEventListener("click", swallowClickAfterDrag, true);
		return () => el.removeEventListener("click", swallowClickAfterDrag, true);
	});

	const OWN_CLASS = "sk-battle-map-own";
	const OFFERED_CLASS = "sk-battle-map-offered";
	const SELECTABLE_CLASS = "sk-battle-map-selectable";
	const SELECTED_CLASS = "sk-battle-map-selected";
	const RING_CLASS = "sk-battle-map-ring";
	const TOKENS_CLASS = "sk-battle-map-has-tokens";
	const TOKEN_OVERLAY_CLASS = "sk-battle-map-token-overlay";
	const SVG_NS = "http://www.w3.org/2000/svg";

	// Real cell ids are `<grid>/c_<x>_<y>` (render-svg.ts, confirmed against
	// packages/spellkave-world-map fixtures). Arrow-key roving only turns on
	// when every cell id in this plate matches, so a hand-built or future
	// plate with opaque ids degrades to a plain Tab order instead of a single
	// stop nothing can move away from.
	const COORD_RE = /c_(-?\d+)_(-?\d+)$/;

	function initialsOf(name: string): string {
		const words = name.trim().split(/\s+/).filter(Boolean);
		if (words.length === 0) return "?";
		if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
		return `${words[0]![0]}${words[1]![0]}`.toUpperCase();
	}

	// "Alice" / "Alice and Bob" / "Alice, Bob and Cellar Rat 1" / "Free cell".
	function namesLabel(list: BattleMapToken[]): string {
		const names = list.map((token) => token.name);
		if (names.length === 0) return "Free cell";
		if (names.length === 1) return names[0]!;
		return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
	}

	/**
	 * Tokens draw as SVG elements appended INTO the cell's own `<g
	 * data-node-id>`, not a separately-positioned overlay layer: the plate's
	 * pan/zoom is one CSS transform on the whole `.sk-battle-map-plate` div
	 * (see the template), so anything living inside the plate's own SVG
	 * coordinate space pans and zooms with it exactly, with no separate
	 * position math to keep in sync and no drift.
	 *
	 * Position comes straight off the cell rect's own `x`/`y`/`width`/`height`
	 * attributes (render-svg.ts always writes them as plain numbers), not
	 * `getBBox()` — unlike `PlaceMap`'s place-circle framing, a grid cell's
	 * rect already carries its full box as attributes, so no bbox call (and
	 * no jsdom `getBBox` stub) is needed here.
	 */
	function buildTokenOverlay(rect: SVGGraphicsElement, cellTokens: BattleMapToken[]): SVGGElement {
		const doc = rect.ownerDocument;
		const x = Number(rect.getAttribute("x") ?? 0);
		const y = Number(rect.getAttribute("y") ?? 0);
		const width = Number(rect.getAttribute("width") ?? 0);
		const height = Number(rect.getAttribute("height") ?? 0);
		const shown = cellTokens.slice(0, 3);
		const overflow = cellTokens.length > 3 ? cellTokens.length - 3 : 0;
		const slotCount = shown.length + (overflow > 0 ? 1 : 0);
		const r = Math.min(width, height) * (slotCount <= 1 ? 0.32 : 0.24);
		const cy = y + height / 2;
		const spacing = slotCount > 1 ? (width * 0.6) / (slotCount - 1) : 0;
		const startX = x + width / 2 - (spacing * (slotCount - 1)) / 2;

		const group = doc.createElementNS(SVG_NS, "g");
		group.setAttribute("class", TOKEN_OVERLAY_CLASS);
		group.setAttribute("aria-hidden", "true");

		const addDisc = (cx: number, cls: string, text: string, title?: string, image?: string) => {
			const disc = doc.createElementNS(SVG_NS, "g");
			disc.setAttribute("class", `sk-battle-map-token ${cls}`);
			const circle = doc.createElementNS(SVG_NS, "circle");
			circle.setAttribute("cx", String(cx));
			circle.setAttribute("cy", String(cy));
			circle.setAttribute("r", String(r));
			const label = doc.createElementNS(SVG_NS, "text");
			label.setAttribute("x", String(cx));
			label.setAttribute("y", String(cy + r * 0.35));
			label.setAttribute("class", "sk-battle-map-token-label");
			label.style.fontSize = `${Math.max(r * 0.85, 1)}px`;
			label.textContent = text;
			disc.append(circle, label);
			if (image) {
				// Host-supplied art sits on the disc; the tone stays readable as
				// the disc's rim. A picture that fails to load gives way to the
				// initials underneath.
				const art = doc.createElementNS(SVG_NS, "image");
				const side = r * 1.55;
				art.setAttribute("href", image);
				art.setAttribute("x", String(cx - side / 2));
				art.setAttribute("y", String(cy - side / 2));
				art.setAttribute("width", String(side));
				art.setAttribute("height", String(side));
				art.setAttribute("preserveAspectRatio", "xMidYMid slice");
				art.setAttribute("class", "sk-battle-map-token-art");
				disc.classList.add("sk-battle-map-token--art");
				art.addEventListener("error", () => {
					art.remove();
					disc.classList.remove("sk-battle-map-token--art");
				});
				disc.append(art);
			}
			if (title) {
				const titleEl = doc.createElementNS(SVG_NS, "title");
				titleEl.textContent = title;
				disc.append(titleEl);
			}
			group.append(disc);
		};

		shown.forEach((token, index) => {
			const cx = startX + spacing * index;
			const tone = token.isMe ? "me" : (token.tone ?? "neutral");
			addDisc(cx, `sk-battle-map-token--${tone}`, initialsOf(token.name), token.name, token.image);
		});
		if (overflow > 0) {
			addDisc(startX + spacing * shown.length, "sk-battle-map-token--overflow", `+${overflow}`);
		}
		return group;
	}

	// Plain (non-reactive) bookkeeping the marking effect below rebuilds on
	// every run and the delegated click/keydown listeners (mounted once)
	// read live — the roving-tabindex model needs shared mutable state
	// outside Svelte's reactivity, not more effects.
	let nodesById = new Map<string, SVGGraphicsElement>();
	let coordsByNode = new Map<string, [number, number]>();
	let nodesByCoord = new Map<string, SVGGraphicsElement>();
	let coordsDerivable = false;
	let rovingNodeId: string | null = null;

	// Keyed the same way as `PlaceMap`'s own `travelKey`: a derived string of
	// only the content that should force a re-walk of the plate. An
	// equal-but-new `tokens`/`exits`/`selectableNodeIds` array reference
	// produces an equal string, so the effect below does not re-run for it.
	const markKey = $derived(
		[
			ownNodeId ?? "",
			exits.map((exit) => `${exit.handle}>${exit.toNodeId}>${exit.label}`).join(";"),
			onSelectCell ? 1 : 0,
			selectedNodeId ?? "",
			selectableNodeIds === undefined || selectableNodeIds === "all"
				? "all"
				: selectableNodeIds.join(","),
			(tokens ?? [])
				.map((token) => `${token.nodeId}|${token.actorId}|${token.name}|${token.isMe ? 1 : 0}|${token.tone ?? ""}|${token.image ?? ""}`)
				.join(";"),
		].join("§"),
	);

	$effect(() => {
		const host = plateHost;
		plate; // structural: new plate markup replaces the DOM, always re-walk
		markKey; // content gate: see the comment on its declaration
		if (!host) return;

		const currentOwnNodeId = untrack(() => ownNodeId);
		const currentExits = untrack(() => exits);
		const currentTokens = untrack(() => tokens) ?? [];
		const isSelectionMode = untrack(() => onSelectCell) !== undefined;
		const currentSelectedNodeId = untrack(() => selectedNodeId) ?? null;
		const allow = untrack(() => selectableNodeIds) ?? "all";

		const tokensByNode = new Map<string, BattleMapToken[]>();
		for (const token of currentTokens) {
			const list = tokensByNode.get(token.nodeId) ?? [];
			list.push(token);
			tokensByNode.set(token.nodeId, list);
		}

		const nodes = Array.from(host.querySelectorAll<SVGGraphicsElement>("[data-node-id]"));
		const teardown: Array<() => void> = [];

		// The grid is the frame (`gridViewBox`): the plate arrives composed
		// over its whole parent place. Set on the plate's own `<svg>`, so pan,
		// zoom and "Reset view" all work from "the grid fills the tile".
		const svg = host.querySelector("svg");
		const frame = gridViewBox(
			Array.from(host.querySelectorAll("rect.grid-cell")).map((rect) => ({
				x: Number(rect.getAttribute("x")),
				y: Number(rect.getAttribute("y")),
				width: Number(rect.getAttribute("width")),
				height: Number(rect.getAttribute("height")),
			})),
		);
		if (svg !== null && frame !== null && svg.getAttribute("viewBox") !== frame) svg.setAttribute("viewBox", frame);

		const nextNodesById = new Map<string, SVGGraphicsElement>();
		const nextCoordsByNode = new Map<string, [number, number]>();
		const nextNodesByCoord = new Map<string, SVGGraphicsElement>();
		let allCoordsDerivable = nodes.length > 0;
		const selectableIds: string[] = [];

		for (const node of nodes) {
			const nodeId = node.dataset.nodeId ?? "";
			if (!nodeId) continue;
			nextNodesById.set(nodeId, node);
			const match = COORD_RE.exec(nodeId);
			if (match) {
				const coord: [number, number] = [Number(match[1]), Number(match[2])];
				nextCoordsByNode.set(nodeId, coord);
				nextNodesByCoord.set(`${coord[0]},${coord[1]}`, node);
			} else {
				allCoordsDerivable = false;
			}

			const isOwn = nodeId === currentOwnNodeId;
			if (isOwn) {
				node.classList.add(OWN_CLASS);
				teardown.push(() => node.classList.remove(OWN_CLASS));
			}

			const exit = currentExits.find((candidate) => candidate.toNodeId === nodeId);
			if (exit) {
				node.classList.add(OFFERED_CLASS);
				teardown.push(() => node.classList.remove(OFFERED_CLASS));
			}

			const cellTokens = tokensByNode.get(nodeId) ?? [];
			if (cellTokens.length > 0) {
				node.classList.add(TOKENS_CLASS);
				teardown.push(() => node.classList.remove(TOKENS_CLASS));
				const rect = node.querySelector<SVGGraphicsElement>(".grid-cell");
				if (rect) {
					const overlay = buildTokenOverlay(rect, cellTokens);
					node.appendChild(overlay);
					teardown.push(() => overlay.remove());
				}
			}

			const isSelected =
				isSelectionMode && currentSelectedNodeId !== null && nodeId === currentSelectedNodeId;
			if (isSelected) {
				const shape = node.querySelector<SVGGraphicsElement>(".grid-cell, .place");
				if (shape) {
					// Clone the cell's own shape rather than measuring a bbox: the
					// clone already carries the exact geometry, so outlining it as
					// a stroke-only ring can never drift from the mark it rings.
					const ring = shape.cloneNode(false) as SVGGraphicsElement;
					ring.removeAttribute("class");
					ring.setAttribute("class", RING_CLASS);
					ring.setAttribute("fill", "none");
					node.appendChild(ring);
					teardown.push(() => ring.remove());
				}
				node.classList.add(SELECTED_CLASS);
				teardown.push(() => node.classList.remove(SELECTED_CLASS));
			}

			if (isSelectionMode) {
				const isSelectable = allow === "all" || allow.includes(nodeId);
				if (isSelectable) {
					selectableIds.push(nodeId);
					node.classList.add(SELECTABLE_CLASS);
					node.setAttribute("role", "button");
					node.setAttribute("aria-pressed", isSelected ? "true" : "false");
					const base = isOwn ? "Your cell" : namesLabel(cellTokens);
					node.setAttribute("aria-label", exit ? `${base}, reachable` : base);
					teardown.push(() => {
						node.classList.remove(SELECTABLE_CLASS);
						node.removeAttribute("role");
						node.removeAttribute("aria-pressed");
						node.removeAttribute("aria-label");
						node.removeAttribute("tabindex");
					});
				}
			} else if (exit) {
				// Legacy mode: unchanged from before `onSelectCell` existed.
				node.setAttribute("role", "button");
				node.setAttribute("tabindex", "0");
				node.setAttribute("aria-label", exit.label);
				teardown.push(() => {
					node.removeAttribute("role");
					node.removeAttribute("tabindex");
					node.removeAttribute("aria-label");
				});
			}
		}

		nodesById = nextNodesById;
		coordsByNode = nextCoordsByNode;
		nodesByCoord = nextNodesByCoord;
		coordsDerivable = allCoordsDerivable;

		if (isSelectionMode) {
			if (coordsDerivable && selectableIds.length > 0) {
				const preferred =
					(rovingNodeId && selectableIds.includes(rovingNodeId) && rovingNodeId) ||
					(currentSelectedNodeId && selectableIds.includes(currentSelectedNodeId) && currentSelectedNodeId) ||
					(currentOwnNodeId && selectableIds.includes(currentOwnNodeId) && currentOwnNodeId) ||
					selectableIds[0]!;
				for (const id of selectableIds) {
					nodesById.get(id)?.setAttribute("tabindex", id === preferred ? "0" : "-1");
				}
				rovingNodeId = preferred;
			} else {
				// Ids on this plate don't carry `c_<x>_<y>` coordinates: a single
				// roving stop with no working arrow nav would strand every other
				// cell out of the Tab order, so every selectable cell stays
				// directly tabbable instead.
				for (const id of selectableIds) nodesById.get(id)?.setAttribute("tabindex", "0");
				rovingNodeId = null;
			}
		}

		return () => {
			for (const undo of teardown) undo();
		};
	});

	function matchingExit(nodeId: string) {
		return exits.find((candidate) => candidate.toNodeId === nodeId);
	}

	function isOperable(nodeId: string): boolean {
		if (onSelectCell) {
			const allow = selectableNodeIds ?? "all";
			return allow === "all" || allow.includes(nodeId);
		}
		return matchingExit(nodeId) !== undefined;
	}

	function activate(nodeId: string) {
		if (onSelectCell) {
			onSelectCell(nodeId);
			return;
		}
		const exit = matchingExit(nodeId);
		if (exit) onStep(exit.handle);
	}

	function resolveNode(target: EventTarget | null): SVGGraphicsElement | null {
		return (target as Element | null)?.closest<SVGGraphicsElement>("[data-node-id]") ?? null;
	}

	function setRoving(nodeId: string) {
		if (rovingNodeId && rovingNodeId !== nodeId) {
			nodesById.get(rovingNodeId)?.setAttribute("tabindex", "-1");
		}
		rovingNodeId = nodeId;
		const el = nodesById.get(nodeId);
		if (!el) return;
		el.setAttribute("tabindex", "0");
		el.focus();
	}

	const ARROW_DELTAS: Record<string, [number, number]> = {
		ArrowRight: [1, 0],
		ArrowLeft: [-1, 0],
		ArrowDown: [0, 1],
		ArrowUp: [0, -1],
	};

	// One delegated listener for the whole plate (104+ live cells) rather
	// than a listener per cell. Mounted once against `plateHost`, which is
	// the stable div the `{@html plate}` markup is injected into — its
	// children are replaced on a new plate, but every read below (exits,
	// tokens, selectableNodeIds…) is live, not snapshotted at mount time.
	$effect(() => {
		const host = plateHost;
		if (!host) return;

		function onClick(event: MouseEvent) {
			const node = resolveNode(event.target);
			const nodeId = node?.dataset.nodeId ?? "";
			if (!nodeId || !isOperable(nodeId)) return;
			activate(nodeId);
		}

		function onKeydown(event: KeyboardEvent) {
			const node = resolveNode(event.target);
			if (!node) return;
			const nodeId = node.dataset.nodeId ?? "";
			if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
				if (!nodeId || !isOperable(nodeId)) return;
				event.preventDefault();
				activate(nodeId);
				return;
			}
			if (!onSelectCell || !coordsDerivable) return;
			const delta = ARROW_DELTAS[event.key];
			if (!delta) return;
			const coord = coordsByNode.get(nodeId);
			if (!coord) return;
			const target = nodesByCoord.get(`${coord[0] + delta[0]},${coord[1] + delta[1]}`);
			if (!target) return;
			event.preventDefault();
			setRoving(target.dataset.nodeId ?? "");
		}

		host.addEventListener("click", onClick);
		host.addEventListener("keydown", onKeydown);
		return () => {
			host.removeEventListener("click", onClick);
			host.removeEventListener("keydown", onKeydown);
		};
	});
</script>

<div class="sk-battle-map">
	<div class="sk-battle-map-controls">
		<button
			type="button"
			class="sk-battle-map-reset sk-battle-map-zoom"
			aria-label="Zoom out"
			disabled={zoom <= MIN_ZOOM}
			onclick={() => zoomBy(-ZOOM_STEP)}>−</button
		>
		<button
			type="button"
			class="sk-battle-map-reset sk-battle-map-zoom"
			aria-label="Zoom in"
			disabled={zoom >= MAX_ZOOM}
			onclick={() => zoomBy(ZOOM_STEP)}>+</button
		>
		<button type="button" class="sk-battle-map-reset" onclick={resetView}>Reset view</button>
	</div>
	<div
		class="sk-battle-map-viewport"
		role="group"
		aria-label="Battle map"
		bind:this={viewport}
		onpointerdown={(event) => {
			onTouchPointerDown(event);
			onPointerDown(event);
		}}
		onpointermove={(event) => {
			onTouchPointerMove(event);
			onPointerMove(event);
		}}
		onpointerup={(event) => {
			onTouchPointerUp(event);
			endDrag();
		}}
		onpointercancel={(event) => {
			onTouchPointerUp(event);
			endDrag();
		}}
		onwheel={onWheel}
	>
		<div
			class="sk-battle-map-plate"
			bind:this={plateHost}
			style="transform: translate({tx}px, {ty}px) scale({zoom});"
		>
			<!-- The host sanitised this markup (sanitiseSvg) before handing it over. -->
			{@html plate}
		</div>
	</div>
	{#if refusal}
		<p class="sk-battle-map-refusal" role="status">{refusal}</p>
	{/if}
</div>

<style>
	.sk-battle-map {
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 0;
	}

	.sk-battle-map-controls {
		display: flex;
		justify-content: flex-end;
		gap: 0.25rem;
		flex-shrink: 0;
	}

	.sk-battle-map-zoom {
		min-width: 1.75rem;
		font-weight: 600;
		line-height: 1.2;
	}

	.sk-battle-map-zoom:disabled {
		color: var(--muted-foreground);
		cursor: default;
	}

	.sk-battle-map-reset {
		font-size: 0.75rem;
		padding: 0.125rem 0.5rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background-color: var(--background);
	}

	/* The plate must never grow the widget's own box, at any zoom: the
	   viewport clips regardless of the inner transform scale. */
	.sk-battle-map-viewport {
		position: relative;
		flex: 1 1 0;
		min-height: 0;
		overflow: hidden;
		touch-action: none;
		cursor: grab;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background-color: var(--background);
	}

	.sk-battle-map-plate {
		width: 100%;
		height: 100%;
		transform-origin: center center;
	}

	.sk-battle-map-plate :global(svg) {
		display: block;
		width: 100%;
		height: 100%;
	}

	.sk-battle-map-plate :global([data-node-id]) {
		outline-offset: 2px;
	}

	.sk-battle-map-plate :global(.sk-battle-map-own .grid-cell),
	.sk-battle-map-plate :global(.sk-battle-map-own .place) {
		stroke: var(--primary);
		stroke-width: 3px;
	}

	.sk-battle-map-plate :global(.sk-battle-map-offered) {
		cursor: pointer;
	}

	/* A quiet tint: the ring (below) is the strong signal, this only says
	   "a step could land here". */
	.sk-battle-map-plate :global(.sk-battle-map-offered .grid-cell) {
		fill: var(--primary);
		fill-opacity: 0.16;
	}

	.sk-battle-map-plate :global(.sk-battle-map-selectable) {
		cursor: pointer;
	}

	.sk-battle-map-plate :global(.sk-battle-map-selectable:focus-visible),
	.sk-battle-map-plate :global(.sk-battle-map-offered:focus-visible) {
		outline: 2px solid var(--ring);
	}

	.sk-battle-map-plate :global(.sk-battle-map-ring) {
		stroke: var(--ring);
		stroke-width: 3px;
		pointer-events: none;
	}

	/* A cell with overlay tokens never also shows the plate's own anonymous
	   count badge — one or the other, never "1" plus a disc. */
	.sk-battle-map-plate :global(.sk-battle-map-has-tokens .actor),
	.sk-battle-map-plate :global(.sk-battle-map-has-tokens .actor-label) {
		display: none;
	}

	.sk-battle-map-plate :global(.sk-battle-map-token-overlay) {
		pointer-events: none;
	}

	.sk-battle-map-plate :global(.sk-battle-map-token circle) {
		stroke: var(--background);
		stroke-width: 1.5px;
	}

	.sk-battle-map-plate :global(.sk-battle-map-token--me circle) {
		fill: var(--primary);
	}

	.sk-battle-map-plate :global(.sk-battle-map-token--ally circle) {
		fill: var(--accent);
	}

	.sk-battle-map-plate :global(.sk-battle-map-token--foe circle) {
		fill: var(--destructive);
	}

	.sk-battle-map-plate :global(.sk-battle-map-token--neutral circle),
	.sk-battle-map-plate :global(.sk-battle-map-token--overflow circle) {
		fill: var(--muted-foreground);
	}

	.sk-battle-map-plate :global(.sk-battle-map-token-label) {
		fill: var(--background);
		font-weight: 700;
		text-anchor: middle;
		pointer-events: none;
	}

	.sk-battle-map-plate :global(.sk-battle-map-token-art) {
		clip-path: circle(50%);
		transform-box: fill-box;
		pointer-events: none;
	}

	.sk-battle-map-plate :global(.sk-battle-map-token--art .sk-battle-map-token-label) {
		display: none;
	}

	.sk-battle-map-refusal {
		margin: 0.375rem 0 0;
		font-size: 0.8125rem;
		color: var(--destructive);
	}
</style>
