import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { basename } from "node:path";

export async function startPackedRegistry(tarballs) {
	const packages = new Map();
	const archives = new Map();
	for (const path of tarballs) {
		const manifest = JSON.parse(execFileSync("tar", ["-xOf", path, "package/package.json"], { encoding: "utf8" }));
		const archive = readFileSync(path);
		const file = basename(path);
		const integrity = "sha512-" + createHash("sha512").update(archive).digest("base64");
		packages.set(manifest.name, { manifest, file, integrity });
		archives.set(file, archive);
	}

	const server = createServer((request, response) => {
		const requestUrl = new URL(request.url, "http://127.0.0.1");
		const path = decodeURIComponent(requestUrl.pathname.slice(1));
		const packed = packages.get(path);
		if (packed) {
			const { manifest, file, integrity } = packed;
			const version = manifest.version;
			response.setHeader("Content-Type", "application/json");
			response.end(JSON.stringify({
				name: manifest.name,
				"dist-tags": { latest: version },
				versions: { [version]: { ...manifest, dist: { tarball: url + file, integrity } } },
			}));
		} else if (archives.has(path)) {
			response.setHeader("Content-Type", "application/octet-stream");
			response.end(archives.get(path));
		} else {
			// Every other package comes from the public npm registry.
			response.writeHead(302, { Location: "https://registry.npmjs.org" + requestUrl.pathname + requestUrl.search });
			response.end();
		}
	});
	server.listen(0, "127.0.0.1");
	await once(server, "listening");
	const url = `http://127.0.0.1:${server.address().port}/`;
	return { server, url, manifests: Array.from(packages.values(), ({ manifest }) => manifest) };
}
