// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { loadWorldImage } from "./world-assets";

const reference = { path: "srd-art/item/rations.webp", hash: "a".repeat(64) };
afterEach(() => vi.unstubAllGlobals());

it.each([
	[new Response("<html>login</html>", { headers: { "content-type": "text/html" } }), "media"],
	[
		new Response(new Uint8Array(8 * 1024 * 1024 + 1), {
			headers: { "content-type": "image/webp" },
		}),
		"size",
	],
] as const)("rejects unusable bytes before rendering", async (response, reason) => {
	vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
	await expect(
		loadWorldImage(
			reference,
			"https://gateway.example",
			"world",
			"secret",
			new AbortController().signal,
		),
	).rejects.toMatchObject({ reason });
});

it.each([
	[404, "missing"],
	[401, "access"],
	[403, "access"],
	[503, "transport"],
])("classifies HTTP %s without exposing server details", async (status, reason) => {
	vi.stubGlobal(
		"fetch",
		vi.fn().mockResolvedValue(new Response("private server details", { status: Number(status) })),
	);
	await expect(
		loadWorldImage(
			reference,
			"https://gateway.example",
			"world",
			"secret",
			new AbortController().signal,
		),
	).rejects.toMatchObject({ reason, message: `world asset ${reason}` });
});

// A plain-HTTP dev origin (http://100.x.y.z:5174) has no `crypto.subtle`;
// the integrity check must still run, not surface as "transport".
it.each([
	["ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", "resolves"],
	["b".repeat(64), "integrity"],
])("verifies integrity without crypto.subtle (hash %s → %s)", async (hash, outcome) => {
	vi.stubGlobal("crypto", {});
	vi.stubGlobal(
		"fetch",
		vi.fn().mockResolvedValue(
			new Response(new TextEncoder().encode("abc"), {
				headers: { "content-type": "image/webp" },
			}),
		),
	);
	const load = loadWorldImage(
		{ path: reference.path, hash },
		"https://gateway.example",
		"world",
		"secret",
		new AbortController().signal,
	);
	if (outcome === "resolves") {
		await expect(load).resolves.toBeInstanceOf(Blob);
	} else {
		await expect(load).rejects.toMatchObject({ reason: "integrity" });
	}
});

it("does not retain network diagnostics that can contain credentials", async () => {
	vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("private URL and credential")));
	await expect(
		loadWorldImage(
			reference,
			"https://gateway.example",
			"world",
			"secret",
			new AbortController().signal,
		),
	).rejects.toMatchObject({ reason: "transport", message: "world asset transport" });
});

it("preserves cancellation rather than reporting a failed image", async () => {
	const abort = new AbortController();
	const error = new DOMException("Cancelled", "AbortError");
	vi.stubGlobal(
		"fetch",
		vi.fn().mockImplementation(() => {
			abort.abort();
			throw error;
		}),
	);
	await expect(
		loadWorldImage(reference, "https://gateway.example", "world", "secret", abort.signal),
	).rejects.toBe(error);
});

it.each([
	"file:///tmp",
	"https://user:password@gateway.example",
	"not an origin",
])("does not send credentials to an invalid gateway %s", async (origin) => {
	const fetcher = vi.fn();
	vi.stubGlobal("fetch", fetcher);
	await expect(
		loadWorldImage(reference, origin, "world", "secret", new AbortController().signal),
	).rejects.toMatchObject({ reason: "connection" });
	expect(fetcher).not.toHaveBeenCalled();
});
