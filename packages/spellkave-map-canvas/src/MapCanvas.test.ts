import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, waitFor } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it, vi } from "vitest";
import MapCanvas from "./MapCanvas.svelte";

const componentSource = readFileSync(resolve(import.meta.dirname, "MapCanvas.svelte"), "utf8");

describe("MapCanvas — maplibre-gl stays out of the module's top level", () => {
	it("never imports maplibre-gl as a value at module scope", () => {
		// Only `import type` bindings to "maplibre-gl" are allowed at the top —
		// a real (non type-only) top-level import would ship the ~207 KB
		// dependency to every consumer whether or not the canvas ever mounts.
		const staticValueImport = /^import\s+(?!type\b)\S[^;]*from\s+["']maplibre-gl["'];?$/m;
		expect(componentSource).not.toMatch(staticValueImport);
	});

	it("loads maplibre-gl and its stylesheet lazily via dynamic import", () => {
		expect(componentSource).toMatch(/import\(\s*["']maplibre-gl["']\s*\)/);
		expect(componentSource).toMatch(/import\(\s*["']maplibre-gl\/dist\/maplibre-gl\.css["']\s*\)/);
	});

	it("wires occupancy pins and vector POI images through the lazy full-mode path", () => {
		expect(componentSource).toContain("occupancy-marker");
		expect(componentSource).toContain("syncOccupancyMarkers");
		expect(componentSource).toContain("registerPoiImages");
		expect(componentSource).toContain("setupPoiMissingImageHandler");
		expect(componentSource).toContain('"poi-symbol"');
	});

	it("maps chrome keeps a search rail, a floor control, the opt-in substrate control, and map legend", () => {
		expect(componentSource).toContain('chrome = "stacked"');
		expect(componentSource).toContain('data-testid="search-results"');
		expect(componentSource).toContain('data-testid="floor-control"');
		expect(componentSource).toContain('data-testid="substrate-control"');
		expect(componentSource).toContain("{#if substrateControl}");
		expect(componentSource).toContain("<MapLegend");
		expect(componentSource).toContain("place-hover");
	});

	it("maps chrome uses an expanded bottom-right imprint and a metric scale", () => {
		expect(componentSource).toContain("compact: false");
		expect(componentSource).toContain('"bottom-right"');
		expect(componentSource).toContain("ScaleControl");
	});
});

describe("MapCanvas — mode gates the surrounding chrome", () => {
	it.each([false, true])("selected-place content is consumer replaceable: %s", async (custom) => {
		vi.stubGlobal(
			"fetch",
			vi.fn(
				async (url: string) =>
					new Response(
						JSON.stringify(
							url.includes("interpreter")
								? {
										elements: [
											{
												type: "node",
												id: 1,
												lat: 1,
												lon: 2,
												tags: {
													name: "Orbital garden",
													description: "Quiet plants.",
													"spellkave:node_id": "orbital/garden",
												},
											},
										],
									}
								: url.includes("style.json")
									? { version: 8, sources: {}, layers: [] }
									: { loaded: true },
						),
					),
			),
		);
		const placeDetails = createRawSnippet(() => ({ render: () => "<p>Consumer guide</p>" }));
		const rendered = render(MapCanvas, {
			gatewayOrigin: "https://gw.example",
			slug: "orbital",
			token: "tok",
			mode: "full",
			placeNodeId: "orbital/garden",
			...(custom ? { placeDetails } : {}),
		});
		try {
			await waitFor(() =>
				expect(rendered.getByTestId("place-panel").textContent).toContain("Orbital garden"),
			);
			expect(rendered.queryByText("Consumer guide") !== null).toBe(custom);
			expect(rendered.queryByRole("button", { name: "Copy link" }) !== null).toBe(!custom);
			expect(rendered.queryByText("spellkave:node_id") !== null).toBe(!custom);
			expect(rendered.getByRole("button", { name: "Close place" })).toBeTruthy();
		} finally {
			rendered.unmount();
			vi.unstubAllGlobals();
		}
	});

	it.each([
		"medium",
		"full",
	] as const)("%s renders consumer blocked copy while retaining its status", async (mode) => {
		const notices: string[] = [];
		const { getByTestId } = render(MapCanvas, {
			gatewayOrigin: "",
			slug: "world",
			token: "",
			mode,
			notices: { blocked: "Reconnect to this world to open its map." },
			onNotice: (notice) => notices.push(notice.kind),
		});
		await waitFor(() => {
			const status = getByTestId("map-status");
			expect(status.getAttribute("data-notice")).toBe("blocked");
			expect(status.textContent).toContain("Reconnect to this world to open its map.");
			expect(status.textContent).not.toContain("Sign in");
			expect(notices).toContain("blocked");
		});
	});

	it("medium: map container only, no search/floor/place-panel chrome", () => {
		const { getByTestId, queryByTestId } = render(MapCanvas, {
			gatewayOrigin: "https://gw.example",
			slug: "kavemouth",
			token: "tok",
			mode: "medium",
		});
		const canvas = getByTestId("map-canvas");
		expect(canvas.getAttribute("data-map-mode")).toBe("medium");
		expect(queryByTestId("map-ui")).toBeNull();
		expect(queryByTestId("search-input")).toBeNull();
		expect(queryByTestId("floor-picker")).toBeNull();
		// A minimal status line still exists — a blank map on failure is bad UX
		// even at medium.
		expect(getByTestId("map-status")).toBeTruthy();
	});

	it("full: search, floor picker, and the place aside are present", () => {
		const { getByTestId } = render(MapCanvas, {
			gatewayOrigin: "https://gw.example",
			slug: "kavemouth",
			token: "tok",
			mode: "full",
		});
		expect(getByTestId("map-ui")).toBeTruthy();
		expect(getByTestId("search-input")).toBeTruthy();
		expect(getByTestId("floor-picker")).toBeTruthy();
	});

	it("blocked state (no token), medium: renders without crashing", async () => {
		const { getByTestId } = render(MapCanvas, {
			gatewayOrigin: "",
			slug: "",
			token: "",
			mode: "medium",
		});
		await waitFor(() => {
			expect(getByTestId("map-status").getAttribute("data-notice")).toBe("blocked");
		});
	});

	it("blocked state (no token), full: renders without crashing", async () => {
		const { getByTestId } = render(MapCanvas, {
			gatewayOrigin: "",
			slug: "",
			token: "",
			mode: "full",
		});
		await waitFor(() => {
			expect(getByTestId("map-status").getAttribute("data-notice")).toBe("blocked");
		});
	});
});
