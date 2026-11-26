import type { Snippet } from "svelte";
import type { MapNotice, MapNoticeCopy } from "./map-notice";
import type { Place } from "./place";
import type { ActorPlace, OccupancyPlace } from "./seat-location";

/**
 * `medium` = map init, pan/zoom, tap a place, own seat marker.
 * `full` = plus search, floor switcher, place panel, occupancy and things.
 */
export type MapCanvasMode = "medium" | "full";

export interface MapCanvasProps {
	gatewayOrigin: string;
	slug: string;
	token: string;
	/** The place to open and fly to on boot. With `followPlace` it is also
	 * followed afterwards. */
	placeNodeId?: string;
	/**
	 * Opt-in (default false): keep following `placeNodeId` after boot. Each
	 * later value is selected and flown to once, unless that place is already
	 * selected; the follow owns the camera, so the seat marker never flies
	 * while a place is linked. A follow is not a pick: it does not call
	 * `onPlaceClick` (the boot selection still does). Play turns this on
	 * (sk-jay0.1.8.100 s6); apps/maps leaves it off and keeps its boot-only
	 * link and its seat flight.
	 */
	followPlace?: boolean;
	mode: MapCanvasMode;
	/** MapLibre navigation (zoom + compass). Default `top-right`. */
	navigationPosition?: "top-right" | "bottom-right";
	/**
	 * `stacked` (default, Play) keeps search + results + floor in one left panel.
	 * `maps` is the Google frame: search pill, results as a left rail, floor
	 * picker only when multiple levels exist (consumer CSS docks it BR).
	 */
	chrome?: "stacked" | "maps";
	/** maps chrome: open the left-third rail even without search hits (occupancy inspect). */
	openRail?: boolean;
	/** maps chrome: extra scroll content in the left rail (observer inspect). */
	railExtra?: Snippet;
	/** Drawer column right of the rail (sk-jay0.4.4.5): opens above the map,
	 * same height/width rule as the rail, own scroll region. Content is the
	 * caller's snippet; MapCanvas supplies chrome (close ×) only. */
	drawerExtra?: Snippet;
	/** True while the drawer column is shown. */
	drawerOpen?: boolean;
	/** When true (with drawerOpen), the drawer renders MapCanvas's own place
	 * card at full density instead of drawerExtra — the rail keeps the
	 * compact card and place internals (exits, stacked rows) stay here. */
	drawerPlaceMode?: boolean;
	/** Fired by the drawer's × (Esc is the caller's to own). */
	onDrawerClose?: () => void;
	/** Passed to the rail place card's Details toggle (opens the drawer). */
	onPlaceDetails?: () => void;
	/** maps chrome: Graphs chip. When false, hide the BR floor picker and show all levels. */
	indoorEmphasis?: boolean;
	/** Show the optional outdoor PMTiles art. Default false; vectors stay above it. */
	satellite?: boolean;
	/** Reports whether the gateway style advertises an installed outdoor archive. */
	onSatelliteAvailability?: (available: boolean) => void;
	/** Play MapTile gate echo; occupancy/radar stay off when false. */
	overlay?: boolean;
	onPlaceClick?: (place: Place) => void;
	/** Fired when the selected place is cleared (empty map click or Escape). */
	onPlaceClear?: () => void;
	/** Replace the default tag list and node-id copy control; header/search remain shared. */
	placeDetails?: Snippet<[Place]>;
	/** Optional product-specific wording. Omitted kinds keep the maps app defaults. */
	notices?: MapNoticeCopy;
	/** Observe lifecycle notices; consumers choose which fields to publish. */
	onNotice?: (notice: MapNotice) => void;
	/**
	 * The seat marker: the caller's own occupied places and the entity ids
	 * that are "mine". Read in every mode (Play passes the hero's own place at
	 * `medium` too, sk-jay0.1.8.100 s6); empty draws no marker. The marker
	 * flies the camera to each new seat, except under `followPlace` while a
	 * place is linked. Only the `maps` chrome hides the marker on another
	 * floor; elsewhere it is always shown.
	 */
	minePlaces?: ActorPlace[];
	mineEntityIds?: string[];
	/**
	 * `full`-only observer occupancy. Play omits this. Markers resolve via
	 * Overpass like the seat pin; they never replace `minePlaces`.
	 */
	occupancyPlaces?: OccupancyPlace[];
	/** Overlay items with a resolved place (carried or on the node). */
	thingPlaces?: {
		entityId: string;
		placeNodeId: string;
		name: string;
		holderName?: string | null;
	}[];
	onActorClick?: (place: OccupancyPlace) => void;
	/** Reports the set of place-node ids the map has coordinates for (i.e.
	 * drew, or could draw, a marker for) after each occupancy sync. Nodes NOT
	 * in the set live in place graphs the map deliberately does not draw —
	 * callers use that to flag off-map actors instead of guessing from names. */
	onDrawableNodes?: (nodeIds: ReadonlySet<string>) => void;
	/** Substrate filter: "all" | "outdoor" | "indoor" | "tactical". Defaults to "all". */
	substrate?: import("./level-filter").SubstrateFilter;
	onSubstrateChange?: (substrate: import("./level-filter").SubstrateFilter) => void;
	/**
	 * Opt-in: show the stacked chrome's own "Substrate" filter buttons in the
	 * `full` floor panel. Default false, so Play shows none (sk-jay0.1.8.100
	 * s8). The `maps` chrome never renders this control; apps/maps keeps its
	 * own substrate control and drives the filter through `substrate`.
	 */
	substrateControl?: boolean;
	/**
	 * `full`-only: rendered inside the map's own left panel (the "Seats"
	 * disclosure) — apps/maps hands its `<SeatBoard>` through here today.
	 */
	children?: Snippet;
}

export type { SubstrateFilter } from "./level-filter";
export type { Place, PlaceRow } from "./place";
export type { ActorPlace, OccupancyPlace, SeatFlyTarget } from "./seat-location";
