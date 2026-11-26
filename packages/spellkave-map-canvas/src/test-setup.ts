import { vi } from "vitest";

// MapLibre touches URL.createObjectURL at module load; jsdom lacks a worker blob URL.
if (typeof URL.createObjectURL !== "function") {
	URL.createObjectURL = () => "blob:maplibre-mock";
}
if (typeof URL.revokeObjectURL !== "function") {
	URL.revokeObjectURL = () => {};
}

// The component only ever reaches maplibre-gl through a dynamic `import()`
// inside its mount effect (never a module-top-level import) — vi.mock still
// intercepts that, static or dynamic, because both resolve the same specifier.
vi.mock("maplibre-gl", () => {
	/** Camera flights and markers, for tests that assert who moves the map. */
	const recorded = {
		flights: [] as Array<{ center?: unknown; zoom?: number }>,
		markers: [] as Array<{ element: HTMLElement | null; lngLat: unknown }>,
		reset() {
			recorded.flights.length = 0;
			recorded.markers.length = 0;
		},
	};
	class MockMap {
		// biome-ignore lint/suspicious/noExplicitAny: test double
		_handlers: Record<string, Array<(...args: any[]) => void>> = {};
		getCanvas() {
			return { style: {} } as unknown as HTMLCanvasElement;
		}
		addControl() {
			return this;
		}
		remove() {}
		getLayer() {
			return undefined;
		}
		setFilter() {}
		hasImage() {
			return false;
		}
		addImage() {}
		getBounds() {
			return {
				getWest: () => 0,
				getSouth: () => 0,
				getEast: () => 1,
				getNorth: () => 1,
			};
		}
		getZoom() {
			return 14;
		}
		flyTo(options: { center?: unknown; zoom?: number }) {
			recorded.flights.push(options);
		}
		easeTo() {}
		setFeatureState() {}
		removeFeatureState() {}
		queryRenderedFeatures() {
			return [];
		}
		// biome-ignore lint/suspicious/noExplicitAny: test double
		on(event: string, cb: (...args: any[]) => void) {
			const list = this._handlers[event] ?? [];
			list.push(cb);
			this._handlers[event] = list;
			if (event === "load") queueMicrotask(() => cb({}));
			return this;
		}
	}
	class Marker {
		entry: { element: HTMLElement | null; lngLat: unknown };
		constructor(options?: { element?: HTMLElement }) {
			this.entry = { element: options?.element ?? null, lngLat: null };
			recorded.markers.push(this.entry);
		}
		setLngLat(lngLat: unknown) {
			this.entry.lngLat = lngLat;
			return this;
		}
		getLngLat() {
			return this.entry.lngLat;
		}
		getElement() {
			if (this.entry.element === null) this.entry.element = document.createElement("div");
			return this.entry.element;
		}
		addTo() {
			return this;
		}
		remove() {}
	}
	class Popup {
		setLngLat() {
			return this;
		}
		setText() {
			return this;
		}
		setHTML() {
			return this;
		}
		addTo() {
			return this;
		}
		remove() {}
	}
	class NavigationControl {}
	return {
		setWorkerUrl: vi.fn(),
		Map: MockMap,
		Marker,
		Popup,
		NavigationControl,
		__recorded: recorded,
	};
});

vi.mock("maplibre-gl/dist/maplibre-gl.css", () => ({}));

vi.mock("maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url", () => ({
	default: "/mock-map-worker.js",
}));
