/**
 * Strip scripts and handlers from a world-rendered map SVG before a widget
 * inlines it with `{@html}`. Returns undefined when the input is not an SVG
 * document (or there is no DOM to parse it with, e.g. in a bare Node test).
 */
export function sanitiseSvg(raw: unknown): string | undefined {
	if (typeof raw !== "string") return undefined;
	const trimmed = raw.trim();
	if (!trimmed.toLowerCase().startsWith("<svg")) return undefined;
	if (typeof DOMParser === "undefined") return undefined;
	const doc = new DOMParser().parseFromString(trimmed, "image/svg+xml");
	if (doc.querySelector("parsererror")) return undefined;
	const root = doc.documentElement;
	if (root.tagName.toLowerCase() !== "svg") return undefined;
	for (const node of Array.from(doc.querySelectorAll("script, foreignObject"))) {
		node.remove();
	}
	for (const el of Array.from(doc.querySelectorAll("*"))) {
		for (const attr of Array.from(el.attributes)) {
			const name = attr.name.toLowerCase();
			const value = attr.value.trim().toLowerCase();
			if (name.startsWith("on") || value.startsWith("javascript:")) {
				el.removeAttribute(attr.name);
			}
		}
	}
	root.setAttribute("width", "100%");
	root.setAttribute("height", "100%");
	return new XMLSerializer().serializeToString(root);
}
