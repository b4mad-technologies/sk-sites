import { describe, expect, it } from "vitest";
import { previewViewBox } from "./map-preview";

describe("previewViewBox", () => {
	it("centres the current mark and retains nearby place labels", () => {
		const box = previewViewBox({ x: 90, y: 190, width: 20, height: 20 }, [
			{ x: 190, y: 250, width: 40, height: 30 },
		]);
		const [x, y, width, height] = box!.split(" ").map(Number);
		expect(x! + width! / 2).toBe(100);
		expect(y! + height! / 2).toBe(200);
		expect(x! + width!).toBeGreaterThan(230);
		expect(y! + height!).toBeGreaterThan(280);
	});
	it("gives an isolated point readable space and refuses invalid geometry", () => {
		expect(previewViewBox({ x: 0, y: 0, width: 0, height: 0 }, [])).toBe("-56 -46 112 92");
		expect(previewViewBox({ x: NaN, y: 0, width: 0, height: 0 }, [])).toBeUndefined();
	});
});
