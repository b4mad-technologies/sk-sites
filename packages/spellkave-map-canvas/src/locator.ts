export type MapsResourceKind = "place" | "person" | "thing";

export const MAPS_LOCATOR_EVENT = "spellkave-maps-locator";

const RESOURCE_PATH = /^\/w\/([^/]+)\/(place|person|thing)\/(.+)$/;
const WORLD_PATH = /^\/w\/([^/]+)$/;

export type MapsLocator = {
	world: string | null;
	place: string | null;
	person: string | null;
	thing: string | null;
};

function emptyLocator(): MapsLocator {
	return { world: null, place: null, person: null, thing: null };
}

function decodePath(value: string): string {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

/** Path form only: /w/{world} or /w/{world}/place|person|thing/{id}. */
export function parseMapsLocator(href: string): MapsLocator {
	const url = new URL(href, "http://maps.local");
	const path = url.pathname.replace(/\/+$/, "") || "/";
	const resource = RESOURCE_PATH.exec(path);
	if (resource) {
		const out = emptyLocator();
		out.world = decodePath(resource[1] ?? "");
		out[resource[2] as MapsResourceKind] = decodePath(resource[3] ?? "");
		return out;
	}
	const world = WORLD_PATH.exec(path);
	if (world) {
		const out = emptyLocator();
		out.world = decodePath(world[1] ?? "");
		return out;
	}
	return emptyLocator();
}

export function buildWorldLocator(href: string, world: string): string {
	const url = new URL(href);
	url.pathname = `/w/${encodeURIComponent(world)}`;
	url.search = "";
	return url.toString();
}

/** Browser URL that names one world resource. */
export function buildMapsLocator(
	href: string,
	world: string,
	kind: MapsResourceKind,
	id: string,
): string {
	const url = new URL(href);
	url.pathname = `/w/${encodeURIComponent(world)}/${kind}/${id
		.split("/")
		.map((part) => encodeURIComponent(part))
		.join("/")}`;
	url.search = "";
	return url.toString();
}

export function publishMapsLocator(
	world: string,
	kind: MapsResourceKind,
	id: string,
	fly = false,
): string {
	const next = buildMapsLocator(window.location.href, world, kind, id);
	if (next === window.location.href) {
		if (fly) window.dispatchEvent(new CustomEvent(MAPS_LOCATOR_EVENT, { detail: { fly } }));
		return next;
	}
	window.history.pushState({ maps: true }, "", next);
	window.dispatchEvent(new CustomEvent(MAPS_LOCATOR_EVENT, { detail: { fly } }));
	return next;
}

export function publishWorldLocator(world: string): string {
	const next = buildWorldLocator(window.location.href, world);
	if (next === window.location.href) return next;
	window.history.replaceState({ maps: true }, "", next);
	return next;
}

/** Clipboard, including http://100.x Tailscale (no secure-context clipboard). */
export async function copyText(text: string): Promise<boolean> {
	try {
		if (navigator.clipboard?.writeText !== undefined) {
			await navigator.clipboard.writeText(text);
			return true;
		}
	} catch {
		// Not a secure context, or permission denied.
	}
	const field = document.createElement("textarea");
	field.value = text;
	field.setAttribute("readonly", "");
	field.style.position = "fixed";
	field.style.left = "-9999px";
	document.body.appendChild(field);
	field.select();
	const ok = document.execCommand("copy");
	field.remove();
	return ok;
}
