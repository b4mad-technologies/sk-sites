<script lang="ts">
	import { getPoiGlyphSvg, POI_DEFAULT_COLORS, renderPoiPinSvg } from "./poi-icons";

	interface Props {
		open?: boolean;
		rightOffset?: number;
		onToggle?: (open: boolean) => void;
	}

	let { open = $bindable(false), rightOffset = 230, onToggle }: Props = $props();

	function toggle(): void {
		open = !open;
		onToggle?.(open);
	}
</script>

<div class="map-legend-root" data-testid="map-legend" style="right: {rightOffset}px;">
	{#if !open}
		<button
			type="button"
			class="legend-toggle-btn"
			onclick={toggle}
			title="Show map legend"
			aria-label="Show map legend"
			aria-expanded="false"
		>
			<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<polygon points="12 2 2 7 12 12 22 7 12 2" />
				<polyline points="2 17 12 22 22 17" />
				<polyline points="2 12 12 17 22 12" />
			</svg>
			<span class="btn-text">Legend</span>
		</button>
	{:else}
		<div class="legend-panel" role="region" aria-label="Map Legend">
			<div class="legend-header">
				<div class="header-title">
					<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<polygon points="12 2 2 7 12 12 22 7 12 2" />
						<polyline points="2 17 12 22 22 17" />
						<polyline points="2 12 12 17 22 12" />
					</svg>
					<span>Map Legend</span>
				</div>
				<button
					type="button"
					class="close-btn"
					onclick={toggle}
					title="Close legend"
					aria-label="Close legend"
				>
					✕
				</button>
			</div>

			<div class="legend-body">
				<!-- Places & Waypoints -->
				<div class="legend-section">
					<div class="section-title">Places & Waypoints</div>
					<div class="legend-grid">
						<div class="legend-item">
							<span class="circle-swatch node"></span>
							<div class="item-desc">
								<strong>Place / Waypoint</strong>
								<small>Standard map location</small>
							</div>
						</div>
						<div class="legend-item">
							<span class="circle-swatch node-selected"></span>
							<div class="item-desc">
								<strong>Selected Place</strong>
								<small>Active selection focus</small>
							</div>
						</div>
						<div class="legend-item">
							<span class="circle-swatch entrance"></span>
							<div class="item-desc">
								<strong>Entrance / Anchor</strong>
								<small>Building or dungeon threshold</small>
							</div>
						</div>
					</div>
				</div>

				<!-- Points of Interest (maps.poi) -->
				<div class="legend-section">
					<div class="section-title">Points of Interest (maps.poi)</div>
					<div class="legend-grid">
						<div class="legend-item">
							<span class="poi-pin-preview">
								{@html renderPoiPinSvg("camp")}
							</span>
							<div class="item-desc">
								<strong>Camp / Outpost</strong>
								<small>Settlement & field base</small>
							</div>
						</div>
						<div class="legend-item">
							<span class="poi-pin-preview">
								{@html renderPoiPinSvg("inn")}
							</span>
							<div class="item-desc">
								<strong>Inn / Tavern</strong>
								<small>Rest & gathering</small>
							</div>
						</div>
						<div class="legend-item">
							<span class="poi-pin-preview">
								{@html renderPoiPinSvg("portal")}
							</span>
							<div class="item-desc">
								<strong>Portal / Transit</strong>
								<small>Gateway & crossroads</small>
							</div>
						</div>
						<div class="legend-item">
							<span class="poi-pin-preview">
								{@html renderPoiPinSvg("crypt")}
							</span>
							<div class="item-desc">
								<strong>Crypt / Dungeon</strong>
								<small>Hostile interior & tomb</small>
							</div>
						</div>
						<div class="legend-item">
							<span class="poi-pin-preview">
								{@html renderPoiPinSvg("temple")}
							</span>
							<div class="item-desc">
								<strong>Shrine / Temple</strong>
								<small>Sacred & altar site</small>
							</div>
						</div>
						<div class="legend-item">
							<span class="poi-pin-preview">
								{@html renderPoiPinSvg("cave")}
							</span>
							<div class="item-desc">
								<strong>Cave / Mine</strong>
								<small>Cavern or mine adit</small>
							</div>
						</div>
						<div class="legend-item">
							<span class="poi-pin-preview">
								{@html renderPoiPinSvg("well")}
							</span>
							<div class="item-desc">
								<strong>Well / Water</strong>
								<small>Water source or passage</small>
							</div>
						</div>
						<div class="legend-item">
							<span class="poi-pin-preview">
								{@html renderPoiPinSvg("shop")}
							</span>
							<div class="item-desc">
								<strong>Shop / Market</strong>
								<small>Trade & supplies</small>
							</div>
						</div>
						<div class="legend-item">
							<span class="poi-pin-preview">
								{@html renderPoiPinSvg("danger")}
							</span>
							<div class="item-desc">
								<strong>Hazard / Danger</strong>
								<small>High threat zone</small>
							</div>
						</div>
					</div>
				</div>

				<!-- Structural Elements -->
				<div class="legend-section">
					<div class="section-title">Structures & Connections</div>
					<div class="legend-grid">
						<div class="legend-item">
							<span class="line-swatch corridor"></span>
							<div class="item-desc">
								<strong>Corridor / Path</strong>
								<small>Standard connection</small>
							</div>
						</div>
						<div class="legend-item">
							<span class="line-swatch steps"></span>
							<div class="item-desc">
								<strong>Stairs / Steps</strong>
								<small>Elevation change</small>
							</div>
						</div>
						<div class="legend-item">
							<span class="line-swatch flight"></span>
							<div class="item-desc">
								<strong>Flight Path</strong>
								<small>Aerial traversal</small>
							</div>
						</div>
						<div class="legend-item">
							<span class="line-swatch swim"></span>
							<div class="item-desc">
								<strong>Swim Route</strong>
								<small>Waterway / aquatic passage</small>
							</div>
						</div>
						<div class="legend-item">
							<span class="line-swatch barrier"></span>
							<div class="item-desc">
								<strong>Sealed Barrier</strong>
								<small>Locked / gated threshold</small>
							</div>
						</div>
						<div class="legend-item">
							<span class="circle-swatch door"></span>
							<div class="item-desc">
								<strong>Door / Portal</strong>
								<small>Substrate or room boundary</small>
							</div>
						</div>
						<div class="legend-item">
							<span class="polygon-swatch room"></span>
							<div class="item-desc">
								<strong>Room Extent</strong>
								<small>Enclosed spatial bounds</small>
							</div>
						</div>
						<div class="legend-item">
							<span class="polygon-swatch water"></span>
							<div class="item-desc">
								<strong>Water Body</strong>
								<small>River, lake, or pool</small>
							</div>
						</div>
						<div class="legend-item">
							<span class="polygon-swatch hazard"></span>
							<div class="item-desc">
								<strong>Hazard Pool</strong>
								<small>Slime, acid, or lava</small>
							</div>
						</div>
						<div class="legend-item">
							<span class="polygon-swatch difficult"></span>
							<div class="item-desc">
								<strong>Difficult Terrain</strong>
								<small>Hindered movement</small>
							</div>
						</div>
					</div>
				</div>

				<!-- Entities & Occupants -->
				<div class="legend-section">
					<div class="section-title">Entities & Occupants</div>
					<div class="legend-grid">
						<div class="legend-item">
							<span class="circle-swatch seat"></span>
							<div class="item-desc">
								<strong>Player Seat</strong>
								<small>Active participant position</small>
							</div>
						</div>
						<div class="legend-item">
							<span class="circle-swatch actor"></span>
							<div class="item-desc">
								<strong>Actors / People</strong>
								<small>Occupants present</small>
							</div>
						</div>
						<div class="legend-item">
							<span class="circle-swatch thing"></span>
							<div class="item-desc">
								<strong>Items / Things</strong>
								<small>Visible world objects</small>
							</div>
						</div>
					</div>
				</div>

				<!-- Substrates & Floors -->
				<div class="legend-section">
					<div class="section-title">Substrates & Floors</div>
					<div class="legend-grid">
						<div class="legend-item">
							<span class="symbol-badge outdoor">🌳</span>
							<div class="item-desc">
								<strong>Outdoor</strong>
								<small>World surface & terrain</small>
							</div>
						</div>
						<div class="legend-item">
							<span class="symbol-badge indoor">🏰</span>
							<div class="item-desc">
								<strong>Indoor</strong>
								<small>Rooms, corridors & dungeons</small>
							</div>
						</div>
						<div class="legend-item">
							<span class="symbol-badge tactical">⚔️</span>
							<div class="item-desc">
								<strong>Tactical</strong>
								<small>Combat grid & battle encounters</small>
							</div>
						</div>
						<div class="legend-item">
							<span class="symbol-badge floor">0 / -1</span>
							<div class="item-desc">
								<strong>Floors</strong>
								<small>0 = Surface, -1 = Underground</small>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.map-legend-root {
		position: absolute;
		bottom: calc(0.35rem + env(safe-area-inset-bottom, 0px));
		right: 230px;
		z-index: 10;
		font-family: var(--font-sans, system-ui, -apple-system, sans-serif);
		pointer-events: auto;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
	}

	.legend-toggle-btn {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		height: 22px;
		padding: 0 8px;
		background: rgba(15, 23, 42, 0.88);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		border: 1px solid rgba(148, 163, 184, 0.25);
		border-radius: 4px;
		color: #f1faee;
		font-size: 11px;
		font-weight: 500;
		cursor: pointer;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
		transition: all 0.15s ease;
	}

	.legend-toggle-btn:hover {
		background: rgba(30, 41, 59, 0.95);
		border-color: rgba(244, 162, 97, 0.5);
		color: #ffffff;
		transform: translateY(-1px);
	}

	.legend-panel {
		position: absolute;
		bottom: 0;
		right: 0;
		width: 350px;
		max-height: min(650px, calc(100vh - 70px));
		background: rgba(15, 23, 42, 0.94);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid rgba(148, 163, 184, 0.25);
		border-radius: 12px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
		overflow: hidden;
		display: flex;
		flex-direction: column;
		color: #f1faee;
	}

	.legend-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 14px;
		border-bottom: 1px solid rgba(148, 163, 184, 0.15);
		background: rgba(30, 41, 59, 0.5);
	}

	.header-title {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		font-weight: 600;
		color: #ffffff;
	}

	.close-btn {
		background: none;
		border: none;
		color: #94a3b8;
		font-size: 14px;
		cursor: pointer;
		padding: 2px 6px;
		border-radius: 4px;
		transition: all 0.15s ease;
	}

	.close-btn:hover {
		color: #ffffff;
		background: rgba(255, 255, 255, 0.1);
	}

	.legend-body {
		padding: 12px 14px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 14px;
		scrollbar-width: thin;
		scrollbar-color: rgba(148, 163, 184, 0.4) transparent;
	}

	.legend-body::-webkit-scrollbar {
		width: 6px;
	}

	.legend-body::-webkit-scrollbar-thumb {
		background: rgba(148, 163, 184, 0.4);
		border-radius: 3px;
	}

	.legend-section {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.section-title {
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #94a3b8;
	}

	.legend-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.item-desc {
		display: flex;
		flex-direction: column;
		line-height: 1.2;
	}

	.item-desc strong {
		font-size: 11px;
		color: #f1faee;
	}

	.item-desc small {
		font-size: 10px;
		color: #94a3b8;
	}

	.symbol-badge {
		width: 24px;
		height: 24px;
		border-radius: 6px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-size: 12px;
		flex-shrink: 0;
	}

	.symbol-badge.outdoor {
		background: rgba(16, 185, 129, 0.2);
		border: 1px solid rgba(16, 185, 129, 0.4);
	}

	.symbol-badge.indoor {
		background: rgba(99, 102, 241, 0.2);
		border: 1px solid rgba(99, 102, 241, 0.4);
	}

	.symbol-badge.tactical {
		background: rgba(225, 29, 72, 0.2);
		border: 1px solid rgba(225, 29, 72, 0.4);
	}

	.symbol-badge.floor {
		background: rgba(244, 162, 97, 0.2);
		border: 1px solid rgba(244, 162, 97, 0.4);
		font-size: 10px;
		font-weight: 700;
		color: #f4a261;
	}

	.line-swatch {
		width: 24px;
		height: 4px;
		border-radius: 2px;
		flex-shrink: 0;
	}

	.line-swatch.corridor {
		background: #8d99ae;
	}

	.line-swatch.steps {
		background: repeating-linear-gradient(90deg, #f4a261 0, #f4a261 4px, transparent 4px, transparent 7px);
		height: 3px;
	}

	.line-swatch.flight {
		background: repeating-linear-gradient(90deg, #c084fc 0, #c084fc 4px, transparent 4px, transparent 8px);
		height: 3px;
	}

	.line-swatch.swim {
		background: repeating-linear-gradient(90deg, #0284c7 0, #0284c7 5px, transparent 5px, transparent 8px);
		height: 3px;
	}

	.line-swatch.barrier {
		background: repeating-linear-gradient(90deg, #ef4444 0, #ef4444 3px, transparent 3px, transparent 6px);
		height: 4px;
	}

	.circle-swatch {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		flex-shrink: 0;
		box-sizing: border-box;
	}

	.circle-swatch.node {
		background: #f1faee;
		border: 1.5px solid #1d3557;
	}

	.circle-swatch.node-selected {
		background: #f4a261;
		border: 2px solid #edf2f4;
		box-shadow: 0 0 0 2px rgba(244, 162, 97, 0.4);
	}

	.circle-swatch.entrance {
		background: #e76f51;
		border: 1.5px solid #1d3557;
	}

	.circle-swatch.door {
		background: #e63946;
		border: 1.5px solid #f1faee;
	}

	.circle-swatch.seat {
		background: #38bdf8;
		border: 2px solid #ffffff;
		box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.4);
	}

	.circle-swatch.actor {
		background: #ee6c4d;
		border: 1.5px solid #ffffff;
	}

	.circle-swatch.thing {
		background: #14b8a6;
		border: 1.5px solid #ffffff;
	}

	.polygon-swatch {
		width: 22px;
		height: 14px;
		border-radius: 3px;
		flex-shrink: 0;
	}

	.polygon-swatch.room {
		background: rgba(152, 193, 217, 0.35);
		border: 1.5px solid #cce3de;
	}

	.polygon-swatch.water {
		background: rgba(2, 132, 199, 0.5);
		border: 1.5px solid #38bdf8;
	}

	.polygon-swatch.hazard {
		background: rgba(16, 185, 129, 0.55);
		border: 1.5px solid #ef4444;
	}

	.polygon-swatch.difficult {
		background: rgba(217, 119, 6, 0.4);
		border: 1.5px solid #f59e0b;
	}


	.poi-pin-preview {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 26px;
		flex-shrink: 0;
	}

	.poi-pin-preview :global(svg) {
		width: 20px;
		height: 24px;
		overflow: visible;
	}
</style>
