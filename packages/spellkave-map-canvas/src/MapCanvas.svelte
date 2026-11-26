<script lang="ts">
	import { Button, Input } from "@spellkave/ui";
	import { CopyLocator, HitList, HoverCard, PlaceInspect } from "@spellkave/ui-widgets";
	import type * as maplibregl from "maplibre-gl";
	import type { MapLayerMouseEvent, Map as MapLibreMap } from "maplibre-gl";
	import { mount, onDestroy, unmount, untrack } from "svelte";
	import { applyPlaceSelection } from "./feature-state";
	import {
		authFetch,
		backdropsUrl,
		createTransformRequest,
		interpreterUrl,
		styleUrl,
		tilesJsonUrl,
	} from "./gateway";
	import {
		buildLevelFilter,
		buildPlaceViewFilter,
		floorForPlace,
		LEVEL_LAYERS,
		parseLevelsFromTileJson,
		type SubstrateFilter,
		shouldShowFloorItem,
		sortLevelsHighToLow,
	} from "./level-filter";
	import {
		buildMapsLocator,
		copyText,
		MAPS_LOCATOR_EVENT,
		type MapsResourceKind,
		parseMapsLocator,
		publishMapsLocator,
	} from "./locator";
	import MapLegend from "./MapLegend.svelte";
	import { blocked, failed, loading, type MapNotice, noArt, noticeText, readLoadedFlag, ready } from "./map-notice";
	import {
		boundsFromGeometry,
		DEFAULT_PLACE_HALF_M,
		extentHalfMetersFromRows,
		formatPlaceExtent,
		framePaddingPx,
		geometryArea,
		hoverCardFromProperties,
		humanizePlaceRef,
		indoorGraphFromPlace,
		lngLatBox,
		MAPS_RAIL_LEFT_PX,
		nextOverlapIndex,
		nodeIdFromProperties,
		PLACE_FOCUS_ZOOM,
		type Place,
		type PlaceRow,
		placeFromHit,
		placeFromProperties,
		splitPlaceRows,
		uniqueByNodeIdSmallest,
	} from "./place";
	import { registerPoiImages, setupPoiMissingImageHandler } from "./poi-icons";
	import { prepareSatellite, setSatelliteVisibility } from "./satellite";
	import {
		type BBox,
		buildNameSearchQuery,
		buildNodeIdQuery,
		buildPlaceNeighborhoodQuery,
		mergeOsmPlaceHits,
		mergeSearchHits,
		nextResultIndex,
		occupancyNameHits,
		type PlaceExit,
		placeExitsFromHits,
		runOverpass,
		type SearchHit,
		type SearchKind,
		searchHitMeta,
		thingNameHits,
	} from "./search";
	import {
		type OccupancyPlace,
		placeNodeForEntities,
		resolveSeatFlyTarget,
		type SeatFlyTarget,
	} from "./seat-location";
	import { isBackdropAssetError, stripBackdrops } from "./style-art";
	import type { MapCanvasProps } from "./types";

	let {
		gatewayOrigin,
		slug,
		token,
		mode,
		placeNodeId,
		navigationPosition = "top-right",
		chrome = "stacked",
		openRail = false,
		railExtra,
		drawerExtra,
		drawerOpen = false,
		drawerPlaceMode = false,
		onDrawerClose,
		onPlaceDetails,
		indoorEmphasis = true,
		satellite = true,
		onSatelliteAvailability,
		overlay = false,
		onPlaceClick,
		onPlaceClear,
		placeDetails,
		notices,
		onNotice,
		minePlaces = [],
		mineEntityIds = [],
		occupancyPlaces = [],
		thingPlaces = [],
		onActorClick,
		onDrawableNodes,
		substrate = "all",
		onSubstrateChange,
		substrateControl = false,
		followPlace = false,
		children,
	}: MapCanvasProps = $props();

	/** Layers a person can click or hover to pick a place. */
	const PICKABLE_LAYERS = ["poi-symbol", "node-circle", "node-label", "room-fill"] as const;

	let container: HTMLDivElement | undefined = $state();
	let map: MapLibreMap | null = null;
	let satelliteAvailable = $state<boolean | null>(null);
	$effect(() => {
		const callback = onSatelliteAvailability;
		const available = satelliteAvailable;
		if (available !== null) {
			untrack(() => callback?.(available));
		}
	});
	$effect(() => {
		setSatelliteVisibility(map, satellite);
	});
	/** Loaded on first mount effect run — never imported at module top level. */
	let MapLibre: typeof maplibregl | null = null;
	let seatMarker: maplibregl.Marker | null = null;
	type FloorMarkerEntry = {
		marker: maplibregl.Marker;
		placeNodeId: string;
		level: string | null;
		graph: string | null;
		indoor: boolean;
		substrate?: string | null;
		hit?: SearchHit;
	};
	let occupancyMarkers: FloorMarkerEntry[] = [];
	let thingMarkers: FloorMarkerEntry[] = [];
	const targetCache = new Map<string, SeatFlyTarget>();
	const occupancyCoords = new Map<string, { lon: number; lat: number }>();
	let selectedFeatureId: string | null = null;
	let hoverPopup: maplibregl.Popup | null = null;
	let hoverUi: ReturnType<typeof mount> | null = null;
	let notice = $state<MapNotice>(loading());
	$effect(() => {
		const current = notice;
		const callback = onNotice;
		untrack(() => callback?.(current));
	});
	let levels = $state<string[]>([]);
	const stackedLevels = $derived(sortLevelsHighToLow(levels));
	let activeLevel = $state("all");
	let activeSubstrate = $state<SubstrateFilter>("all");
	$effect(() => {
		if (substrate !== activeSubstrate) {
			activeSubstrate = substrate;
			applyLevel(activeLevel);
		}
	});
	let legendOpen = $state(false);
	let legendRightOffset = $state(230);
	let searchText = $state("");
	let searchKind = $state<SearchKind | "all">("all");
	let searchHits = $state<SearchHit[]>([]);
	let followEntityId = $state<string | null>(null);
	let railCollapsed = $state(false);
	let searchError = $state<string | null>(null);
	let searchTimer: ReturnType<typeof setTimeout> | null = null;
	let place = $state<Place | null>(null);
	let placeExits = $state<PlaceExit[]>([]);
	let stackedPlaces = $state<{ nodeId: string; name: string }[]>([]);
	const placeRows = $derived(place === null ? null : splitPlaceRows(place.rows));
	const placeLocator = $derived(
		place?.nodeId && typeof window !== "undefined"
			? buildMapsLocator(window.location.href, slug, "place", place.nodeId)
			: "",
	);
	let lastSeatNode: string | null = null;
	/**
	 * With `followPlace` the linked place (`placeNodeId`) owns the camera: it
	 * flies on boot and on every later change of the prop, and the seat marker
	 * never flies while a place is linked (sk-jay0.1.8.100 s6), so the two
	 * never start competing flights. Without `followPlace` the prop is read on
	 * boot only and the seat flies as it always did (apps/maps).
	 * `followedPlace` is the last prop value handled, whatever the canvas has
	 * selected since; `linkRequest` drops a place lookup that a newer one
	 * or a search pick by the player overtook.
	 */
	let linkReady = false;
	let followedPlace: string | null = null;
	let linkRequest = 0;
	let lastSeatKey = "";
	let lastSeatTarget: SeatFlyTarget | null = null;
	const mySeatNode = $derived(placeNodeForEntities(minePlaces, mineEntityIds));
	const mapsRailOpen = $derived(
		chrome === "maps" &&
			!railCollapsed &&
			(openRail || place !== null || searchHits.length > 0 || searchKind !== "all"),
	);

	function rememberResource(kind: MapsResourceKind, id: string): void {
		if (id === "" || typeof window === "undefined") return;
		const loc = parseMapsLocator(window.location.href);
		if (loc.world === slug && loc[kind] === id) return;
		publishMapsLocator(slug, kind, id);
	}


	/**
	 * maplibre-gl (~207 KB gzipped) is a peer dependency, loaded together with
	 * its stylesheet only when a canvas actually mounts — a consumer that never
	 * opens the map never downloads it.
	 */
	async function loadMapLibre(): Promise<typeof maplibregl> {
		const [mod, worker] = await Promise.all([
			import("maplibre-gl"),
			import("maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url"),
			import("maplibre-gl/dist/maplibre-gl.css"),
		]);
		// Bundle the worker and its shared ESM imports for both Vite dev and build.
		mod.setWorkerUrl(worker.default);
		return mod;
	}

	function zoomIn(): void {
		map?.zoomIn();
	}

	function zoomOut(): void {
		map?.zoomOut();
	}

	function resetNorth(): void {
		map?.resetNorthPitch();
	}

	function refreshFloorItemVisibility(): void {
		const indoorGraph = chrome === "maps" ? indoorGraphFromPlace(place) : null;
		for (const entry of occupancyMarkers) {
			const show = shouldShowFloorItem(entry, activeLevel, indoorGraph, activeSubstrate);
			entry.marker.getElement().style.display = show ? "block" : "none";
		}
		for (const entry of thingMarkers) {
			const show = shouldShowFloorItem(entry, activeLevel, indoorGraph, activeSubstrate);
			entry.marker.getElement().style.display = show ? "block" : "none";
		}
		if (seatMarker !== null && lastSeatTarget !== null) {
			// Only the maps chrome filters the caller's own marker by floor; every
			// other consumer always shows it (sk-jay0.1.8.100: selecting a place
			// on another floor must not hide where the hero stands).
			const show =
				chrome !== "maps" ||
				shouldShowFloorItem(lastSeatTarget, activeLevel, indoorGraph, activeSubstrate);
			seatMarker.getElement().style.display = show ? "block" : "none";
		}
	}

	function applySubstrate(s: SubstrateFilter): void {
		activeSubstrate = s;
		onSubstrateChange?.(s);
		applyLevel(activeLevel);
	}

	function applyLevel(level: string): void {
		activeLevel = level;
		if (map === null) return;
		const indoorGraph = chrome === "maps" ? indoorGraphFromPlace(place) : null;
		for (const id of LEVEL_LAYERS) {
			if (!map.getLayer(id)) continue;
			const filter =
				chrome === "maps"
					? buildPlaceViewFilter(id, { level, indoorGraph, substrate: activeSubstrate })
					: buildLevelFilter(id, level);
			map.setFilter(id, filter as never);
		}
		if (chrome === "maps" && map.getLayer("building-fill")) {
			map.setLayoutProperty("building-fill", "visibility", "none");
		}
		const style =
			typeof map.getStyle === "function" ? map.getStyle() : undefined;
		const meta = (style?.metadata ?? {}) as {
			"spellkave:backdrops"?: Array<{ layer: string; graph: string; indoor: boolean }>;
			"spellkave:indoor_backdrops"?: Array<{ layer: string; graph: string }>;
		};
		const sheets =
			meta["spellkave:backdrops"] ??
			(meta["spellkave:indoor_backdrops"] ?? []).map((row) => ({
				...row,
				indoor: true,
			}));
		for (const row of sheets) {
			if (!map.getLayer(row.layer)) continue;
			const on = chrome === "maps" ? false : !row.indoor;
			map.setLayoutProperty(row.layer, "visibility", on ? "visible" : "none");
		}
		refreshFloorItemVisibility();
	}

	$effect(() => {
		if (chrome === "maps" && indoorEmphasis === false) applyLevel("all");
	});

	function currentBbox(): BBox {
		if (map === null) {
			return { west: -180, south: -85, east: 180, north: 85 };
		}
		const b = map.getBounds();
		return {
			west: b.getWest(),
			south: b.getSouth(),
			east: b.getEast(),
			north: b.getNorth(),
		};
	}

	const CANNED: Record<SearchKind, string> = {
		person: "People",
		thing: "Things",
		place: "Places",
	};

	function cannedQuery(kind: SearchKind | "all", text: string): boolean {
		if (kind === "all") return false;
		const q = text.trim();
		return q === "" || q.toLowerCase() === CANNED[kind].toLowerCase();
	}

	function inhabitedPlaceHits(): SearchHit[] {
		const seen = new Set<string>();
		const out: SearchHit[] = [];
		const rows = [
			...occupancyPlaces.map((row) => ({ node: row.placeNodeId, name: row.placeNodeId })),
			...thingPlaces.map((row) => ({ node: row.placeNodeId, name: row.placeNodeId })),
		];
		for (const row of rows) {
			if (row.node === "" || seen.has(row.node)) continue;
			seen.add(row.node);
			const pos = occupancyCoords.get(row.node) ?? { lon: 0, lat: 0 };
			const leaf = row.node.split("/").pop() ?? row.node;
			const name = leaf.replaceAll("_", " ");
			out.push({
				id: `place:${row.node}`,
				osmType: "node",
				name: name.charAt(0).toUpperCase() + name.slice(1),
				graph: row.node,
				lon: pos.lon,
				lat: pos.lat,
				tags: { name, "spellkave:node_id": row.node },
				kind: "place",
			});
		}
		return out;
	}

	function scheduleSearch(text: string): void {
		if (searchTimer !== null) clearTimeout(searchTimer);
		searchText = text;
		const q = text.trim();
		if (!cannedQuery(searchKind, q)) searchKind = "all";
		if (q.length < 2 && !cannedQuery(searchKind, q)) {
			searchHits = [];
			railCollapsed = false;
			searchError = null;
			return;
		}
		searchTimer = setTimeout(() => {
			void runSearch(q);
		}, 300);
	}

	function setSearchKind(kind: SearchKind): void {
		searchKind = kind;
		searchText = CANNED[kind];
		place = null;
		followEntityId = null;
		searchHits = [];
		railCollapsed = false;
		hideHover();
		void runSearch(CANNED[kind]);
	}

	async function runSearch(text: string): Promise<void> {
		searchError = null;
		const canned = cannedQuery(searchKind, text);
		const q = canned ? "" : text.trim();
		if (q.length < 2 && !canned) {
			searchHits = [];
			return;
		}
		let places: SearchHit[] = [];
		if (canned && searchKind === "place") {
			places = inhabitedPlaceHits();
		} else if ((searchKind === "all" || searchKind === "place") && q.length >= 2) {
			try {
				places = await runOverpass(
					interpreterUrl(gatewayOrigin, slug),
					buildNameSearchQuery(q, currentBbox()),
					token,
				);
			} catch (cause) {
				searchError = cause instanceof Error ? cause.message : String(cause);
			}
		}
		const placeNameByNode = new Map<string, string>();
		for (const hit of places) {
			const node = hit.tags["spellkave:node_id"]?.trim() ?? "";
			if (node !== "" && hit.name.trim() !== "") placeNameByNode.set(node, hit.name);
		}
		const people =
			searchKind === "all" || searchKind === "person"
				? occupancyNameHits(q, occupancyPlaces, occupancyCoords, placeNameByNode, canned && searchKind === "person")
				: [];
		const things =
			searchKind === "all" || searchKind === "thing"
				? thingNameHits(q, thingPlaces, occupancyCoords, canned && searchKind === "thing")
				: [];
		searchHits = mergeSearchHits(people, places, canned ? 80 : 20, things);
		railCollapsed = false;
	}

	async function resolveHitCoords(hit: SearchHit): Promise<{ lon: number; lat: number }> {
		if (!(hit.lon === 0 && hit.lat === 0) || !hit.tags["spellkave:node_id"]) {
			return { lon: hit.lon, lat: hit.lat };
		}
		try {
			const target = await resolveSeatFlyTarget(
				interpreterUrl(gatewayOrigin, slug),
				token,
				hit.tags["spellkave:node_id"],
			);
			if (target !== null) return { lon: target.lon, lat: target.lat };
		} catch {
			/* fly-to is best-effort */
		}
		return { lon: hit.lon, lat: hit.lat };
	}

	async function selectSearchHit(hit: SearchHit): Promise<void> {
		// The player's pick outranks a link lookup still in flight.
		linkRequest += 1;
		const coords = await resolveHitCoords(hit);
		if (hit.kind === "thing") {
			const where = hit.placeName?.trim() ?? "";
			selectPlace(
				{
					name: hit.name,
					nodeId: hit.tags["spellkave:node_id"] || null,
					lon: coords.lon,
					lat: coords.lat,
					rows: [
						{ key: "kind", value: "Thing" },
						...(where !== "" ? [{ key: "where", value: where }] : []),
						...(hit.tags["spellkave:node_id"]
							? [{ key: "place", value: hit.tags["spellkave:node_id"] }]
							: []),
					],
				},
				true,
			);
			if (hit.entityId) rememberResource("thing", hit.entityId);
			return;
		}
		if (hit.kind === "person") {
			const holderId = hit.tags["spellkave:holder_id"] ?? "";
			const row = occupancyPlaces.find(
				(place) =>
					place.entityId === hit.entityId || (holderId !== "" && place.entityId === holderId),
			);
			place = null;
			searchText = hit.name;
			searchHits = [];
			railCollapsed = false;
			followEntityId = hit.entityId ?? null;
			hideHover();
			if (hit.entityId) rememberResource("person", hit.entityId);
			if (row !== undefined) onActorClick?.(row);
			if (map === null) return;
			if (coords.lon === 0 && coords.lat === 0) return;
			frameOnMap(coords.lon, coords.lat, []);
			return;
		}
		selectPlace(placeFromHit({ ...hit, lon: coords.lon, lat: coords.lat }), true);
		if (hit.tags["spellkave:node_id"]) void loadPlaceExits(hit.tags["spellkave:node_id"]);
	}

	function frameOnMap(
		lon: number,
		lat: number,
		_rows?: PlaceRow[],
		_geometry?: { type: string; coordinates: unknown },
	): void {
		if (map === null) return;
		const rail = chrome === "maps" && mapsRailOpen ? MAPS_RAIL_LEFT_PX : 0;
		map.flyTo({
			center: [lon, lat],
			zoom: PLACE_FOCUS_ZOOM,
			padding: { left: rail, top: 0, right: 0, bottom: 0 },
			duration: 700,
		});
	}

	function selectPlace(
		next: Place,
		fly: boolean,
		geometry?: { type: string; coordinates: unknown },
		updateUrl = true,
		report = true,
	): void {
		const isSamePlace = place?.nodeId === next.nodeId;
		place = next;
		if (!isSamePlace) placeExits = [];
		searchText = next.name;
		searchHits = [];
		railCollapsed = false;
		followEntityId = null;
		if (updateUrl && next.nodeId) rememberResource("place", next.nodeId);
		const floor = floorForPlace(next.rows, levels);
		applyLevel(floor !== null ? floor : activeLevel);
		if (report) onPlaceClick?.(next);
		if (map !== null) {
			applyPlaceSelection(map, selectedFeatureId, next.nodeId);
			selectedFeatureId = next.nodeId;
		} else {
			selectedFeatureId = next.nodeId;
		}
		if (map === null || MapLibre === null) return;
		if (fly) frameOnMap(next.lon, next.lat, next.rows, geometry);
	}

	/**
	 * Look a place up and select it. Only the newest lookup may select: an
	 * answer that a later lookup overtook is dropped, so a slow answer for an
	 * earlier place never moves the selection or the camera back. `report`
	 * false keeps the selection off `onPlaceClick` (a follow is the hero
	 * arriving, not somebody picking the place).
	 */
	async function openDeepLinkedPlace(nodeId: string, fly = false, report = true): Promise<void> {
		const request = ++linkRequest;
		try {
			const hits = await runOverpass(
				interpreterUrl(gatewayOrigin, slug),
				buildNodeIdQuery(nodeId),
				token,
			);
			if (request !== linkRequest) return;
			const hit = mergeOsmPlaceHits(hits);
			if (hit === undefined) {
				searchError = `No map feature for ${nodeId}`;
				return;
			}
			searchError = null;
			selectPlace(placeFromHit(hit), fly, undefined, false, report);
			void loadPlaceExits(nodeId);
		} catch (cause) {
			if (request !== linkRequest) return;
			searchError = cause instanceof Error ? cause.message : String(cause);
		}
	}

	/**
	 * Follow a changed `placeNodeId` once the boot has opened the first one
	 * (`followPlace` only). Compared with the last prop value, never with what
	 * the canvas looked up since: a place picked on the map in between must not
	 * stop the follow back to an earlier place. A place that is already
	 * selected needs no flight.
	 */
	function followLinkedPlace(linked: string): void {
		if (!followPlace || !linkReady || linked === followedPlace) return;
		followedPlace = linked;
		if (linked === "") return;
		if (linked === place?.nodeId) {
			// Already selected: void any older lookup still in flight so it
			// cannot pull the selection away again.
			linkRequest += 1;
			return;
		}
		void openDeepLinkedPlace(linked, true, false);
	}

	$effect(() => {
		const linked = placeNodeId?.trim() ?? "";
		untrack(() => followLinkedPlace(linked));
	});

	async function loadPlaceExits(nodeId: string): Promise<void> {
		try {
			const hits = await runOverpass(
				interpreterUrl(gatewayOrigin, slug),
				buildPlaceNeighborhoodQuery(nodeId),
				token,
			);
			placeExits = placeExitsFromHits(hits, nodeId);
		} catch {
			placeExits = [];
		}
	}

	function hideHover(): void {
		if (hoverUi !== null) {
			unmount(hoverUi);
			hoverUi = null;
		}
		hoverPopup?.remove();
		hoverPopup = null;
	}

	function occupancyAt(nodeId: string | null): number {
		if (nodeId === null || nodeId === "") return 0;
		return occupancyPlaces.filter((row) => row.placeNodeId === nodeId).length;
	}

	function showHoverAt(
		card: { label?: string; name: string; meta: string | null; snippet: string | null },
		lngLat: { lng: number; lat: number },
	): void {
		if (map === null || MapLibre === null) return;
		const host = document.createElement("div");
		if (hoverUi !== null) unmount(hoverUi);
		hoverUi = mount(HoverCard, {
			target: host,
			props: {
				label: card.label ?? "Place",
				title: card.name,
				meta: card.meta ?? "",
				snippet: card.snippet ?? "",
			},
		});
		if (hoverPopup === null) {
			hoverPopup = new MapLibre.Popup({
				closeButton: false,
				closeOnClick: false,
				offset: 18,
				maxWidth: "18rem",
				className: "place-hover",
			});
			hoverPopup.setDOMContent(host).setLngLat(lngLat).addTo(map);
		} else {
			hoverPopup.setDOMContent(host).setLngLat(lngLat);
		}
	}

	function onNodeHoverMove(ev: MapLayerMouseEvent): void {
		const props = (ev.features?.[0]?.properties ?? {}) as Record<string, unknown>;
		const card = hoverCardFromProperties(props, occupancyAt(nodeIdFromProperties(props)));
		if (card === null) {
			hideHover();
			return;
		}
		showHoverAt(card, ev.lngLat);
	}

	function clearPlace(): void {
		place = null;
		placeExits = [];
		stackedPlaces = [];
		searchText = "";
		searchHits = [];
		followEntityId = null;
		if (map !== null) {
			applyPlaceSelection(map, selectedFeatureId, null);
		}
		selectedFeatureId = null;
		hideHover();
		onPlaceClear?.();
		applyLevel(activeLevel);
	}

	function onWindowKeydown(ev: KeyboardEvent): void {
		if (ev.key !== "Escape") return;
		clearPlace();
	}

	function onResultsKeydown(ev: KeyboardEvent): void {
		if (searchHits.length === 0) return;
		if (ev.key !== "ArrowDown" && ev.key !== "ArrowUp") return;
		ev.preventDefault();
		const current = searchHits.findIndex((_, i) => document.activeElement?.id === `search-hit-${i}`);
		const next = nextResultIndex(current, ev.key === "ArrowDown" ? 1 : -1, searchHits.length);
		const el = document.getElementById(`search-hit-${next}`);
		if (el instanceof HTMLElement) el.focus();
	}

	function pickableLayers(target: MapLibreMap): string[] {
		return PICKABLE_LAYERS.filter((id) => target.getLayer(id) !== undefined);
	}

	function onMapClick(ev: MapLayerMouseEvent): void {
		hideHover();
		if (map === null) return;
		const feats = map.queryRenderedFeatures(ev.point, { layers: pickableLayers(map) });
		if (feats.length === 0) {
			clearPlace();
			return;
		}
		const layerId = (feat: (typeof feats)[0]): string => {
			const layer = feat.layer as { id?: string } | string | undefined;
			return typeof layer === "string" ? layer : (layer?.id ?? "");
		};
		const pins = feats.filter((feat) => {
			const id = layerId(feat);
			return id === "poi-symbol" || id === "node-circle" || id === "node-label";
		});
		const rooms = feats.filter((feat) => layerId(feat) === "room-fill");
		const pool = pins.length > 0 ? pins : rooms.length > 0 ? rooms : feats;
		const raw: {
			nodeId: string;
			name: string;
			area: number;
			lon: number;
			lat: number;
			properties: Record<string, unknown>;
			geometry: { type: string; coordinates: unknown };
		}[] = [];
		for (const feat of pool) {
			const props = (feat.properties ?? {}) as Record<string, unknown>;
			const nodeId = nodeIdFromProperties(props);
			if (nodeId === null) continue;
			const geometry = feat.geometry as { type: string; coordinates: unknown };
			const point: [number, number] =
				geometry.type === "Point"
					? [Number((geometry.coordinates as number[])[0]), Number((geometry.coordinates as number[])[1])]
					: [ev.lngLat.lng, ev.lngLat.lat];
			const rawName = props.name;
			raw.push({
				nodeId,
				name: typeof rawName === "string" && rawName.trim() !== "" ? rawName.trim() : nodeId,
				area: geometryArea(geometry),
				lon: point[0],
				lat: point[1],
				properties: props,
				geometry,
			});
		}
		const ranked = uniqueByNodeIdSmallest(raw);
		if (ranked.length === 0) {
			clearPlace();
			return;
		}
		const idx = nextOverlapIndex(
			ranked.map((row) => row.nodeId),
			place?.nodeId ?? null,
		);
		const pick = ranked[idx] ?? ranked[0];
		if (!pick) {
			clearPlace();
			return;
		}
		selectPlace(placeFromProperties(pick.properties, pick.lon, pick.lat), true, pick.geometry);
		stackedPlaces = ranked
			.filter((row) => row.nodeId !== pick.nodeId)
			.map((row) => ({ nodeId: row.nodeId, name: row.name }));
		void openDeepLinkedPlace(pick.nodeId, false);
	}



	function flyToMySeat(): void {
		if (map === null || lastSeatTarget === null) return;
		map.flyTo({
			center: [lastSeatTarget.lon, lastSeatTarget.lat],
			zoom: Math.max(map.getZoom(), 16),
		});
	}

	async function syncSeatMarker(): Promise<void> {
		if (map === null || MapLibre === null) return;
		const placeId = placeNodeForEntities(minePlaces, mineEntityIds);
		const key = `${slug}|${placeId ?? ""}|${mineEntityIds.join(",")}`;
		if (key === lastSeatKey) return;
		lastSeatKey = key;
		if (placeId === null) {
			seatMarker?.remove();
			seatMarker = null;
			lastSeatNode = null;
			lastSeatTarget = null;
			return;
		}
		try {
			const target: SeatFlyTarget | null = await resolveSeatFlyTarget(
				interpreterUrl(gatewayOrigin, slug),
				token,
				placeId,
			);
			// A newer seat overtook this lookup: its own answer places the marker.
			if (key !== lastSeatKey) return;
			if (target === null || map === null || MapLibre === null) {
				lastSeatTarget = null;
				return;
			}
			lastSeatTarget = target;
			if (seatMarker === null) {
				const el = document.createElement("div");
				el.dataset.testid = "seat-marker";
				el.style.width = "14px";
				el.style.height = "14px";
				el.style.borderRadius = "50%";
				el.style.background = "#ee6c4d";
				el.style.border = "2px solid #edf2f4";
				el.style.boxShadow = "0 0 0 2px rgba(238,108,77,.35)";
				seatMarker = new MapLibre.Marker({ element: el }).setLngLat([target.lon, target.lat]).addTo(map);
			} else {
				seatMarker.setLngLat([target.lon, target.lat]);
			}
			if (lastSeatNode !== placeId) {
				// While a followed place is linked, the follow owns the flight
				// (also when the seat prop updates before `placeNodeId` does).
				const followOwnsCamera = followPlace && (placeNodeId?.trim() ?? "") !== "";
				if (!followOwnsCamera) {
					map.flyTo({ center: [target.lon, target.lat], zoom: Math.max(map.getZoom(), 16) });
				}
				lastSeatNode = placeId;
			}
			refreshFloorItemVisibility();
		} catch (cause) {
			notice = failed(cause);
		}
	}

	function clearOccupancyMarkers(): void {
		for (const item of occupancyMarkers) item.marker.remove();
		occupancyMarkers = [];
		occupancyCoords.clear();
		targetCache.clear();
		for (const item of thingMarkers) item.marker.remove();
		thingMarkers = [];
	}

	function thingPin(row: { entityId: string; placeNodeId: string; name: string }): HTMLDivElement {
		const el = document.createElement("div");
		el.dataset.testid = "thing-marker";
		el.dataset.entityId = row.entityId;
		el.title = row.name;
		el.style.width = "10px";
		el.style.height = "10px";
		el.style.borderRadius = "2px";
		el.style.background = "#b08968";
		el.style.border = "2px solid #edf2f4";
		el.style.cursor = "pointer";
		el.style.boxShadow = "0 0 0 2px rgba(176,137,104,.35)";
		el.addEventListener("click", (ev) => {
			ev.stopPropagation();
			void selectSearchHit({
				id: `thing:${row.entityId}`,
				osmType: "item",
				name: row.name,
				graph: row.placeNodeId,
				lon: occupancyCoords.get(row.placeNodeId)?.lon ?? 0,
				lat: occupancyCoords.get(row.placeNodeId)?.lat ?? 0,
				tags: { name: row.name, "spellkave:node_id": row.placeNodeId },
				kind: "thing",
				entityId: row.entityId,
			});
		});
		return el;
	}

	async function syncThingMarkers(): Promise<void> {
		if (map === null || MapLibre === null || mode !== "full") return;
		for (const item of thingMarkers) item.marker.remove();
		thingMarkers = [];
		if (thingPlaces.length === 0) return;
		const interpreter = interpreterUrl(gatewayOrigin, slug);
		const next: FloorMarkerEntry[] = [];
		for (const row of thingPlaces) {
			if (row.placeNodeId === "") continue;
			try {
				let target = targetCache.get(row.placeNodeId);
				if (target === undefined) {
					target = (await resolveSeatFlyTarget(interpreter, token, row.placeNodeId)) ?? undefined;
					if (target !== undefined) {
						targetCache.set(row.placeNodeId, target);
						occupancyCoords.set(row.placeNodeId, { lon: target.lon, lat: target.lat });
					}
				}
				if (target === undefined || map === null || MapLibre === null) continue;
				const marker = new MapLibre.Marker({ element: thingPin(row) })
					.setLngLat([target.lon, target.lat])
					.addTo(map);
				next.push({
					marker,
					placeNodeId: row.placeNodeId,
					level: target.level ?? null,
					graph: target.graph ?? null,
					indoor: Boolean(target.indoor),
				});
			} catch (cause) {
				notice = failed(cause);
			}
		}
		thingMarkers = next;
		refreshFloorItemVisibility();
	}

	function occupancyPin(row: OccupancyPlace): HTMLDivElement {
		const el = document.createElement("div");
		el.dataset.testid = "occupancy-marker";
		el.dataset.entityId = row.entityId;
		el.title = row.name;
		el.style.width = row.mine === true ? "14px" : "12px";
		el.style.height = row.mine === true ? "14px" : "12px";
		el.style.borderRadius = "50%";
		el.style.background = row.mine === true ? "#ee6c4d" : "#3d5a80";
		el.style.border = "2px solid #edf2f4";
		el.style.cursor = "pointer";
		el.style.boxShadow =
			row.mine === true ? "0 0 0 2px rgba(238,108,77,.35)" : "0 0 0 2px rgba(61,90,128,.35)";
		el.addEventListener("click", (ev) => {
			ev.stopPropagation();
			place = null;
			searchText = row.name;
			searchHits = [];
			railCollapsed = false;
			followEntityId = row.entityId;
			hideHover();
			rememberResource("person", row.entityId);
			onActorClick?.(row);
		});
		return el;
	}

	async function syncOccupancyMarkers(): Promise<void> {
		if (map === null || MapLibre === null || mode !== "full") return;
		clearOccupancyMarkers();
		if (occupancyPlaces.length === 0) {
			untrack(() => onDrawableNodes?.(new Set()));
			return;
		}
		const interpreter = interpreterUrl(gatewayOrigin, slug);
		const next: FloorMarkerEntry[] = [];
		for (const place of occupancyPlaces) {
			if (place.placeNodeId === "") continue;
			try {
				let target = targetCache.get(place.placeNodeId);
				if (target === undefined) {
					target = (await resolveSeatFlyTarget(interpreter, token, place.placeNodeId)) ?? undefined;
					if (target !== undefined) {
						targetCache.set(place.placeNodeId, target);
					}
				}
				if (target === undefined || map === null || MapLibre === null) continue;
				occupancyCoords.set(place.placeNodeId, { lon: target.lon, lat: target.lat });
				const marker = new MapLibre.Marker({ element: occupancyPin(place) })
					.setLngLat([target.lon, target.lat])
					.addTo(map);
				const pin = marker.getElement();
				pin.addEventListener("mouseenter", () => {
					const name = place.name?.trim() ?? "";
					if (name === "") return;
					showHoverAt(
						{
							label: "Person",
							name,
							meta:
								occupancyAt(place.placeNodeId) > 1
									? `${occupancyAt(place.placeNodeId)} people`
									: "1 person",
							snippet: null,
						},
						marker.getLngLat(),
					);
				});
				pin.addEventListener("mouseleave", hideHover);
				next.push({
					marker,
					placeNodeId: place.placeNodeId,
					level: target.level ?? null,
					graph: target.graph ?? null,
					indoor: Boolean(target.indoor),
				});
			} catch (cause) {
				notice = failed(cause);
			}
		}
		occupancyMarkers = next;
		refreshFloorItemVisibility();
		untrack(() => onDrawableNodes?.(new Set(occupancyCoords.keys())));
		if (followEntityId !== null) {
			const followed = occupancyPlaces.find((row) => row.entityId === followEntityId);
			const pos = followed ? occupancyCoords.get(followed.placeNodeId) : undefined;
			if (pos !== undefined && map !== null) {
				map.easeTo({ center: [pos.lon, pos.lat] });
			}
		}
	}



	/**
	 * Whether this world has map art, asked before the map is built so the
	 * style can be stripped of backdrops that would only 404. Deliberately
	 * non-fatal and three-valued: a backdrops.json that errors, or that comes
	 * from a gateway too old to ship `loaded` (#2681), answers null — the map
	 * is still real, and claiming "no art" when we cannot tell would be worse
	 * than saying nothing.
	 */
	async function readArtLoaded(
		origin: string,
		worldSlug: string,
		access: string,
	): Promise<boolean | null> {
		try {
			const res = await authFetch(backdropsUrl(origin, worldSlug), access);
			if (!res.ok) return null;
			return readLoadedFlag(await res.json());
		} catch {
			return null;
		}
	}

	$effect(() => {
		// Track seat props. The caller's own seat marker shows in every mode;
		// an empty `minePlaces` simply draws none.
		void minePlaces;
		void mineEntityIds;
		void slug;
		void syncSeatMarker();
	});

	$effect(() => {
		void occupancyPlaces;
		void slug;
		void token;
		if (mode === "full") void syncOccupancyMarkers().then(() => void syncThingMarkers());
	});

	$effect(() => {
		if (container === undefined) return;
		const origin = gatewayOrigin;
		const worldSlug = slug;
		const access = token;
		const useNativeNav = chrome !== "maps";
		if (origin === "" || worldSlug === "" || access === "") {
			notice = blocked();
			return;
		}

		let cancelled = false;
		let ctrlRo: ResizeObserver | null = null;
		notice = loading();
		(window as Window & { spellkaveMapsReady?: boolean }).spellkaveMapsReady = false;
		map?.remove();
		map = null;
		seatMarker = null;
		clearOccupancyMarkers();
		selectedFeatureId = null;
		hideHover();
		place = null;
		searchHits = [];
		lastSeatKey = "";
		lastSeatNode = null;
		lastSeatTarget = null;
		linkReady = false;
		followedPlace = null;
		linkRequest += 1;

		const el = container;

		void (async () => {
			try {
				MapLibre = await loadMapLibre();
				if (cancelled || el !== container) return;
				const transformRequest = createTransformRequest(origin, access);

				// Fetch style with Bearer first so a missing transformRequest path still auths,
				// then hand the JSON object to MapLibre (tiles/glyphs/images still use transformRequest).
				const [styleRes, artLoaded] = await Promise.all([
					authFetch(styleUrl(origin, worldSlug), access),
					readArtLoaded(origin, worldSlug, access),
				]);
				if (!styleRes.ok) throw new Error(`style.json HTTP ${styleRes.status}`);
				const rawStyle = (await styleRes.json()) as Parameters<typeof stripBackdrops>[0];
				if (cancelled || el !== container) return;
				const satelliteInfo = await prepareSatellite(MapLibre, rawStyle, access);
				satelliteAvailable = satelliteInfo !== null;
				if (cancelled || el !== container) return;
				// No art loaded: drop the image sources rather than let every one of
				// them 404 and paint the world as broken.
				const styleJson =
					chrome === "maps" || artLoaded === false ? stripBackdrops(rawStyle) : rawStyle;

				const next = new MapLibre.Map({
					container: el,
					style: styleJson as never,
					transformRequest: transformRequest as never,
					attributionControl: useNativeNav ? { compact: true } : false,
				});
				map = next;
				(window as Window & { __spellkaveMap?: typeof next }).__spellkaveMap = next;
				if (useNativeNav) {
					next.addControl(
						new MapLibre.NavigationControl({ showCompass: true, showZoom: true }),
						navigationPosition,
					);
				} else {
					next.addControl(new MapLibre.AttributionControl({ compact: false }), "bottom-right");
					next.addControl(new MapLibre.ScaleControl({ maxWidth: 80, unit: "metric" }), "bottom-right");
				}
				if (chrome === "maps") {
					const ctrl = el.querySelector(".maplibregl-ctrl-bottom-right") as HTMLElement | null;
					if (ctrl && typeof ResizeObserver !== "undefined") {
						ctrlRo = new ResizeObserver((entries) => {
							for (const entry of entries) {
								const width = entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
								if (width > 0) legendRightOffset = Math.ceil(width) + 16;
							}
						});
						ctrlRo.observe(ctrl);
					}
				}
				setupPoiMissingImageHandler(next);
				void registerPoiImages(next);
				next.on("click", onMapClick);

				next.on("load", () => {
					if (cancelled) return;
					setSatelliteVisibility(next, satellite);
					notice =
						artLoaded === false && chrome !== "maps"
							? noArt(worldSlug)
							: ready(worldSlug, "");
					(window as Window & { spellkaveMapsReady?: boolean }).spellkaveMapsReady = true;
					window.dispatchEvent(new Event("spellkave-maps-ready"));
					const canvas = next.getCanvas();
					for (const id of pickableLayers(next)) {
						next.on("mouseenter", id, () => {
							canvas.style.cursor = "pointer";
						});
						next.on("mouseleave", id, () => {
							canvas.style.cursor = "";
						});
					}
					for (const id of pickableLayers(next)) {
						next.on("mousemove", id, onNodeHoverMove);
						next.on("mouseleave", id, hideHover);
					}
					void (async () => {
						try {
							let attr = "";
							if (mode === "full") {
								const res = await authFetch(tilesJsonUrl(origin, worldSlug), access);
								if (!res.ok) throw new Error(`tiles.json HTTP ${res.status}`);
								const tj = await res.json();
								levels = parseLevelsFromTileJson(tj);
								const defaultLevel = levels.includes("0") ? "0" : (levels[0] ?? "all");
								applyLevel(defaultLevel);
								attr =
									typeof (tj as { attribution?: string }).attribution === "string"
										? (tj as { attribution: string }).attribution
										: "";
							}
							const linkedPlace = placeNodeId?.trim() ?? "";
							if (linkedPlace !== "") {
								await openDeepLinkedPlace(linkedPlace, true);
							}
							if (cancelled) return;
							followedPlace = linkedPlace;
							linkReady = true;
							// The prop may have moved on while the first link resolved.
							followLinkedPlace(placeNodeId?.trim() ?? "");
							// A world without art renders place names on an empty ground,
							// which without this reads as a world that simply is that empty
							// (sk-jay0.5.1.8.10).
							if (attr !== "") notice = ready(worldSlug, attr);
							await syncSeatMarker();
							if (mode === "full") {
								await syncOccupancyMarkers();
								await syncThingMarkers();
							}
						} catch (cause) {
							notice = failed(cause);
						}
					})();
				});
				next.on("error", (e) => {
					if (cancelled) return;
					const err = e.error as { message?: string } | string | undefined;
					const msg =
						typeof err === "string"
							? err
							: typeof err?.message === "string"
								? err.message
								: "map error";
					// One missing backdrop image is not a broken map: the places are
					// real and MapLibre keeps rendering them.
					if (isBackdropAssetError(msg)) return;
					if (notice.kind === "loading") notice = failed(msg);
				});
			} catch (cause) {
				if (!cancelled) notice = failed(cause);
			}
		})();

		return () => {
			cancelled = true;
			ctrlRo?.disconnect();
			map?.remove();
			map = null;
		};
	});

	$effect(() => {
		window.addEventListener("keydown", onWindowKeydown);
		const onPop = (ev: Event): void => {
			const loc = parseMapsLocator(window.location.href);
			const fly =
				ev.type === "popstate" ||
				(ev instanceof CustomEvent && (ev.detail as { fly?: boolean } | null)?.fly === true);
			if (loc.place !== null) {
				if (place?.nodeId === loc.place && !fly) return;
				void openDeepLinkedPlace(loc.place, fly);
				return;
			}
			if (loc.person !== null) {
				const row = occupancyPlaces.find((entry) => entry.entityId === loc.person);
				place = null;
				followEntityId = loc.person;
				if (row !== undefined) onActorClick?.(row);
				return;
			}
			clearPlace();
		};
		window.addEventListener("popstate", onPop);
		window.addEventListener(MAPS_LOCATOR_EVENT, onPop);
		return () => {
			window.removeEventListener("keydown", onWindowKeydown);
			window.removeEventListener("popstate", onPop);
			window.removeEventListener(MAPS_LOCATOR_EVENT, onPop);
		};
	});

	onDestroy(() => {
		if (searchTimer !== null) clearTimeout(searchTimer);
		hideHover();
		seatMarker?.remove();
		clearOccupancyMarkers();
		map?.remove();
		map = null;
	});
</script>

<div class="absolute inset-0 min-h-0" data-testid="map-canvas" data-map-mode={mode} data-chrome={chrome} data-overlay={overlay ? "true" : "false"} data-rail={mapsRailOpen ? "open" : "closed"}>
	<!-- h-full, not inset-0: maplibre-gl.css forces position:relative on the map element. -->
	<div class="h-full w-full" bind:this={container}></div>

	{#if mode === "full"}
		<aside
			class={[
				"pointer-events-none absolute z-10 flex flex-col",
				chrome === "maps" && mapsRailOpen
					? "inset-y-0 left-0 right-0 h-full"
					: chrome === "maps"
						? "top-3 left-3 w-[min(42rem,calc(100%-5.5rem))] gap-2"
						: "inset-y-3 left-3 w-80 max-w-[calc(100%-1.5rem)] gap-2",
			]}
			data-testid="map-ui"
			data-chrome={chrome}
			data-rail={chrome === "maps" && mapsRailOpen ? "open" : "closed"}
			aria-label="Places"
		>
			{#if chrome === "maps"}
				{#if mapsRailOpen}
					<div
						class="pointer-events-auto flex h-full min-h-0 w-[min(33.333vw,28rem)] max-w-[33.333vw] flex-col border-r border-border bg-card"
						data-testid="maps-rail"
					>
						<div class="maps-rail-search flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
							<span class="maps-search-icon" aria-hidden="true">
								<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
									<circle cx="11" cy="11" r="7"></circle>
									<path d="M20 20l-3.5-3.5"></path>
								</svg>
							</span>
							<Input
								type="search"
								placeholder="Search maps…"
								aria-label="Search maps"
								autocomplete="off"
								data-testid="search-input"
								value={searchText}
								oninput={(e) => scheduleSearch(e.currentTarget.value)}
								onkeydown={onResultsKeydown}
							/>
							<Button
								size="icon-xs"
								variant="ghost"
								aria-label="Close place"
								data-testid="place-close"
								onclick={() => {
									searchKind = "all";
									searchHits = [];
									railCollapsed = true;
									clearPlace();
								}}
							>
								×
							</Button>
						</div>
						<div class="flex min-h-0 flex-1 flex-col overflow-y-auto" data-testid="maps-rail-scroll">
						{#if searchError}
							<p class="px-3 pt-2 text-xs text-destructive">{searchError}</p>
						{/if}
						{#if searchHits.length > 0}
							<HitList
								hits={searchHits.map((hit) => ({ id: hit.id, title: hit.name, meta: searchHitMeta(hit) }))}
								onHitKeydown={onResultsKeydown}
								onSelect={(_id, i) => void selectSearchHit(searchHits[i]!)}
							/>
						{:else if place === null && (searchKind !== "all" || searchText.trim().length >= 2)}
							<p class="px-3 py-2 text-sm text-muted-foreground">No matches.</p>
						{/if}
						<div class="p-3" data-testid="maps-rail-body">
							{#if place !== null}
								{@render placeCard()}
							{/if}
							{@render railExtra?.()}
						</div>
					</div>
					{#if drawerOpen && (drawerExtra !== undefined || drawerPlaceMode)}
						<div
							class="pointer-events-auto absolute inset-y-0 left-[min(33.333vw,28rem)] z-20 flex w-[min(33.333vw,28rem)] max-w-[33.333vw] flex-col border-r border-border bg-card max-lg:inset-y-0 max-lg:left-0 max-lg:z-30"
							data-testid="maps-drawer"
							aria-label="Details"
						>
							<div class="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
								<span class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Details</span>
								<div class="flex items-center gap-1">
									<button
										type="button"
										class="text-sm text-primary underline-offset-4 hover:underline lg:hidden"
											onclick={() => onDrawerClose?.()}
										>
											Back
										</button>
										<button
											type="button"
											class="px-1 text-lg leading-none text-muted-foreground hover:text-foreground"
											data-testid="drawer-close"
											aria-label="Close details"
											onclick={() => onDrawerClose?.()}
										>
											×
										</button>
								</div>
							</div>
							<div class="flex min-h-0 flex-1 flex-col overflow-y-auto p-3" data-testid="maps-drawer-scroll">
								{#if drawerPlaceMode}
									{@render placeCard()}
								{:else}
									{@render drawerExtra?.()}
								{/if}
							</div>
						</div>
					{/if}
{#snippet placeCard()}
	{#if place !== null}
		{@const selectedNodeId = place.nodeId}
		<section class="flex flex-col gap-3" data-testid="place-panel" aria-label={place.name}>
											{#if placeDetails}
										{@render placeDetails(place)}
									{:else}
										{@const description = placeRows?.primary.find((row) => row.key === "description")?.value ?? ""}
										{@const level = placeRows?.primary.find((row) => row.key === "level")?.value}
										{@const graph = placeRows?.primary.find((row) => row.key === "spellkave:graph")?.value}
										{@const size = formatPlaceExtent(extentHalfMetersFromRows(place.rows))}
										{@const rest = (placeRows?.primary ?? []).filter(
											(row) =>
												row.key !== "description" &&
												row.key !== "level" &&
												!row.key.startsWith("spellkave:"),
										)}
										{@const herePeople = occupancyPlaces.filter((row) => row.placeNodeId === selectedNodeId)}
										{@const hereThings = thingPlaces.filter((row) => row.placeNodeId === selectedNodeId)}
										<PlaceInspect
											label="Place"
											title={place.name}
											{description}
											onDetails={onPlaceDetails}
											fields={[
												...(level ? [{ label: "Floor", value: level }] : []),
												...(size ? [{ label: "Size", value: size }] : []),
												...(graph ? [{ label: "In", value: humanizePlaceRef(graph) }] : []),
												...rest.map((row) => ({ label: row.key, value: row.value })),
											]}
												lists={[
												{
													heading: "Ways",
													testId: "place-ways",
													empty: "No way out is drawn.",
													items: placeExits.map((exit) => {
														const badges: string[] = [];
														if (exit.outdoor) badges.push("outside");
														if (exit.traversalMode === "fly") badges.push("🪽 Fly");
														else if (exit.traversalMode === "swim") badges.push("🏊 Swim");
														else if (exit.traversalMode) badges.push(exit.traversalMode);
														if (exit.locked !== undefined) badges.push(exit.locked ? "🔒 Locked" : "🔓 Open");
														return {
															id: exit.nodeId,
															name: badges.length > 0 ? `${exit.name} · ${badges.join(" · ")}` : exit.name,
														};
													}),
													onSelect: (id) => void publishMapsLocator(slug, "place", id, true),
												},
												...(stackedPlaces.length > 0
													? [
															{
																heading: "Stacked",
																testId: "place-stacked",
																items: stackedPlaces.map((row) => ({
																	id: row.nodeId,
																	name: row.name,
																})),
																onSelect: (id: string) => void publishMapsLocator(slug, "place", id, true),
															},
														]
													: []),
												{
													heading: "Here",
													testId: "place-here",
													empty: "No one and nothing stands out.",
													items: [
														...herePeople.map((person) => ({ id: person.entityId, name: person.name })),
														...hereThings.map((item) => ({
															id: item.entityId,
															name: item.holderName ? `${item.name} · ${item.holderName}` : item.name,
														})),
													],
													onSelect: (id) => {
														const person = herePeople.find((row) => row.entityId === id);
														if (person !== undefined) {
															followEntityId = person.entityId;
															rememberResource("person", person.entityId);
															onActorClick?.(person);
															return;
														}
														const item = hereThings.find((row) => row.entityId === id);
														if (item !== undefined) {
															void selectSearchHit({
																id: `thing:${item.entityId}`,
																osmType: "item",
																name: item.name,
																graph: item.placeNodeId,
																lon: occupancyCoords.get(item.placeNodeId)?.lon ?? 0,
																lat: occupancyCoords.get(item.placeNodeId)?.lat ?? 0,
																tags: { name: item.name, "spellkave:node_id": item.placeNodeId },
																kind: "thing",
																entityId: item.entityId,
																placeName: item.holderName ? `carried by ${item.holderName}` : "",
															});
														}
													},
												},
											]}
											authorFields={[
												...(place.nodeId ? [{ label: "Node", value: place.nodeId, code: true }] : []),
												...(graph ? [{ label: "Graph", value: graph, code: true }] : []),
												...((place.rows.find((row) => row.key === "spellkave:substrate")?.value)
													? [{ label: "Substrate", value: place.rows.find((row) => row.key === "spellkave:substrate")?.value ?? "" }]
													: []),
											]}
										/>
										{#if placeLocator !== ""}
											<CopyLocator url={placeLocator} copy={copyText} />
										{/if}
									{/if}
			</section>
		{/if}
{/snippet}
				</div>
						<div class="maps-chips pointer-events-auto" role="toolbar" aria-label="Browse the map">
							<Button variant={searchKind === "person" ? "secondary" : "ghost"} class="bg-card/55" aria-pressed={searchKind === "person"} data-testid="search-kind-person" onclick={() => setSearchKind("person")}>People</Button>
							<Button variant={searchKind === "thing" ? "secondary" : "ghost"} class="bg-card/55" aria-pressed={searchKind === "thing"} data-testid="search-kind-thing" onclick={() => setSearchKind("thing")}>Things</Button>
							<Button variant={searchKind === "place" ? "secondary" : "ghost"} class="bg-card/55" aria-pressed={searchKind === "place"} data-testid="search-kind-place" onclick={() => setSearchKind("place")}>Places</Button>
						</div>
				{:else}
					<div class="pointer-events-auto flex flex-col gap-2">
						<div class="flex flex-wrap items-center gap-3">
						<div
							class="flex min-h-11 min-w-[16rem] flex-1 items-center gap-2 rounded-[var(--radius)] border border-border bg-card px-3"
							data-testid="search-pill"
						>
							<span class="maps-search-icon" aria-hidden="true">
								<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
									<circle cx="11" cy="11" r="7"></circle>
									<path d="M20 20l-3.5-3.5"></path>
								</svg>
							</span>
							<Input
								type="search"
								placeholder="Search maps…"
								aria-label="Search maps"
								autocomplete="off"
								data-testid="search-input"
								value={searchText}
								oninput={(e) => scheduleSearch(e.currentTarget.value)}
								onkeydown={onResultsKeydown}
							/>
						</div>
						<div class="maps-search-pills" role="toolbar" aria-label="Browse the map">
							<Button variant={searchKind === "person" ? "secondary" : "ghost"} class="bg-card/55" aria-pressed={searchKind === "person"} data-testid="search-kind-person" onclick={() => setSearchKind("person")}>People</Button>
							<Button variant={searchKind === "thing" ? "secondary" : "ghost"} class="bg-card/55" aria-pressed={searchKind === "thing"} data-testid="search-kind-thing" onclick={() => setSearchKind("thing")}>Things</Button>
							<Button variant={searchKind === "place" ? "secondary" : "ghost"} class="bg-card/55" aria-pressed={searchKind === "place"} data-testid="search-kind-place" onclick={() => setSearchKind("place")}>Places</Button>
						</div>
						</div>
						{#if searchError}
							<p class="px-3 text-xs text-destructive">{searchError}</p>
						{/if}
						{#if searchHits.length > 0}
							<HitList
								hits={searchHits.map((hit) => ({ id: hit.id, title: hit.name, meta: searchHitMeta(hit) }))}
								onHitKeydown={onResultsKeydown}
								onSelect={(_id, i) => void selectSearchHit(searchHits[i]!)}
							/>
						{:else if place === null && (searchKind !== "all" || searchText.trim().length >= 2)}
							<p class="rounded-[var(--radius)] border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
								No matches.
							</p>
						{/if}
					</div>
				{/if}
			{:else}
			<div
				class="pointer-events-auto flex min-h-0 flex-col gap-2 overflow-y-auto rounded-[var(--radius)] border border-border bg-card/90 p-3 shadow-md backdrop-blur"
			>
				<Input
					type="search"
					placeholder="Search maps…"
					aria-label="Search maps"
					autocomplete="off"
					data-testid="search-input"
					value={searchText}
					oninput={(e) => scheduleSearch(e.currentTarget.value)}
					onkeydown={onResultsKeydown}
				/>
				<p
					class={[
						"text-xs leading-snug",
						notice.kind === "failed" ? "text-destructive" : "text-muted-foreground",
					]}
					data-testid="map-status"
					data-notice={notice.kind}
					title={notice.kind === "failed" ? notice.detail : undefined}
				>
					{noticeText(notice, notices)}
				</p>
				{#if searchError}
					<p class="text-xs text-destructive">{searchError}</p>
				{/if}

				{#if place !== null}
					<section
						class="flex flex-col gap-2 border-t border-border pt-2"
						data-testid="place-panel"
						aria-label={place.name}
					>
						<div class="flex items-start justify-between gap-2">
							<h2 class="font-[family-name:var(--font-display)] text-lg leading-tight font-medium">
								{place.name}
							</h2>
							<Button
								size="icon-xs"
								variant="ghost"
								aria-label="Close place"
								data-testid="place-close"
								onclick={clearPlace}
							>
								×
							</Button>
						</div>
						{#if placeDetails}
							{@render placeDetails(place)}
						{:else if placeRows !== null}
						<dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
							{#each placeRows.primary as row (row.key)}
								<dt class="text-muted-foreground">{row.key}</dt>
								<dd class="break-words">{row.value}</dd>
							{/each}
						</dl>
						{#if placeRows.extra.length > 0}
							<details class="text-xs">
								<summary class="cursor-pointer text-muted-foreground">More tags</summary>
								<dl class="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
									{#each placeRows.extra as row (row.key)}
										<dt class="text-muted-foreground">{row.key}</dt>
										<dd class="break-all">{row.value}</dd>
									{/each}
								</dl>
							</details>
						{/if}
					{/if}
					<div class="flex flex-wrap items-center gap-2">
							{#if !placeDetails && placeLocator !== ""}
								<CopyLocator url={placeLocator} copy={copyText} />
							{/if}
							{#if searchHits.length > 0}
								<Button
									size="xs"
									variant="ghost"
									onclick={() => {
										place = null;
									}}
								>
									Back to results
								</Button>
							{/if}
						</div>
					</section>
				{:else if searchHits.length > 0}
					<ul
						class="max-h-72 overflow-auto border-t border-border pt-1 text-xs"
						data-testid="search-results"
						aria-label="Search results"
					>
						{#each searchHits as hit, i (hit.id + hit.name)}
							<li>
								<Button
									id={`search-hit-${i}`}
									variant="ghost"
									size="xs"
									class="flex h-auto min-h-11 w-full flex-col items-start gap-0.5 px-2 py-1.5 text-left"
									onkeydown={onResultsKeydown}
									onclick={() => {
										// The player's pick outranks a link lookup still in flight.
										linkRequest += 1;
										selectPlace(placeFromHit(hit), true);
										if (hit.tags["spellkave:node_id"]) void loadPlaceExits(hit.tags["spellkave:node_id"]);
									}}
								>
									<span class="font-medium">{hit.name}</span>
									{#if hit.offMap === true}
										<span class="text-xs font-medium text-muted-foreground">off map</span>
									{/if}
									{#if hit.graph}
										<span class="text-xs text-muted-foreground">{hit.graph}</span>
									{/if}
								</Button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			{#if children}
				<details
					class="pointer-events-auto flex min-h-0 flex-col gap-2 rounded-[var(--radius)] border border-border bg-card/90 p-3 shadow-md backdrop-blur open:overflow-auto"
					open
					data-testid="seats-section"
				>
					<summary class="cursor-pointer text-sm font-medium">Seats</summary>
					<Button
						size="xs"
						variant="outline"
						data-testid="my-seat"
						disabled={mySeatNode === null}
						onclick={flyToMySeat}
					>
						My seat
					</Button>
					{@render children()}
				</details>
			{/if}

			<div
				class="pointer-events-auto mt-auto flex shrink-0 flex-col gap-1 self-start rounded-[var(--radius)] border border-border bg-card/90 p-3 shadow-md backdrop-blur"
			>
				<span class="text-xs text-muted-foreground">Floor</span>
				<div class="flex flex-wrap gap-x-1 gap-y-5" data-testid="floor-picker" role="group" aria-label="Floor">
					<Button
						size="xs"
						variant={activeLevel === "all" ? "default" : "outline"}
						onclick={() => applyLevel("all")}
					>
						all
					</Button>
					{#each levels as lvl (lvl)}
						<Button
							size="xs"
							variant={activeLevel === lvl ? "default" : "outline"}
							onclick={() => applyLevel(lvl)}
						>
							L{lvl}
						</Button>
					{/each}
				</div>
				{#if substrateControl}
				<div class="flex flex-wrap gap-x-1 gap-y-1 mt-2 pt-2 border-t border-border" data-testid="substrate-control" role="group" aria-label="Substrate">
					<span class="w-full text-xs text-muted-foreground">Substrate</span>
					{#each ["all", "outdoor", "indoor", "tactical"] as const as sub}
						<Button
							size="xs"
							variant={activeSubstrate === sub ? "default" : "outline"}
							onclick={() => applySubstrate(sub)}
						>
							{sub}
						</Button>
					{/each}
				</div>
				{/if}
			</div>
			{/if}
		</aside>
		{#if chrome === "maps"}
			<div class="pointer-events-auto absolute z-10" data-testid="maps-nav">
				{#if indoorEmphasis && levels.length > 1}
					<div
						class="maps-floor-stack"
						data-testid="floor-control"
						role="group"
						aria-label="Floor"
					>
						<div data-testid="floor-picker" class="contents">
							<Button
								size="icon"
								variant={activeLevel === "all" ? "default" : "ghost"}
								class="rounded-none"
								aria-pressed={activeLevel === "all"}
								onclick={() => applyLevel("all")}
							>
								all
							</Button>
							{#each stackedLevels as lvl (lvl)}
								<Button
									size="icon"
									variant={activeLevel === lvl ? "default" : "ghost"}
									class="rounded-none"
									aria-pressed={activeLevel === lvl}
									onclick={() => applyLevel(lvl)}
								>
									{lvl}
								</Button>
							{/each}
						</div>
					</div>
				{/if}
				<div class="maps-floor-stack" data-testid="maps-nav-zoom" role="group" aria-label="Map navigation">
					<Button size="icon" variant="ghost" class="rounded-none" aria-label="Zoom in" onclick={zoomIn}>+</Button>
					<Button size="icon" variant="ghost" class="rounded-none" aria-label="Zoom out" onclick={zoomOut}>−</Button>
					<Button size="icon" variant="ghost" class="rounded-none" aria-label="Reset north" onclick={resetNorth}>N</Button>
				</div>
			</div>
			<MapLegend bind:open={legendOpen} rightOffset={legendRightOffset} />
		{/if}
	{:else}
		<p
			class={[
				"pointer-events-none absolute top-3 left-3 z-10 max-w-[calc(100vw-1.5rem)] rounded-[var(--radius)] border border-border bg-card/90 px-2 py-1 text-xs leading-snug shadow-md backdrop-blur",
				notice.kind === "failed" ? "text-destructive" : "text-muted-foreground",
			]}
			data-testid="map-status"
			data-notice={notice.kind}
			title={notice.kind === "failed" ? notice.detail : undefined}
		>
			{noticeText(notice, notices)}
		</p>
	{/if}
</div>
