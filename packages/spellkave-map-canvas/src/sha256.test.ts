// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { sha256Bytes, sha256Hex } from "./sha256";

const encoder = new TextEncoder();
const hex = (bytes: Uint8Array) => [...bytes].map((n) => n.toString(16).padStart(2, "0")).join("");

afterEach(() => vi.unstubAllGlobals());

// FIPS 180-4 / NIST CAVP vectors: empty, one block, and a message that needs
// two padding blocks (56 bytes leaves no room for the length word).
it.each([
	["", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
	["abc", "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"],
	[
		"abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq",
		"248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
	],
])("pure-JS sha256(%j) matches the NIST vector", (input, expected) => {
	expect(hex(sha256Bytes(encoder.encode(input)))).toBe(expected);
});

it("pure-JS digest equals WebCrypto for arbitrary bytes", async () => {
	const bytes = new Uint8Array(1000).map((_, i) => (i * 7919) & 0xff);
	const subtle = hex(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)));
	expect(hex(sha256Bytes(bytes))).toBe(subtle);
	expect(await sha256Hex(bytes.buffer)).toBe(subtle);
});

it("sha256Hex takes the pure-JS path when crypto.subtle is absent", async () => {
	vi.stubGlobal("crypto", {});
	const bytes = encoder.encode("abc");
	expect(await sha256Hex(bytes.buffer)).toBe(
		"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
	);
});
