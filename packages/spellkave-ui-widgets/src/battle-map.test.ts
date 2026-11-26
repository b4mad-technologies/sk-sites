import { describe, expect, it } from "vitest";
import { gridViewBox, hasGridCells } from "./battle-map";

describe("gridViewBox", () => {
	it("frames exactly the grid, with half a cell of air, whatever the plate around it spans", () => {
		// A 3x2 grid of 10-unit cells sitting at (400, 120) inside a much larger parent drawing.
		const cells = [0, 1, 2].flatMap((col) =>
			[0, 1].map((row) => ({ x: 400 + col * 10, y: 120 + row * 10, width: 10, height: 10 })),
		);
		expect(gridViewBox(cells)).toBe("395 115 40 30");
	});

	it("ignores boxes it cannot read and answers null when nothing is left", () => {
		expect(gridViewBox([])).toBeNull();
		expect(gridViewBox([{ x: Number.NaN, y: 0, width: 10, height: 10 }])).toBeNull();
		expect(gridViewBox([{ x: 0, y: 0, width: 0, height: 10 }])).toBeNull();
		expect(
			gridViewBox([
				{ x: Number.NaN, y: 0, width: 10, height: 10 },
				{ x: 20, y: 20, width: 8, height: 8 },
			]),
		).toBe("16 16 16 16");
	});
});

describe("hasGridCells", () => {
	it("is true only for a plate that carries a composed grid cell", () => {
		expect(hasGridCells('<svg><g data-node-id="a"><rect class="grid-cell" /></g></svg>')).toBe(
			true,
		);
		expect(hasGridCells('<svg><g data-node-id="a"><circle class="place" /></g></svg>')).toBe(false);
	});
});
