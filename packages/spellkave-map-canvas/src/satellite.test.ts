import { describe, expect, it, vi } from "vitest";
import { satelliteDescriptor, setSatelliteVisibility } from "./satellite";

describe("satellite layer", () => {
	it("reads the gateway descriptor and ignores incomplete metadata", () => {
		expect(satelliteDescriptor({ metadata: {} })).toBeNull();
		expect(
			satelliteDescriptor({
				metadata: {
					"spellkave:satellite": {
						available: true,
						archive: "https://gateway/w/demo/satellite.pmtiles",
						source: "spellkave-satellite",
						layer: "spellkave-satellite",
					},
				},
			}),
		).toMatchObject({ available: true, layer: "spellkave-satellite" });
	});

	it("changes only the satellite layer visibility", () => {
		const setLayoutProperty = vi.fn();
		const map = {
			getLayer: vi.fn().mockReturnValue({ id: "spellkave-satellite" }),
			setLayoutProperty,
		};
		expect(setSatelliteVisibility(map, true)).toBe(true);
		expect(setLayoutProperty).toHaveBeenCalledWith("spellkave-satellite", "visibility", "visible");
		expect(setSatelliteVisibility({ getLayer: () => undefined, setLayoutProperty }, false)).toBe(
			false,
		);
	});
});
