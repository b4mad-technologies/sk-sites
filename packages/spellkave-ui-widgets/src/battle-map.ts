/**
 * True when the plate SVG carries at least one composed tactical-grid cell —
 * the marker the renderer draws only for a session grid, never for an
 * ordinary place: `class="grid-cell"` on the cell's `<rect>`, inside a
 * `<g data-node-id="...">` (`packages/spellkave-world-map/src/svg/render-svg.ts`,
 * the "Battle-map treatment for composed tactical-grid cells" block and its
 * `.grid-cell` style rule). A caller uses this to fall back to `PlaceMap`
 * when the plate it fetched is a plain place drawing.
 *
 * A plain regex check, not a DOM parse: this must stay usable outside a DOM
 * (a caller deciding which widget to render before either one mounts).
 */
export function hasGridCells(plate: string): boolean {
	return /class\s*=\s*"[^"]*\bgrid-cell\b[^"]*"/.test(plate);
}

/** One grid cell's box, straight off its `<rect class="grid-cell">`
 * attributes (`render-svg.ts` writes them as plain numbers, under no group
 * transform). */
export interface GridCellBox {
	x: number;
	y: number;
	width: number;
	height: number;
}

/**
 * The `viewBox` that frames exactly the tactical grid, with half a cell of
 * air around it. `spellkave_map` composes a session grid OVER its parent
 * place, so the plate's own `viewBox` spans the whole parent graph and the
 * grid is an inset a few pixels per cell — a fight in a four-room tomb drew
 * 7 px cells (live, 2026-09-19, sk-jay0.1.8.63.42). A fight is played on the
 * grid, so the grid is the frame. `null` when there is nothing to frame.
 */
export function gridViewBox(cells: readonly GridCellBox[]): string | null {
	const boxes = cells.filter(
		(cell) =>
			Number.isFinite(cell.x) &&
			Number.isFinite(cell.y) &&
			Number.isFinite(cell.width) &&
			Number.isFinite(cell.height) &&
			cell.width > 0 &&
			cell.height > 0,
	);
	if (boxes.length === 0) return null;
	const minX = Math.min(...boxes.map((cell) => cell.x));
	const minY = Math.min(...boxes.map((cell) => cell.y));
	const maxX = Math.max(...boxes.map((cell) => cell.x + cell.width));
	const maxY = Math.max(...boxes.map((cell) => cell.y + cell.height));
	const pad = Math.max(...boxes.map((cell) => Math.max(cell.width, cell.height))) / 2;
	const round = (value: number) => Math.round(value * 100) / 100;
	return [minX - pad, minY - pad, maxX - minX + 2 * pad, maxY - minY + 2 * pad]
		.map(round)
		.join(" ");
}
