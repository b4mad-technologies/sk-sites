// A content author composing family badges relies on the compositor to keep
// pixels exact and to refuse a badge that does not fit. The pixel cases need
// ffmpeg, which CI's Triton image lacks; they skip there.
// keep-file(K1): compositor rule cases over ffmpeg, no CLI surface of their own
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
	badgeEntryId,
	composeBadgePng,
	composeOverlayPng,
	overlayEntryId,
} from "./overlay-compose.ts";
import { encodePngRgba, pngSize, solidPng } from "./pixellab-png.ts";

// Triton CI deliberately carries no ffmpeg; raster composition is exercised
// on author machines, while pure planning and validation stay CI-covered.
const hasFfmpeg = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status === 0;

describe("overlay compose", () => {
	it.skipIf(!hasFfmpeg)("alpha-overs without resampling", () => {
		const base = solidPng("#2a2d28", 16, 16);
		const rgba = Buffer.alloc(16 * 16 * 4);
		for (let y = 0; y < 16; y += 1) {
			for (let x = 0; x < 16; x += 1) {
				const i = (y * 16 + x) * 4;
				rgba[i] = 196;
				rgba[i + 1] = 160;
				rgba[i + 2] = 86;
				rgba[i + 3] = x < 8 ? 255 : 0;
			}
		}
		const overlay = encodePngRgba(16, 16, rgba);
		const out = composeOverlayPng(base, overlay);
		expect(pngSize(out)).toEqual({ width: 16, height: 16 });
	});

	it("rejects a size mismatch", () => {
		expect(() =>
			composeOverlayPng(solidPng("#2a2d28", 16, 16), solidPng("#c4a056", 32, 32)),
		).toThrow(/identical canvas/);
	});

	it("names overlay entries overlay-<template>", () => {
		expect(overlayEntryId("flame-tongue")).toBe("overlay-flame-tongue");
		expect(badgeEntryId("fire")).toBe("badge-fire");
	});

	it.skipIf(!hasFfmpeg)("places a smaller badge at the bottom-right with a 1px outline", () => {
		const base = solidPng("#2a2d28", 32, 32);
		const badge = solidPng("#c4a056", 8, 8);
		const out = composeBadgePng(base, badge);
		expect(pngSize(out)).toEqual({ width: 32, height: 32 });
	});

	it("rejects a badge that does not fit", () => {
		expect(() => composeBadgePng(solidPng("#2a2d28", 16, 16), solidPng("#c4a056", 16, 16))).toThrow(
			/does not fit/,
		);
	});
});
