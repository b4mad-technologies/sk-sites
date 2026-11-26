import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pngSize } from "./pixellab-png.ts";

function runFfmpeg(args: string[]): Buffer {
	const dir = mkdtempSync(join(tmpdir(), "spellkave-overlay-"));
	const outPath = join(dir, "out.png");
	try {
		const result = spawnSync(
			"ffmpeg",
			["-y", ...args, "-frames:v", "1", "-pix_fmt", "rgba", outPath],
			{
				encoding: "utf8",
			},
		);
		if (result.status !== 0) {
			throw new Error(result.stderr || "ffmpeg overlay compose failed");
		}
		return readFileSync(outPath);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

/**
 * Alpha-over overlay onto base. Same canvas required; no resampling.
 */
export function composeOverlayPng(base: Buffer, overlay: Buffer): Buffer {
	const baseSize = pngSize(base);
	const overlaySize = pngSize(overlay);
	if (baseSize.width !== overlaySize.width || baseSize.height !== overlaySize.height) {
		throw new Error(
			`overlay compose requires identical canvas, got ${baseSize.width}x${baseSize.height} vs ${overlaySize.width}x${overlaySize.height}`,
		);
	}
	const dir = mkdtempSync(join(tmpdir(), "spellkave-overlay-"));
	const basePath = join(dir, "base.png");
	const overlayPath = join(dir, "overlay.png");
	try {
		writeFileSync(basePath, base);
		writeFileSync(overlayPath, overlay);
		return runFfmpeg([
			"-i",
			basePath,
			"-i",
			overlayPath,
			"-filter_complex",
			"[0:v]format=rgba[b];[1:v]format=rgba[o];[b][o]overlay=0:0:format=auto",
		]);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

/**
 * Place a smaller badge at the bottom-right of the base sprite with a 1px
 * cream outline. No resampling.
 */
export function composeBadgePng(base: Buffer, badge: Buffer): Buffer {
	const baseSize = pngSize(base);
	const badgeSize = pngSize(badge);
	if (badgeSize.width + 2 > baseSize.width || badgeSize.height + 2 > baseSize.height) {
		throw new Error(
			`badge ${badgeSize.width}x${badgeSize.height} does not fit on ${baseSize.width}x${baseSize.height} with a 1px outline`,
		);
	}
	const dir = mkdtempSync(join(tmpdir(), "spellkave-badge-"));
	const basePath = join(dir, "base.png");
	const badgePath = join(dir, "badge.png");
	try {
		writeFileSync(basePath, base);
		writeFileSync(badgePath, badge);
		return runFfmpeg([
			"-i",
			basePath,
			"-i",
			badgePath,
			"-filter_complex",
			[
				"[1:v]format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lte(r(X,Y)+g(X,Y)+b(X,Y),40),0,if(lt(abs(r(X,Y)-42)+abs(g(X,Y)-45)+abs(b(X,Y)-40),36),0,alpha(X,Y)))',pad=iw+2:ih+2:1:1:black@0,split=3[badge][masksrc][keep]",
				"[masksrc]alphaextract,dilation[mask]",
				"[badge]geq=r=230:g=220:b=192:a=0[cream]",
				"[cream][mask]alphamerge[outline]",
				"[outline][keep]overlay=0:0:format=auto[badged]",
				"[0:v]format=rgba[base]",
				"[base][badged]overlay=W-w:H-h:format=auto",
			].join(";"),
		]);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

export function overlayEntryId(template: string): string {
	return `overlay-${template}`;
}

export function badgeEntryId(family: string): string {
	return `badge-${family}`;
}
