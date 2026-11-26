import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

export const TILEABILITY_SCHEMA = "spellkave-tileability/v1";
export const DEFAULT_MAX_EDGE_MAE = 12;

export interface TileabilityReport {
	schema: typeof TILEABILITY_SCHEMA;
	path: string;
	width: number;
	height: number;
	left_right_mae: number;
	top_bottom_mae: number;
	max_edge_mae: number;
	pass: boolean;
	preview_path: string | null;
}

function run(command: string, args: string[]): Buffer {
	const result = spawnSync(command, args, { encoding: "buffer", maxBuffer: 64 * 1024 * 1024 });
	if (result.status !== 0) {
		const err = (result.stderr ?? Buffer.from("")).toString("utf8").trim();
		throw new Error(`${command} failed: ${err || `exit ${result.status}`}`);
	}
	return result.stdout ?? Buffer.alloc(0);
}

function probeSize(path: string): { width: number; height: number } {
	const out = run("ffprobe", [
		"-v",
		"error",
		"-select_streams",
		"v:0",
		"-show_entries",
		"stream=width,height",
		"-of",
		"csv=p=0",
		path,
	])
		.toString("utf8")
		.trim();
	const [widthText, heightText] = out.split(",");
	const width = Number(widthText);
	const height = Number(heightText);
	if (!Number.isInteger(width) || !Number.isInteger(height) || width < 2 || height < 2) {
		throw new Error(`could not probe image size: ${path}`);
	}
	return { width, height };
}

function meanAbsDiff(a: Buffer, b: Buffer): number {
	if (a.length !== b.length || a.length === 0) {
		throw new Error("edge buffers must be the same non-zero length");
	}
	let sum = 0;
	for (let i = 0; i < a.length; i += 1) {
		sum += Math.abs(a[i] - b[i]);
	}
	return sum / a.length;
}

function edgeStrip(
	pixels: Buffer,
	width: number,
	height: number,
	kind: "left" | "right" | "top" | "bottom",
): Buffer {
	const stride = width * 4;
	if (kind === "left" || kind === "right") {
		const x = kind === "left" ? 0 : width - 1;
		const strip = Buffer.alloc(height * 4);
		for (let y = 0; y < height; y += 1) {
			pixels.copy(strip, y * 4, y * stride + x * 4, y * stride + x * 4 + 4);
		}
		return strip;
	}
	const y = kind === "top" ? 0 : height - 1;
	return Buffer.from(pixels.subarray(y * stride, y * stride + stride));
}

export function checkTileability(
	imagePath: string,
	options: { previewPath?: string; maxEdgeMae?: number } = {},
): TileabilityReport {
	const path = resolve(imagePath);
	const { width, height } = probeSize(path);
	const pixels = run("ffmpeg", [
		"-v",
		"error",
		"-i",
		path,
		"-f",
		"rawvideo",
		"-pix_fmt",
		"rgba",
		"pipe:1",
	]);
	if (pixels.length !== width * height * 4) {
		throw new Error(`unexpected raw frame size for ${path}`);
	}
	const leftRight = meanAbsDiff(
		edgeStrip(pixels, width, height, "left"),
		edgeStrip(pixels, width, height, "right"),
	);
	const topBottom = meanAbsDiff(
		edgeStrip(pixels, width, height, "top"),
		edgeStrip(pixels, width, height, "bottom"),
	);
	const maxEdgeMae = options.maxEdgeMae ?? DEFAULT_MAX_EDGE_MAE;
	let previewPath: string | null = null;
	if (options.previewPath) {
		previewPath = resolve(options.previewPath);
		mkdirSync(dirname(previewPath), { recursive: true });
		run("ffmpeg", [
			"-v",
			"error",
			"-y",
			"-i",
			path,
			"-filter_complex",
			"[0]split=3[a][b][c];[a][b][c]hstack=3[row];[row]split=3[d][e][f];[d][e][f]vstack=3",
			previewPath,
		]);
	}
	return {
		schema: TILEABILITY_SCHEMA,
		path,
		width,
		height,
		left_right_mae: Number(leftRight.toFixed(3)),
		top_bottom_mae: Number(topBottom.toFixed(3)),
		max_edge_mae: maxEdgeMae,
		pass: leftRight <= maxEdgeMae && topBottom <= maxEdgeMae,
		preview_path: previewPath,
	};
}
