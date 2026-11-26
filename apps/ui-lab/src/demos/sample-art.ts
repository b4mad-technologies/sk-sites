/**
 * Small local sample art for the ui-lab demos. It reuses the first-party
 * PixelLab woven icons from @spellkave/ui (CC BY 4.0, see ART.md), so the
 * design system documentation needs no adventure content package.
 */
import { wovenIconUrls } from "@spellkave/ui/woven";

export interface SampleArt {
	url: string;
	name: string;
	/** Pixel edge of the square source image. */
	size: number;
	kind: string;
}

const ICON_SIZE = 64;

export const characterArt: readonly SampleArt[] = [
	{ url: wovenIconUrls.hero, name: "Hero", size: ICON_SIZE, kind: "person" },
	{ url: wovenIconUrls.observe, name: "Watcher", size: ICON_SIZE, kind: "person" },
	{ url: wovenIconUrls.invite, name: "Companion", size: ICON_SIZE, kind: "person" },
];

export const itemArt: readonly SampleArt[] = [
	{ url: wovenIconUrls.maps, name: "Map", size: ICON_SIZE, kind: "item" },
	{ url: wovenIconUrls.chronicle, name: "Chronicle", size: ICON_SIZE, kind: "item" },
	{ url: wovenIconUrls.docs, name: "Book", size: ICON_SIZE, kind: "item" },
	{ url: wovenIconUrls.search, name: "Lens", size: ICON_SIZE, kind: "item" },
	{ url: wovenIconUrls.worlds, name: "Globe", size: ICON_SIZE, kind: "item" },
];
