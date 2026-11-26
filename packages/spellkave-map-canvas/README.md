# `@spellkave/map-canvas`

The MapLibre world map (`apps/maps`' canvas) as a mountable widget, extracted
so it also sits inside Play's map tile (sk-jay0.1.8.9). Both `apps/maps` and
`apps/play` consume it.

## Prop contract

```ts
{
  gatewayOrigin: string;
  slug: string;
  token: string;
  placeNodeId?: string;
  mode: "medium" | "full";
  onPlaceClick?: (place: Place) => void;
  placeDetails?: Snippet<[Place]>;
  notices?: MapNoticeCopy;
  onNotice?: (notice: MapNotice) => void;
}
```

- **`medium`** — map init, pan/zoom, tap a place (drops a marker, calls
  `onPlaceClick`), and the caller's own seat marker. No search box, floor
  switcher, or place panel.
- **`full`** — everything in `medium`, plus search, the floor switcher and the
  place detail panel.

The canvas opens at `placeNodeId`. `followPlace` (default `false`) makes the
prop reactive: the canvas selects and flies to each later value, unless that
place is already selected, and the follow owns the camera, so the seat marker
does not fly while a place is linked. A follow does not call `onPlaceClick`
(nobody picked the place); the boot selection and every pick still do. A
place lookup that a newer one overtook is dropped. Play turns `followPlace`
on; `apps/maps` leaves it off, so its link stays boot-only and its seat
marker flies as before. The seat marker is hidden on another floor only in
the `maps` chrome; elsewhere it is always shown.
`MapCanvas.camera.svelte.test.ts` covers the follow, the dropped lookup, the
seat-first update and the unchanged default.

The optional `placeDetails` snippet replaces the default tag list and node-id
copy control in the full panel. The shared heading, close button and search
navigation remain. Play supplies prose and floor information; Maps retains
the default inspector. The same `Place` data supports both presentations.
`notices` overrides lifecycle wording; `onNotice` reports lifecycle state.

Additional props extend the bead's literal contract, kept so `apps/maps` did
not lose its seat-marker behaviour when the component moved:
`minePlaces?: ActorPlace[]`, `mineEntityIds?: string[]` (who "my seat" is,
read in every mode; Play passes the hero's own place), and
`children?: Snippet` (`full` only, rendered inside the map's own "Seats"
disclosure — `apps/maps` hands its `<SeatBoard>` through here).

`substrateControl?: boolean` (default `false`) opts the stacked chrome into
its own "Substrate" filter buttons. Play leaves it off; the `maps` chrome
never renders them (apps/maps has its own control and passes `substrate`).

## Loading

`maplibre-gl` is a **peer dependency**, never imported at this package's
module top level. `MapCanvas.svelte` loads it — and its stylesheet — via a
dynamic `import()` inside its mount effect, so a consumer that never opens the
map never downloads it (~207 KB gzipped).

## World image assets

The framework-free `@spellkave/map-canvas/world-assets` entry exports
`loadWorldImage` and `WorldAssetError`. It shares `worldBase` and `authFetch`
with map requests and verifies admitted `{path, hash}` image references before
returning a Blob. The caller supplies the current token and cancellation signal. The companion
`@spellkave/map-canvas/world-artwork` component owns fetch state, object URL
lifetime, and bounded failure copy while preserving an app-owned state callback.
Neither entry resolves subjects or refreshes credentials. References remain
relative to the Adventure OCI assets root; the SDK remains the authority for
subject-art attachment resolution.

Failures distinguish missing assets, denied access, transport, invalid references,
unsupported media, oversized bytes and integrity mismatch. Error messages contain
only bounded categories. Tests cover these boundaries and Play's existing tests
cover valid bytes, hash checking and selection/credential lifecycle.

## Sizing

The consumer supplies a positioned container with a definite height. The canvas
fills that box (`absolute inset-0`) without imposing a minimum height. In full
mode, long place details scroll within the panel so the floor controls retain
their space; the sidebar width is bounded by the container, not the viewport.
MapLibre observes its map container for size changes; this component makes no
manual `map.resize()` call. A consumer resizes by resizing the container element.
