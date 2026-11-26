// A content author checking a material swatch relies on the tileability check
// to accept a seamless tile and reject a gradient. Needs ffmpeg, so CI skips it.
// keep-file(K1): tileability rule cases over a pure image check
import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { checkTileability } from "./tileability.ts";

// Triton CI deliberately carries no ffmpeg; raster tileability checks run on
// author machines that create or review image assets.
const hasFfmpeg = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status === 0;

function lavfi(filter: string, dest: string): void {
	const result = spawnSync(
		"ffmpeg",
		["-v", "error", "-y", "-f", "lavfi", "-i", filter, "-frames:v", "1", dest],
		{ encoding: "utf8" },
	);
	if (result.status !== 0) {
		throw new Error(result.stderr || "ffmpeg lavfi failed");
	}
}

describe("tileability", () => {
	let root = "";
	afterEach(async () => {
		if (root) await rm(root, { recursive: true, force: true });
	});

	it.skipIf(!hasFfmpeg)("accepts a uniform swatch and writes a 3x3 preview", async () => {
		root = await mkdtemp(join(tmpdir(), "spellkave-tile-"));
		const image = join(root, "solid.png");
		const preview = join(root, "solid-3x3.png");
		lavfi("color=c=0xD3A342:s=32x32", image);
		const report = checkTileability(image, { previewPath: preview });
		expect(report.pass).toBe(true);
		expect(report.left_right_mae).toBe(0);
		expect(report.top_bottom_mae).toBe(0);
		expect(report.preview_path).toBe(preview);
	});

	it.skipIf(!hasFfmpeg)("rejects a gradient whose opposite edges do not match", async () => {
		root = await mkdtemp(join(tmpdir(), "spellkave-tile-"));
		const image = join(root, "gradient.png");
		lavfi("gradients=s=32x32:c0=0x061522:c1=0xF2E2BD", image);
		const report = checkTileability(image);
		expect(report.pass).toBe(false);
		expect(report.left_right_mae + report.top_bottom_mae).toBeGreaterThan(12);
	});
});
