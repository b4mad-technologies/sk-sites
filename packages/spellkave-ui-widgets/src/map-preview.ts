export interface PreviewBounds {
	x: number;
	y: number;
	width: number;
	height: number;
}

/** A symmetric view around the current mark, including supplied nearby geometry. */
export function previewViewBox(focus: PreviewBounds, nearby: PreviewBounds[]): string | undefined {
	const boxes = [focus, ...nearby];
	if (boxes.some((box) => ![box.x, box.y, box.width, box.height].every(Number.isFinite)))
		return undefined;
	const cx = focus.x + focus.width / 2;
	const cy = focus.y + focus.height / 2;
	const rx =
		Math.max(
			40,
			...boxes.flatMap((box) => [Math.abs(box.x - cx), Math.abs(box.x + box.width - cx)]),
		) + 16;
	const ry =
		Math.max(
			30,
			...boxes.flatMap((box) => [Math.abs(box.y - cy), Math.abs(box.y + box.height - cy)]),
		) + 16;
	return `${cx - rx} ${cy - ry} ${rx * 2} ${ry * 2}`;
}
