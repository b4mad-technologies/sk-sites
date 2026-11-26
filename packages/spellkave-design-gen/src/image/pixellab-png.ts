import { crc32, deflateSync } from "node:zlib";

function chunk(type: string, data: Buffer): Buffer {
	const typeBuf = Buffer.from(type, "ascii");
	const length = Buffer.alloc(4);
	length.writeUInt32BE(data.length);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])) >>> 0);
	return Buffer.concat([length, typeBuf, data, crc]);
}

export function encodePngRgba(width: number, height: number, rgba: Buffer): Buffer {
	if (width < 1 || height < 1) throw new Error("PNG dimensions must be positive");
	if (rgba.length !== width * height * 4) {
		throw new Error("RGBA buffer length must be width * height * 4");
	}
	const stride = width * 4 + 1;
	const raw = Buffer.alloc(stride * height);
	for (let y = 0; y < height; y += 1) {
		raw[y * stride] = 0;
		rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
	}
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(width, 0);
	ihdr.writeUInt32BE(height, 4);
	ihdr[8] = 8;
	ihdr[9] = 6;
	return Buffer.concat([
		Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
		chunk("IHDR", ihdr),
		chunk("IDAT", deflateSync(raw, { level: 9 })),
		chunk("IEND", Buffer.alloc(0)),
	]);
}

export function parseHexColor(value: string): [number, number, number] {
	const hex = value.replace(/^#/, "");
	if (!/^[0-9a-fA-F]{6}$/.test(hex)) throw new Error(`invalid hex color: ${value}`);
	return [
		Number.parseInt(hex.slice(0, 2), 16),
		Number.parseInt(hex.slice(2, 4), 16),
		Number.parseInt(hex.slice(4, 6), 16),
	];
}

export function paletteStripPng(colors: readonly string[], swatch = 8): Buffer {
	if (colors.length === 0) throw new Error("palette requires at least one color");
	const width = colors.length * swatch;
	const height = swatch;
	const rgba = Buffer.alloc(width * height * 4);
	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			const [r, g, b] = parseHexColor(colors[Math.floor(x / swatch)] as string);
			const i = (y * width + x) * 4;
			rgba[i] = r;
			rgba[i + 1] = g;
			rgba[i + 2] = b;
			rgba[i + 3] = 255;
		}
	}
	return encodePngRgba(width, height, rgba);
}

export function solidPng(color: string, width: number, height: number): Buffer {
	const [r, g, b] = parseHexColor(color);
	const rgba = Buffer.alloc(width * height * 4);
	for (let i = 0; i < width * height; i += 1) {
		rgba[i * 4] = r;
		rgba[i * 4 + 1] = g;
		rgba[i * 4 + 2] = b;
		rgba[i * 4 + 3] = 255;
	}
	return encodePngRgba(width, height, rgba);
}

export function pngSize(png: Buffer): { width: number; height: number } {
	if (png.length < 24 || png.subarray(1, 4).toString("ascii") !== "PNG") {
		throw new Error("buffer is not a PNG");
	}
	return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}
