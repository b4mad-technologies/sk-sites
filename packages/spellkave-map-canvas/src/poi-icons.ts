/**
 * Catalog of pure SVG pictograms for schema-driven POI icons (ADR-0073 / ADR-0130).
 *
 * Driven by 'maps.poi' metadata attachments projected onto vector tile tags:
 * - 'spellkave:poi_icon'
 * - 'spellkave:poi_category'
 * - 'spellkave:poi_badge'
 * - 'spellkave:poi_color'
 *
 * Zero adventure or SRD-CC specific knowledge: purely generic icon catalog.
 */

export const POI_DEFAULT_COLORS: Readonly<Record<string, string>> = {
	inn: "#f59e0b",
	tavern: "#f59e0b",
	bed: "#f59e0b",
	hospitality: "#f59e0b",
	portal: "#a855f7",
	entrance: "#a855f7",
	transit: "#a855f7",
	dungeon: "#ef4444",
	crypt: "#dc2626",
	skull: "#b91c1c",
	danger: "#ef4444",
	cave: "#78716c",
	cavern: "#78716c",
	temple: "#eab308",
	shrine: "#eab308",
	shop: "#10b981",
	market: "#10b981",
	smithy: "#059669",
	camp: "#84cc16",
	tent: "#84cc16",
	well: "#0284c7",
	water: "#0284c7",
	tower: "#6366f1",
	castle: "#4f46e5",
	chest: "#d97706",
	tactical: "#e11d48",
	combat: "#e11d48",
	default: "#64748b",
};

/** Compact SVG path definitions for standard POI glyphs (viewBox: 0 0 24 24). */
const ICONS_SVG: Readonly<Record<string, string>> = {
	// Tavern mug / tankard
	inn: `<path d="M5 4h10v12a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V4zm10 3h3a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-3V7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 2v2m4-2v2m4-2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
	tavern: `<path d="M5 4h10v12a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V4zm10 3h3a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-3V7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 2v2m4-2v2m4-2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
	bed: `<path d="M2 19h20M2 13h20M4 13V8a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 17v2m20-2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,

	// Swirling portal / gateway
	portal: `<path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 4a6 6 0 1 1-6 6 6 6 0 0 1 6-6zm0 3a3 3 0 1 0 3 3 3 3 0 0 0-3-3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
	entrance: `<path d="M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16M2 21h20M14 12v.01" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,

	// Skull / crypt / dungeon
	skull: `<path d="M12 2a7 7 0 0 0-7 7c0 3 1.5 5 2.5 6.5V19a2 2 0 0 0 2 2h5a2 2 0 0 0 2-2v-3.5C17.5 14 19 12 19 9a7 7 0 0 0-7-7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="9" cy="10" r="1.5" fill="currentColor"/><circle cx="15" cy="10" r="1.5" fill="currentColor"/><path d="M10 17v2m4-2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
	crypt: `<path d="M12 2a7 7 0 0 0-7 7c0 3 1.5 5 2.5 6.5V19a2 2 0 0 0 2 2h5a2 2 0 0 0 2-2v-3.5C17.5 14 19 12 19 9a7 7 0 0 0-7-7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="9" cy="10" r="1.5" fill="currentColor"/><circle cx="15" cy="10" r="1.5" fill="currentColor"/><path d="M10 17v2m4-2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
	dungeon: `<path d="M3 21h18M5 21V9a7 7 0 0 1 14 0v12M9 10v11m6-11v11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,

	// Cave mouth
	cave: `<path d="M3 20h18c-1-6-3.5-12-9-12S4 14 3 20z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M8 20c.5-3 2-6 4-6s3.5 3 4 6" fill="currentColor"/>`,
	cavern: `<path d="M3 20h18c-1-6-3.5-12-9-12S4 14 3 20z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M8 20c.5-3 2-6 4-6s3.5 3 4 6" fill="currentColor"/>`,

	// Temple / shrine
	temple: `<path d="M2 7l10-5 10 5M4 10v10m5-10v10m6-10v10m5-10v10M2 21h20M2 7h20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
	shrine: `<path d="M12 3v4m-4-2h8M5 10h14M7 10v10m10-10v10M4 21h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,

	// Shop / pouch
	shop: `<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
	market: `<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
	smithy: `<path d="M4 7h16l-3 4H7zM7 11v6a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-6M4 21h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,

	// Camp / tent
	camp: `<path d="M12 3L2 20h20L12 3zm0 0v17M8 20l4-7 4 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
	tent: `<path d="M12 3L2 20h20L12 3zm0 0v17M8 20l4-7 4 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,

	// Well / water source
	well: `<ellipse cx="12" cy="7" rx="8" ry="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 7v10c0 2.2 3.6 4 8 4s8-1.8 8-4V7M12 3v4M6 5v6m12-6v6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
	water: `<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,

	// Tower / castle
	tower: `<path d="M6 21V5h2v2h2V5h4v2h2V5h2v16H6zM10 11h4m-4 4h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
	castle: `<path d="M3 21h18M4 21V8l2-2 2 2 2-2 2 2 2-2 2 2 2-2 2 2v13M10 21v-4a2 2 0 0 1 4 0v4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,

	// Treasure chest
	chest: `<rect x="3" y="6" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 11h18M10 11v3h4v-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,

	// Danger / combat
	danger: `<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4m0 4h.01" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
	tactical: `<path d="M14.5 17.5L3 6V3h3l11.5 11.5M13 19l2 2M6 8l-2 2m11.5-3.5L19 3h2v2l-3.5 3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
	combat: `<path d="M14.5 17.5L3 6V3h3l11.5 11.5M13 19l2 2M6 8l-2 2m11.5-3.5L19 3h2v2l-3.5 3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,

	// Default pin
	default: `<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="10" r="3" fill="currentColor"/>`,
};

export function resolvePoiColor(
	iconKey: string,
	categoryKey?: string,
	explicitColor?: string,
): string {
	if (explicitColor && explicitColor.trim() !== "") return explicitColor.trim();
	const key = iconKey.toLowerCase().trim();
	const col = POI_DEFAULT_COLORS[key];
	if (col) return col;
	if (categoryKey) {
		const cat = categoryKey.toLowerCase().trim();
		const catCol = POI_DEFAULT_COLORS[cat];
		if (catCol) return catCol;
	}
	return POI_DEFAULT_COLORS.default ?? "#64748b";
}

export function getPoiGlyphSvg(iconKey: string): string {
	const key = iconKey.toLowerCase().trim();
	return ICONS_SVG[key] ?? ICONS_SVG.default ?? "";
}

/**
 * Render a complete standalone SVG pin suitable for a MapLibre HTML marker or image.
 */
export function createPoiMarkerElement(options: {
	icon: string;
	category?: string;
	color?: string;
	label?: string;
	badge?: string;
	onClick?: (e: MouseEvent) => void;
	onMouseEnter?: (e: MouseEvent) => void;
	onMouseLeave?: (e: MouseEvent) => void;
}): HTMLDivElement {
	const color = resolvePoiColor(options.icon, options.category, options.color);
	const glyph = getPoiGlyphSvg(options.icon);

	const container = document.createElement("div");
	container.className = "spellkave-poi-marker";
	container.style.position = "relative";
	container.style.width = "0px";
	container.style.height = "0px";
	container.style.cursor = "pointer";
	container.style.userSelect = "none";
	container.style.pointerEvents = "auto";

	// Teardrop pin / pill — tip points directly to (0, 0)
	const pin = document.createElement("div");
	pin.className = "spellkave-poi-pin";
	pin.style.position = "absolute";
	pin.style.left = "-14px";
	pin.style.top = "-34px";
	pin.style.width = "28px";
	pin.style.height = "28px";
	pin.style.borderRadius = "50% 50% 50% 0";
	pin.style.transform = "rotate(-45deg)";
	pin.style.transformOrigin = "14px 34px";
	pin.style.backgroundColor = color;
	pin.style.border = "2px solid #ffffff";
	pin.style.boxShadow = "0 2px 6px rgba(0,0,0,0.45), 0 0 0 1px rgba(0,0,0,0.15)";
	pin.style.display = "flex";
	pin.style.alignItems = "center";
	pin.style.justifyContent = "center";
	pin.style.transition = "transform 0.15s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.15s ease";

	const glyphContainer = document.createElement("div");
	glyphContainer.style.width = "16px";
	glyphContainer.style.height = "16px";
	glyphContainer.style.transform = "rotate(45deg)";
	glyphContainer.style.color = "#ffffff";
	glyphContainer.style.display = "flex";
	glyphContainer.style.alignItems = "center";
	glyphContainer.style.justifyContent = "center";
	glyphContainer.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">${glyph}</svg>`;

	pin.appendChild(glyphContainer);
	container.appendChild(pin);

	if (options.badge) {
		const badgeEl = document.createElement("span");
		badgeEl.className = "spellkave-poi-badge";
		badgeEl.textContent = options.badge;
		badgeEl.style.position = "absolute";
		badgeEl.style.top = "-40px";
		badgeEl.style.left = "4px";
		badgeEl.style.backgroundColor = "#dc2626";
		badgeEl.style.color = "#ffffff";
		badgeEl.style.fontSize = "9px";
		badgeEl.style.fontWeight = "bold";
		badgeEl.style.padding = "1px 4px";
		badgeEl.style.borderRadius = "8px";
		badgeEl.style.border = "1.5px solid #ffffff";
		badgeEl.style.boxShadow = "0 1px 3px rgba(0,0,0,0.3)";
		container.appendChild(badgeEl);
	}

	if (options.label) {
		const labelEl = document.createElement("span");
		labelEl.className = "spellkave-poi-label";
		labelEl.textContent = options.label;
		labelEl.style.position = "absolute";
		labelEl.style.top = "4px";
		labelEl.style.left = "0";
		labelEl.style.transform = "translateX(-50%)";
		labelEl.style.fontSize = "11px";
		labelEl.style.fontWeight = "600";
		labelEl.style.color = "#0f172a";
		labelEl.style.textShadow = "0 0 3px #ffffff, 0 0 3px #ffffff, 0 0 4px #ffffff, 0 0 6px #ffffff";
		labelEl.style.whiteSpace = "nowrap";
		labelEl.style.pointerEvents = "none";
		container.appendChild(labelEl);
	}

	container.addEventListener("mouseenter", (e) => {
		if (!container.classList.contains("is-selected")) {
			pin.style.transform = "rotate(-45deg) scale(1.15)";
			pin.style.boxShadow = "0 4px 10px rgba(0,0,0,0.55), 0 0 0 2px rgba(255,255,255,0.4)";
		}
		options.onMouseEnter?.(e);
	});

	container.addEventListener("mouseleave", (e) => {
		if (!container.classList.contains("is-selected")) {
			pin.style.transform = "rotate(-45deg)";
			pin.style.boxShadow = "0 2px 6px rgba(0,0,0,0.45), 0 0 0 1px rgba(0,0,0,0.15)";
		}
		options.onMouseLeave?.(e);
	});

	if (options.onClick) {
		container.addEventListener("click", options.onClick);
	}

	return container;
}

export interface MapImageRegistry {
	hasImage: (id: string) => boolean;
	addImage: (
		id: string,
		image: HTMLImageElement | ImageData | { width: number; height: number; data: Uint8Array },
		options?: { pixelRatio?: number },
	) => void;
	// biome-ignore lint/suspicious/noExplicitAny: MapLibre event handler
	on?: (event: string, listener: (...args: any[]) => void) => void;
}

export function renderPoiPinSvg(
	iconKey: string,
	options: {
		selected?: boolean;
		color?: string;
		category?: string;
	} = {},
): string {
	const color = resolvePoiColor(iconKey, options.category, options.color);
	const glyph = getPoiGlyphSvg(iconKey);
	const selected = options.selected ?? false;
	const strokeColor = selected ? "#f4a261" : "#ffffff";
	const strokeWidth = selected ? "5" : "3";
	const filterId = selected ? "shadow-sel" : "shadow";

	return `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="68" viewBox="0 0 56 68">
  <defs>
    <filter id="${filterId}" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="${selected ? "0.7" : "0.45"}" />
    </filter>
  </defs>
  <path d="M 28,64 C 25,58 8,41 8,24 A 20,20 0 1,1 48,24 C 48,41 31,58 28,64 Z"
        fill="${color}"
        stroke="${strokeColor}"
        stroke-width="${strokeWidth}"
        stroke-linejoin="round"
        filter="url(#${filterId})" />
  <g transform="translate(16, 12)" color="#ffffff">
    ${glyph}
  </g>
</svg>`;
}

export function svgToImage(svg: string, width = 56, height = 68): Promise<HTMLImageElement> {
	return new Promise((resolve) => {
		if (typeof Image === "undefined") {
			resolve({ width, height } as unknown as HTMLImageElement);
			return;
		}
		const img = new Image(width, height);
		let settled = false;
		const done = () => {
			if (!settled) {
				settled = true;
				resolve(img);
			}
		};
		img.onload = done;
		img.onerror = done;
		img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
		if (typeof img.decode === "function") {
			img.decode().then(done).catch(done);
		}
		if (typeof process !== "undefined" && process.env?.NODE_ENV === "test") {
			queueMicrotask(done);
		}
	});
}

export async function registerPoiImages(map: MapImageRegistry): Promise<void> {
	const keys = Object.keys(POI_DEFAULT_COLORS);
	await Promise.all(
		keys.flatMap((key) => {
			const normalId = `poi-${key}`;
			const selectedId = `poi-selected-${key}`;
			const tasks: Promise<void>[] = [];

			if (!map.hasImage(normalId)) {
				tasks.push(
					svgToImage(renderPoiPinSvg(key, { selected: false })).then((img) => {
						if (!map.hasImage(normalId)) {
							map.addImage(normalId, img, { pixelRatio: 2 });
						}
					}),
				);
			}
			if (!map.hasImage(selectedId)) {
				tasks.push(
					svgToImage(renderPoiPinSvg(key, { selected: true })).then((img) => {
						if (!map.hasImage(selectedId)) {
							map.addImage(selectedId, img, { pixelRatio: 2 });
						}
					}),
				);
			}
			return tasks;
		}),
	);
}

export function setupPoiMissingImageHandler(map: MapImageRegistry): void {
	if (typeof map.on !== "function") return;
	map.on("styleimagemissing", async (e: { id: string }) => {
		const id = e?.id;
		if (typeof id !== "string" || !id.startsWith("poi-")) return;
		if (map.hasImage(id)) return;

		const selected = id.startsWith("poi-selected-");
		const rawKey = selected ? id.slice("poi-selected-".length) : id.slice("poi-".length);
		const svg = renderPoiPinSvg(rawKey, { selected });
		const img = await svgToImage(svg);
		if (!map.hasImage(id)) {
			map.addImage(id, img, { pixelRatio: 2 });
		}
	});
}
