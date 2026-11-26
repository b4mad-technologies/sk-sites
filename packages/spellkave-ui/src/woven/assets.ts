import iconChronicleUrl from "../assets/woven-ui/icon-chronicle.webp";
import iconCloseUrl from "../assets/woven-ui/icon-close.webp";
import iconDocsUrl from "../assets/woven-ui/icon-docs.webp";
import iconEnterUrl from "../assets/woven-ui/icon-enter.webp";
import iconHeroUrl from "../assets/woven-ui/icon-hero.webp";
import iconInviteUrl from "../assets/woven-ui/icon-invite.webp";
import iconMapsUrl from "../assets/woven-ui/icon-maps.webp";
import iconObserveUrl from "../assets/woven-ui/icon-observe.webp";
import iconSearchUrl from "../assets/woven-ui/icon-search.webp";
import iconSettingsUrl from "../assets/woven-ui/icon-settings.webp";
import iconSignInUrl from "../assets/woven-ui/icon-sign-in.webp";
import iconWorldsUrl from "../assets/woven-ui/icon-worlds.webp";
import textureMidnightUrl from "../assets/woven-ui/texture-midnight.webp";
import texturePaperUrl from "../assets/woven-ui/texture-paper.webp";

/**
 * Pixel icons (PixelLab, 64px, transparent) — see ../assets/woven-ui/manifest.json.
 * Dividers and corners are SVG geometry now (WovenDivider, WovenCorner); only
 * their variant names remain here so the component props stay stable.
 */
export const wovenIconUrls = {
	enter: iconEnterUrl,
	observe: iconObserveUrl,
	worlds: iconWorldsUrl,
	maps: iconMapsUrl,
	docs: iconDocsUrl,
	"sign-in": iconSignInUrl,
	hero: iconHeroUrl,
	chronicle: iconChronicleUrl,
	invite: iconInviteUrl,
	search: iconSearchUrl,
	settings: iconSettingsUrl,
	close: iconCloseUrl,
} as const;

export const wovenDividerVariants = ["stitch", "knot"] as const;
export const wovenCornerVariants = ["branch", "stair", "ladder", "bloom"] as const;

export const wovenTextureUrls = {
	midnight: textureMidnightUrl,
	paper: texturePaperUrl,
} as const;

export type WovenIconName = keyof typeof wovenIconUrls;
export type WovenDividerVariant = (typeof wovenDividerVariants)[number];
export type WovenCornerVariant = (typeof wovenCornerVariants)[number];
export type WovenTextureVariant = keyof typeof wovenTextureUrls;
