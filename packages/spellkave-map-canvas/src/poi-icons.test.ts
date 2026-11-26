import { describe, expect, it } from "vitest";
import {
	createPoiMarkerElement,
	getPoiGlyphSvg,
	POI_DEFAULT_COLORS,
	registerPoiImages,
	renderPoiPinSvg,
	resolvePoiColor,
} from "./poi-icons";

describe("poi-icons schema-driven styling", () => {
	it("resolves default category and icon colors", () => {
		expect(resolvePoiColor("inn")).toBe(POI_DEFAULT_COLORS.inn);
		expect(resolvePoiColor("tavern")).toBe(POI_DEFAULT_COLORS.tavern);
		expect(resolvePoiColor("portal")).toBe(POI_DEFAULT_COLORS.portal);
		expect(resolvePoiColor("unknown", "hospitality")).toBe(POI_DEFAULT_COLORS.hospitality);
		expect(resolvePoiColor("unknown", undefined, "#123456")).toBe("#123456");
		expect(resolvePoiColor("something_random")).toBe(POI_DEFAULT_COLORS.default);
	});

	it("returns valid SVG glyphs for known icons and default for unknown", () => {
		expect(getPoiGlyphSvg("inn")).toContain("<path");
		expect(getPoiGlyphSvg("portal")).toContain("<path");
		expect(getPoiGlyphSvg("dungeon")).toContain("<path");
		expect(getPoiGlyphSvg("unsupported_icon_xyz")).toBe(getPoiGlyphSvg("default"));
	});

	it("constructs an HTML pin element with badge and label", () => {
		const pin = createPoiMarkerElement({
			icon: "inn",
			label: "Cozy Inn",
			badge: "Rest",
			color: "#f59e0b",
		});
		expect(pin.className).toBe("spellkave-poi-marker");
		expect(pin.textContent).toContain("Rest");
		expect(pin.textContent).toContain("Cozy Inn");
		expect(pin.innerHTML).toContain("<svg");
	});

	it("renders standalone SVG pins with correct styling and selection highlight", () => {
		const normalSvg = renderPoiPinSvg("camp", { selected: false });
		expect(normalSvg).toContain("<svg");
		expect(normalSvg).toContain(POI_DEFAULT_COLORS.camp);
		expect(normalSvg).toContain('stroke="#ffffff"');

		const selectedSvg = renderPoiPinSvg("camp", { selected: true });
		expect(selectedSvg).toContain("<svg");
		expect(selectedSvg).toContain('stroke="#f4a261"');
	});

	it("registers POI images into a MapImageRegistry", async () => {
		const images = new Map<string, unknown>();
		const mockMap = {
			hasImage: (id: string) => images.has(id),
			addImage: (id: string, img: unknown) => {
				images.set(id, img);
			},
		};

		await registerPoiImages(mockMap);
		expect(images.has("poi-camp")).toBe(true);
		expect(images.has("poi-selected-camp")).toBe(true);
		expect(images.has("poi-inn")).toBe(true);
		expect(images.has("poi-selected-inn")).toBe(true);
		expect(images.has("poi-default")).toBe(true);
		expect(images.has("poi-selected-default")).toBe(true);
	});
});
